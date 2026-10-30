import { NextResponse } from "next/server";
import { db } from "@/db";
import { breakGlassAccess, patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { eventBus } from "@/lib/events/event-bus";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await db
      .select({
        id: breakGlassAccess.id,
        userId: breakGlassAccess.userId,
        patientId: breakGlassAccess.patientId,
        reason: breakGlassAccess.reason,
        justification: breakGlassAccess.justification,
        accessDurationMinutes: breakGlassAccess.accessDurationMinutes,
        status: breakGlassAccess.status,
        approvedBy: breakGlassAccess.approvedBy,
        grantedAt: breakGlassAccess.grantedAt,
        expiresAt: breakGlassAccess.expiresAt,
        patientUhid: patients.uhid,
        patientName: patients.firstName,
      })
      .from(breakGlassAccess)
      .leftJoin(patients, eq(breakGlassAccess.patientId, patients.id))
      .orderBy(breakGlassAccess.grantedAt);

    return NextResponse.json({ records });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientUhid, reason, justification, durationMinutes = 60 } =
      await request.json();

    if (!patientUhid || !justification) {
      return NextResponse.json(
        { error: "Patient UHID and Clinical Justification are required" },
        { status: 400 }
      );
    }

    // Lookup patient
    const foundPatient = await db
      .select({ id: patients.id, uhid: patients.uhid })
      .from(patients)
      .where(eq(patients.uhid, patientUhid.trim()))
      .limit(1);

    const targetPatientId = foundPatient[0]?.id || null;

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const inserted = await db
      .insert(breakGlassAccess)
      .values({
        userId: session.id,
        patientId: targetPatientId,
        reason,
        justification,
        accessDurationMinutes: durationMinutes,
        status: "ACTIVE",
        approvedBy: "Medical Superintendent Auto-Audit Log",
        expiresAt,
      })
      .returning();

    // Log immutable audit entry
    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "BREAK_GLASS",
      module: "SECURITY",
      resource: "PatientClinicalRecord",
      resourceId: patientUhid,
      reason: `Emergency Break-Glass Access: ${reason}. Justification: ${justification}`,
    });

    // Dispatch event to EventBus
    await eventBus.emit("security.break_glass_invoked", {
      userId: session.id,
      userEmail: session.email,
      patientId: targetPatientId,
      patientUhid,
      reason,
      durationMinutes,
    });

    return NextResponse.json({
      success: true,
      record: inserted[0],
      expiresAt,
    });
  } catch (err) {
    console.error("Break glass error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


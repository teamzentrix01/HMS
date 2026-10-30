import { NextResponse } from "next/server";
import { db } from "@/db";
import { wards, beds, patients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { eventBus } from "@/lib/events/event-bus";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wardList = await db.select().from(wards).orderBy(wards.name);
    const bedList = await db
      .select({
        id: beds.id,
        wardId: beds.wardId,
        bedNumber: beds.bedNumber,
        type: beds.type,
        status: beds.status,
        dailyCharge: beds.dailyCharge,
        currentPatientId: beds.currentPatientId,
        currentEncounterId: beds.currentEncounterId,
        cleaningAssignedTo: beds.cleaningAssignedTo,
        notes: beds.notes,
        patientName: patients.firstName,
        patientUhid: patients.uhid,
      })
      .from(beds)
      .leftJoin(patients, eq(beds.currentPatientId, patients.id))
      .orderBy(beds.bedNumber);

    return NextResponse.json({
      wards: wardList,
      beds: bedList,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bedId, status, notes, cleaningAssignedTo } = await request.json();

    if (!bedId || !status) {
      return NextResponse.json({ error: "Bed ID and Status are required" }, { status: 400 });
    }

    const currentBed = await db.select().from(beds).where(eq(beds.id, bedId)).limit(1);
    if (currentBed.length === 0) {
      return NextResponse.json({ error: "Bed not found" }, { status: 404 });
    }

    const updateFields = {
      status,
      updatedAt: new Date(),
    };
    if (notes !== undefined) updateFields.notes = notes;
    if (cleaningAssignedTo !== undefined) updateFields.cleaningAssignedTo = cleaningAssignedTo;

    // If changing to CLEANING, emit bed.cleaning_requested
    if (status === "CLEANING") {
      await eventBus.emit("bed.cleaning_requested", {
        bedId,
        bedNumber: currentBed[0].bedNumber,
      });
    }

    // If bed is made AVAILABLE after cleaning, clear current patient
    if (status === "AVAILABLE") {
      updateFields.currentPatientId = null;
      updateFields.currentEncounterId = null;
      updateFields.cleaningAssignedTo = null;
    }

    await db.update(beds).set(updateFields).where(eq(beds.id, bedId));

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "UPDATE",
      module: "ADMIN",
      resource: "Bed",
      resourceId: String(bedId),
      beforeState: currentBed[0],
      afterState: { ...currentBed[0], ...updateFields },
      reason: `Updated bed ${currentBed[0].bedNumber} state to ${status}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


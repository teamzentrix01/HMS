import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  emarRecords,
  ipdAdmissions,
  patients,
  users,
  auditLogs,
} from "@/db/schema/index.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

// GET: Retrieve eMAR records for an admission
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get("admissionId");
    const patientId = searchParams.get("patientId");

    const query = db
      .select({
        id: emarRecords.id,
        admissionId: emarRecords.admissionId,
        encounterId: emarRecords.encounterId,
        patientId: emarRecords.patientId,
        prescriptionItemId: emarRecords.prescriptionItemId,
        medicationName: emarRecords.medicationName,
        dosage: emarRecords.dosage,
        route: emarRecords.route,
        scheduledTime: emarRecords.scheduledTime,
        administeredTime: emarRecords.administeredTime,
        administeredById: emarRecords.administeredById,
        nurseName: sql`concat(${users.firstName}, ' ', ${users.lastName})`,
        status: emarRecords.status,
        heldReason: emarRecords.heldReason,
        preAdministrationVitals: emarRecords.preAdministrationVitals,
        clinicalNotes: emarRecords.clinicalNotes,
        createdAt: emarRecords.createdAt,
      })
      .from(emarRecords)
      .leftJoin(users, eq(emarRecords.administeredById, users.id))
      .where(
        and(
          admissionId ? eq(emarRecords.admissionId, parseInt(admissionId)) : undefined,
          patientId ? eq(emarRecords.patientId, parseInt(patientId)) : undefined
        )
      )
      .orderBy(desc(emarRecords.scheduledTime));

    const records = await query;
    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error("Failed to fetch eMAR records:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Record Medication Administration (GIVEN / HELD / REFUSED) or Create New eMAR schedule
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      recordId, // if updating an existing scheduled dose
      action = "ADMINISTER", // ADMINISTER, CREATE_SCHEDULE
      status = "GIVEN", // GIVEN, HELD, REFUSED, MISSED
      preAdministrationVitals,
      heldReason,
      clinicalNotes,
      // if CREATE_SCHEDULE:
      admissionId,
      encounterId,
      patientId,
      medicationName,
      dosage,
      route,
      scheduledTime,
    } = body;

    // 1. UPDATE EXISTING SCHEDULED RECORD (Administration Event)
    if (recordId) {
      const [updated] = await db
        .update(emarRecords)
        .set({
          status,
          administeredTime: status === "GIVEN" ? new Date() : null,
          administeredById: session.id,
          preAdministrationVitals,
          heldReason: status === "HELD" ? heldReason : null,
          clinicalNotes,
        })
        .where(eq(emarRecords.id, recordId))
        .returning();

      // Audit Log
      await db.insert(auditLogs).values({
        userId: session.id,
        userEmail: session.email,
        userRole: session.roleSlug || "nurse",
        action: `eMAR_${status}`,
        module: "IPD",
        resource: "EmarRecord",
        resourceId: String(recordId),
        afterState: { medication: updated.medicationName, status, heldReason },
        reason: `Medication administration record signed: ${status}`,
      });

      return NextResponse.json({ success: true, record: updated });
    }

    // 2. CREATE NEW SCHEDULED eMAR DOSE
    if (admissionId && medicationName && dosage) {
      const [created] = await db
        .insert(emarRecords)
        .values({
          admissionId,
          encounterId,
          patientId,
          medicationName,
          dosage,
          route: route || "ORAL",
          scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(),
          status: "SCHEDULED",
          clinicalNotes,
        })
        .returning();

      return NextResponse.json({ success: true, record: created });
    }

    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
  } catch (error) {
    console.error("Failed to record eMAR event:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


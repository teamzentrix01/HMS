import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  ipdAdmissions,
  ipdTransfers,
  beds,
  wards,
  encounters,
  tasks,
  notifications,
  auditLogs,
  patients,
  users,
} from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      admissionId,
      transferType, // BED_TRANSFER, WARD_TRANSFER, CONSULTANT_TRANSFER
      toWardId,
      toBedId,
      toDoctorId,
      reason,
      handoverNotes,
    } = body;

    if (!admissionId || !transferType || !reason) {
      return NextResponse.json(
        { error: "admissionId, transferType, and reason are required" },
        { status: 400 }
      );
    }

    // Fetch current admission
    const [adm] = await db
      .select()
      .from(ipdAdmissions)
      .where(eq(ipdAdmissions.id, admissionId));

    if (!adm) {
      return NextResponse.json({ error: "Admission record not found" }, { status: 404 });
    }

    // 1. BED / WARD TRANSFER
    if (transferType === "BED_TRANSFER" || transferType === "WARD_TRANSFER") {
      if (!toBedId) {
        return NextResponse.json({ error: "Destination toBedId is required" }, { status: 400 });
      }

      // Check if new bed is available
      const [newBed] = await db.select().from(beds).where(eq(beds.id, toBedId));
      if (!newBed) {
        return NextResponse.json({ error: "Destination bed not found" }, { status: 404 });
      }
      if (newBed.status === "OCCUPIED" && newBed.id !== adm.bedId) {
        return NextResponse.json({ error: "Destination bed is already occupied" }, { status: 400 });
      }

      // Release old bed and set to CLEANING
      const [oldBed] = await db.select().from(beds).where(eq(beds.id, adm.bedId));
      if (oldBed) {
        await db
          .update(beds)
          .set({
            status: "CLEANING",
            currentPatientId: null,
            currentEncounterId: null,
            updatedAt: new Date(),
          })
          .where(eq(beds.id, oldBed.id));

        // Housekeeping task
        await db.insert(tasks).values({
          taskNumber: `TSK-CLEAN-${Date.now().toString().slice(-5)}`,
          title: `Terminal Sanitization: Bed ${oldBed.bedNumber}`,
          description: `Bed ${oldBed.bedNumber} vacated following patient transfer to Bed ${newBed.bedNumber}. Terminal disinfection required before next admission.`,
          taskType: "HOUSEKEEPING",
          priority: "ROUTINE",
          status: "NEW",
          departmentId: adm.departmentId,
        });
      }

      // Lock new bed to OCCUPIED
      await db
        .update(beds)
        .set({
          status: "OCCUPIED",
          currentPatientId: adm.patientId,
          currentEncounterId: adm.encounterId,
          updatedAt: new Date(),
        })
        .where(eq(beds.id, toBedId));

      // Update admission record
      await db
        .update(ipdAdmissions)
        .set({
          wardId: toWardId || newBed.wardId,
          bedId: toBedId,
        })
        .where(eq(ipdAdmissions.id, admissionId));

      // Log in ipd_transfers
      const [transfer] = await db
        .insert(ipdTransfers)
        .values({
          admissionId,
          patientId: adm.patientId,
          transferType,
          fromWardId: adm.wardId,
          fromBedId: adm.bedId,
          toWardId: toWardId || newBed.wardId,
          toBedId,
          reason,
          handoverNotes,
          transferredById: session.id,
          transferredAt: new Date(),
        })
        .returning();

      // Audit Log
      await db.insert(auditLogs).values({
        userId: session.id,
        userEmail: session.email,
        userRole: session.roleSlug || "nurse",
        action: "TRANSFER_BED",
        module: "IPD",
        resource: "IpdAdmission",
        resourceId: adm.admissionNumber,
        beforeState: { bedId: adm.bedId, wardId: adm.wardId },
        afterState: { bedId: toBedId, wardId: toWardId || newBed.wardId },
        reason,
      });

      return NextResponse.json({ success: true, transfer, newBedNumber: newBed.bedNumber });
    }

    // 2. CONSULTANT TRANSFER / ATTENDING CHANGE
    if (transferType === "CONSULTANT_TRANSFER") {
      if (!toDoctorId) {
        return NextResponse.json({ error: "Destination toDoctorId is required" }, { status: 400 });
      }

      // Update admission & encounter
      await db
        .update(ipdAdmissions)
        .set({ primaryConsultantId: toDoctorId })
        .where(eq(ipdAdmissions.id, admissionId));

      await db
        .update(encounters)
        .set({ doctorId: toDoctorId })
        .where(eq(encounters.id, adm.encounterId));

      const [transfer] = await db
        .insert(ipdTransfers)
        .values({
          admissionId,
          patientId: adm.patientId,
          transferType,
          fromDoctorId: adm.primaryConsultantId,
          toDoctorId,
          reason,
          handoverNotes,
          transferredById: session.id,
          transferredAt: new Date(),
        })
        .returning();

      // Notify new attending consultant
      const [patient] = await db.select().from(patients).where(eq(patients.id, adm.patientId));
      await db.insert(notifications).values({
        userId: toDoctorId,
        roleSlug: "doctor",
        title: `Inpatient Primary Care Handover: ${patient?.firstName} ${patient?.lastName}`,
        message: `Patient ${patient?.firstName} ${patient?.lastName} (${patient?.uhid}) has been transferred to your primary care. Handover notes: ${handoverNotes || reason}`,
        priority: "IMPORTANT",
        category: "CLINICAL",
        actionUrl: `/ipd`,
      });

      return NextResponse.json({ success: true, transfer });
    }

    return NextResponse.json({ error: "Unsupported transfer type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to execute transfer:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


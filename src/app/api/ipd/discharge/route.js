import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  dischargeSummaries,
  ipdAdmissions,
  encounters,
  beds,
  patients,
  users,
  tasks,
  auditLogs,
} from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

// GET: Fetch discharge summary for an admission
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get("admissionId");
    if (!admissionId) {
      return NextResponse.json({ error: "admissionId is required" }, { status: 400 });
    }

    const [summary] = await db
      .select()
      .from(dischargeSummaries)
      .where(eq(dischargeSummaries.admissionId, parseInt(admissionId)));

    return NextResponse.json({ success: true, summary: summary || null });
  } catch (error) {
    console.error("Failed to fetch discharge summary:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Execute Inpatient Discharge & Digitally Sign Summary
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      admissionId,
      dischargeType = "ROUTINE", // ROUTINE, LAMA, TRANSFER, DECEASED
      admissionDiagnosis,
      finalDiagnosis,
      icd10Codes,
      hospitalCourse,
      proceduresPerformed,
      conditionAtDischarge = "STABLE", // STABLE, IMPROVED, CRITICAL, EXPIRED
      dischargeMedications = [],
      dietAndLifestyleAdvice,
      followUpDate,
      emergencyWarningSigns,
    } = body;

    if (!admissionId || !finalDiagnosis || !hospitalCourse) {
      return NextResponse.json(
        { error: "admissionId, finalDiagnosis, and hospitalCourse are required" },
        { status: 400 }
      );
    }

    // 1. Fetch current admission
    const [adm] = await db
      .select()
      .from(ipdAdmissions)
      .where(eq(ipdAdmissions.id, admissionId));

    if (!adm) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    // 2. Create Discharge Summary
    const [summary] = await db
      .insert(dischargeSummaries)
      .values({
        admissionId,
        patientId: adm.patientId,
        encounterId: adm.encounterId,
        dischargedById: session.id,
        dischargeType,
        admissionDiagnosis: admissionDiagnosis || adm.provisionalDiagnosis,
        finalDiagnosis,
        icd10Codes,
        hospitalCourse,
        proceduresPerformed,
        conditionAtDischarge,
        dischargeMedications,
        dietAndLifestyleAdvice,
        followUpDate: followUpDate || null,
        emergencyWarningSigns: emergencyWarningSigns || "Report immediately to ER if severe chest pain, shortness of breath, or bleeding develops.",
        isSigned: true,
        signedAt: new Date(),
      })
      .returning();

    // 3. Update Admission Record
    await db
      .update(ipdAdmissions)
      .set({
        status: dischargeType === "LAMA" ? "LAMA" : dischargeType === "DECEASED" ? "DECEASED" : "DISCHARGED",
        dischargeDate: new Date(),
        dischargeType,
      })
      .where(eq(ipdAdmissions.id, admissionId));

    // 4. Close Inpatient Encounter
    await db
      .update(encounters)
      .set({ status: "COMPLETED" })
      .where(eq(encounters.id, adm.encounterId));

    // 5. Release Bed and assign Housekeeping cleaning task
    const [bed] = await db.select().from(beds).where(eq(beds.id, adm.bedId));
    if (bed) {
      await db
        .update(beds)
        .set({
          status: "CLEANING",
          currentPatientId: null,
          currentEncounterId: null,
          updatedAt: new Date(),
        })
        .where(eq(beds.id, bed.id));

      await db.insert(tasks).values({
        taskNumber: `TSK-TERM-${Date.now().toString().slice(-5)}`,
        title: `Terminal Sanitization: Bed ${bed.bedNumber}`,
        description: `Patient discharged from Bed ${bed.bedNumber}. Terminal deep cleaning & linen change required before admitting next inpatient.`,
        taskType: "HOUSEKEEPING",
        priority: "ROUTINE",
        status: "NEW",
        departmentId: adm.departmentId,
      });
    }

    // 6. Statutory Audit Log
    const [patient] = await db.select().from(patients).where(eq(patients.id, adm.patientId));
    await db.insert(auditLogs).values({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug || "doctor",
      action: "DISCHARGE_PATIENT",
      module: "IPD",
      resource: "IpdAdmission",
      resourceId: adm.admissionNumber,
      afterState: {
        admissionNumber: adm.admissionNumber,
        dischargeType,
        conditionAtDischarge,
        summaryId: summary.id,
      },
      reason: `Patient discharged (${dischargeType}): ${finalDiagnosis}`,
    });

    return NextResponse.json({
      success: true,
      summary,
      message: `Inpatient discharged successfully (${dischargeType}). Bed ${bed?.bedNumber} released for terminal cleaning.`,
    });
  } catch (error) {
    console.error("Failed to execute inpatient discharge:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  ipdAdmissions,
  patients,
  encounters,
  wards,
  beds,
  users,
  departments,
  tasks,
  notifications,
  auditLogs,
  numberingRules,
} from "@/db/schema/index.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

// GET: List all inpatient admissions and active bed census
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get("wardId");
    const status = searchParams.get("status") || "ADMITTED";

    const admissions = await db
      .select({
        id: ipdAdmissions.id,
        admissionNumber: ipdAdmissions.admissionNumber,
        patientId: ipdAdmissions.patientId,
        patientName: sql`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientUhid: patients.uhid,
        patientGender: patients.gender,
        patientDob: patients.dateOfBirth,
        patientPhone: patients.phone,
        bloodGroup: patients.bloodGroup,
        encounterId: ipdAdmissions.encounterId,
        admissionSource: ipdAdmissions.admissionSource,
        admittingDoctorId: ipdAdmissions.admittingDoctorId,
        admittingDoctorName: sql`concat(admit_doc.first_name, ' ', admit_doc.last_name)`,
        primaryConsultantId: ipdAdmissions.primaryConsultantId,
        primaryConsultantName: sql`concat(prim_doc.first_name, ' ', prim_doc.last_name)`,
        departmentId: ipdAdmissions.departmentId,
        departmentName: departments.name,
        wardId: ipdAdmissions.wardId,
        wardName: wards.name,
        wardCode: wards.code,
        bedId: ipdAdmissions.bedId,
        bedNumber: beds.bedNumber,
        provisionalDiagnosis: ipdAdmissions.provisionalDiagnosis,
        plannedProcedures: ipdAdmissions.plannedProcedures,
        dietType: ipdAdmissions.dietType,
        status: ipdAdmissions.status,
        admissionDate: ipdAdmissions.admissionDate,
        dischargeDate: ipdAdmissions.dischargeDate,
        dischargeType: ipdAdmissions.dischargeType,
      })
      .from(ipdAdmissions)
      .innerJoin(patients, eq(ipdAdmissions.patientId, patients.id))
      .innerJoin(wards, eq(ipdAdmissions.wardId, wards.id))
      .innerJoin(beds, eq(ipdAdmissions.bedId, beds.id))
      .innerJoin(departments, eq(ipdAdmissions.departmentId, departments.id))
      .innerJoin(users, eq(ipdAdmissions.admittingDoctorId, users.id))
      .leftJoin(sql`users AS admit_doc`, sql`admit_doc.id = ${ipdAdmissions.admittingDoctorId}`)
      .leftJoin(sql`users AS prim_doc`, sql`prim_doc.id = ${ipdAdmissions.primaryConsultantId}`)
      .where(
        and(
          status !== "ALL" ? eq(ipdAdmissions.status, status) : undefined,
          wardId ? eq(ipdAdmissions.wardId, parseInt(wardId)) : undefined
        )
      )
      .orderBy(desc(ipdAdmissions.admissionDate));

    // Calculate length of stay for each admission
    const enriched = admissions.map((adm) => {
      const now = new Date();
      const admDate = new Date(adm.admissionDate);
      const diffMs = now - admDate;
      const daysOfStay = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        ...adm,
        daysOfStay,
      };
    });

    return NextResponse.json({ success: true, admissions: enriched });
  } catch (error) {
    console.error("Failed to fetch IPD admissions:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Execute New Inpatient Admission
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      patientId,
      departmentId,
      admittingDoctorId,
      primaryConsultantId,
      wardId,
      bedId,
      admissionSource = "OPD_REFERRAL",
      provisionalDiagnosis,
      plannedProcedures,
      dietType = "NORMAL",
      chiefComplaint,
    } = body;

    if (!patientId || !departmentId || !wardId || !bedId || !provisionalDiagnosis) {
      return NextResponse.json(
        { error: "patientId, departmentId, wardId, bedId, and provisionalDiagnosis are required" },
        { status: 400 }
      );
    }

    // 1. Verify Bed is currently AVAILABLE
    const [bed] = await db.select().from(beds).where(eq(beds.id, bedId));
    if (!bed) {
      return NextResponse.json({ error: "Bed not found" }, { status: 404 });
    }
    if (bed.status === "OCCUPIED") {
      return NextResponse.json({ error: "Bed is already occupied by another patient" }, { status: 400 });
    }

    // 2. Generate Admission Number: IPD-YYYY-XXXXX
    const year = new Date().getFullYear();
    const ruleRes = await db
      .select()
      .from(numberingRules)
      .where(eq(numberingRules.entityType, "ADMISSION"));

    let seq = 101;
    if (ruleRes.length > 0) {
      seq = ruleRes[0].currentSequence + 1;
      await db
        .update(numberingRules)
        .set({ currentSequence: seq, updatedAt: new Date() })
        .where(eq(numberingRules.entityType, "ADMISSION"));
    }

    const padLen = ruleRes[0]?.padLength || 5;
    const admissionNumber = `IPD-${year}-${seq.toString().padStart(padLen, "0")}`;

    // 3. Create Inpatient Encounter
    const encYear = new Date().getFullYear();
    const encounterNumber = `ENC-IPD-${encYear}-${Date.now().toString().slice(-5)}`;

    const [encounter] = await db
      .insert(encounters)
      .values({
        encounterNumber,
        patientId,
        encounterType: "IPD",
        departmentId,
        doctorId: primaryConsultantId || admittingDoctorId || session.id,
        status: "ADMITTED",
        chiefComplaint: chiefComplaint || provisionalDiagnosis,
      })
      .returning();

    // 4. Create Inpatient Admission record
    const [admission] = await db
      .insert(ipdAdmissions)
      .values({
        admissionNumber,
        patientId,
        encounterId: encounter.id,
        admissionSource,
        admittingDoctorId: admittingDoctorId || session.id,
        primaryConsultantId: primaryConsultantId || admittingDoctorId || session.id,
        departmentId,
        wardId,
        bedId,
        provisionalDiagnosis,
        plannedProcedures,
        dietType,
        status: "ADMITTED",
        admissionDate: new Date(),
      })
      .returning();

    // 5. Lock Bed to OCCUPIED
    await db
      .update(beds)
      .set({
        status: "OCCUPIED",
        currentPatientId: patientId,
        currentEncounterId: encounter.id,
        updatedAt: new Date(),
      })
      .where(eq(beds.id, bedId));

    // 6. Create Ward Nursing Intake Task
    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
    await db.insert(tasks).values({
      taskNumber: `TSK-WARD-${Date.now().toString().slice(-5)}`,
      title: `Inpatient Nursing Admission Handover: ${patient?.firstName} ${patient?.lastName}`,
      description: `New inpatient admitted to Bed ${bed.bedNumber}. Conduct baseline admission vitals, orientation, and allergy verification.`,
      taskType: "NURSING",
      priority: "URGENT",
      status: "NEW",
      patientId,
      encounterId: encounter.id,
      departmentId,
      assignedRole: "nurse",
    });

    // 7. Audit Log
    await db.insert(auditLogs).values({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug || "doctor",
      action: "ADMIT_PATIENT",
      module: "IPD",
      resource: "IpdAdmission",
      resourceId: admissionNumber,
      afterState: { admissionNumber, patientId, bedId, wardId, encounterId: encounter.id },
      reason: `Inpatient admission to Bed ${bed.bedNumber}: ${provisionalDiagnosis}`,
    });

    return NextResponse.json({
      success: true,
      admissionNumber,
      admissionId: admission.id,
      encounterId: encounter.id,
      bedNumber: bed.bedNumber,
    });
  } catch (error) {
    console.error("Failed to execute inpatient admission:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


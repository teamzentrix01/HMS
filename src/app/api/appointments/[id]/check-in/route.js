import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  appointments,
  encounters,
  departments,
  patients,
  numberingRules,
  tasks,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { eventBus } from "@/lib/events/event-bus";

export async function POST(request, { params }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const apptId = parseInt(id, 10);

    const apptRes = await db
      .select({
        id: appointments.id,
        appointmentNumber: appointments.appointmentNumber,
        patientId: appointments.patientId,
        departmentId: appointments.departmentId,
        doctorId: appointments.doctorId,
        status: appointments.status,
        chiefComplaint: appointments.chiefComplaint,
        deptCode: departments.code,
        uhid: patients.uhid,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(appointments)
      .innerJoin(departments, eq(appointments.departmentId, departments.id))
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.id, apptId))
      .limit(1);

    if (apptRes.length === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const appt = apptRes[0];

    // Generate Token Number e.g. CARD-001
    const countTodayRes = await db
      .select({ val: sql`COUNT(*)` })
      .from(appointments)
      .where(
        sql`${appointments.departmentId} = ${appt.departmentId} AND ${appointments.checkedInAt}::date = CURRENT_DATE`
      );
    const todayTokenSeq = parseInt(countTodayRes[0]?.val || 0, 10) + 1;
    const tokenNumber = `${appt.deptCode.slice(0, 4)}-${String(todayTokenSeq).padStart(3, "0")}`;

    // Generate Encounter Number ENC-YYYY-XXXXX
    const encNum = `ENC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    // Create Encounter record
    const encRes = await db
      .insert(encounters)
      .values({
        encounterNumber: encNum,
        patientId: appt.patientId,
        encounterType: "OPD",
        departmentId: appt.departmentId,
        doctorId: appt.doctorId,
        status: "WAITING",
        triageLevel: "GREEN",
        chiefComplaint: appt.chiefComplaint || "OPD Consultation",
        arrivalTime: new Date(),
      })
      .returning();

    const encounter = encRes[0];

    // Update Appointment
    await db
      .update(appointments)
      .set({
        status: "WAITING",
        tokenNumber,
        checkedInAt: new Date(),
        encounterId: encounter.id,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, apptId));

    // Create Nursing Task for Vitals Recording
    await db.insert(tasks).values({
      taskNumber: `TSK-VIT-${Date.now().toString().slice(-6)}`,
      title: `Record Vitals: ${appt.firstName} ${appt.lastName} (${tokenNumber})`,
      description: `Patient checked in for OPD consultation with Dr. ${appt.deptCode}. Vitals measurement required before doctor consult.`,
      taskType: "VITALS_CHECK",
      priority: "MEDIUM",
      status: "NEW",
      assignedDepartmentId: appt.departmentId,
      patientId: appt.patientId,
      encounterId: encounter.id,
      relatedEntityType: "ENCOUNTER",
      relatedEntityId: encounter.id,
    });

    // Log Audit
    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "CHECKIN",
      module: "OPD",
      resource: "AppointmentQueue",
      resourceId: tokenNumber,
      afterState: { tokenNumber, encounterId: encounter.id, status: "WAITING" },
      reason: `Patient ${appt.firstName} ${appt.lastName} checked in. Issued Token ${tokenNumber}`,
    });

    // Emit Event
    await eventBus.emit("patient.checked_in", {
      appointmentId: appt.id,
      tokenNumber,
      encounterId: encounter.id,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
    });

    return NextResponse.json({
      success: true,
      tokenNumber,
      encounterId: encounter.id,
      status: "WAITING",
    });
  } catch (err) {
    console.error("Check-in error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


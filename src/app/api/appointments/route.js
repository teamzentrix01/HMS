import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  appointments,
  patients,
  departments,
  users,
  numberingRules,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { eventBus } from "@/lib/events/event-bus";

export async function GET(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // e.g. YYYY-MM-DD
    const doctorParam = searchParams.get("doctorId");
    const deptParam = searchParams.get("departmentId");
    const statusParam = searchParams.get("status");

    let query = db
      .select({
        id: appointments.id,
        appointmentNumber: appointments.appointmentNumber,
        patientId: appointments.patientId,
        departmentId: appointments.departmentId,
        doctorId: appointments.doctorId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        visitType: appointments.visitType,
        status: appointments.status,
        tokenNumber: appointments.tokenNumber,
        chiefComplaint: appointments.chiefComplaint,
        notes: appointments.notes,
        checkedInAt: appointments.checkedInAt,
        encounterId: appointments.encounterId,
        patientName: sql`${patients.firstName} || ' ' || ${patients.lastName}`,
        patientUhid: patients.uhid,
        patientPhone: patients.phone,
        patientGender: patients.gender,
        patientDob: patients.dateOfBirth,
        doctorName: sql`${users.firstName} || ' ' || ${users.lastName}`,
        departmentName: departments.name,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(departments, eq(appointments.departmentId, departments.id))
      .innerJoin(users, eq(appointments.doctorId, users.id))
      .orderBy(appointments.appointmentTime);

    const list = await query;

    let filtered = list;
    if (dateParam) {
      filtered = filtered.filter((a) => a.appointmentDate === dateParam);
    }
    if (doctorParam) {
      filtered = filtered.filter((a) => a.doctorId === parseInt(doctorParam, 10));
    }
    if (deptParam) {
      filtered = filtered.filter((a) => a.departmentId === parseInt(deptParam, 10));
    }
    if (statusParam && statusParam !== "ALL") {
      filtered = filtered.filter((a) => a.status === statusParam);
    }

    return NextResponse.json({ appointments: filtered });
  } catch (err) {
    console.error("GET appointments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      patientId,
      departmentId,
      doctorId,
      appointmentDate,
      appointmentTime,
      visitType = "NEW",
      chiefComplaint,
      notes,
    } = body;

    if (!patientId || !departmentId || !doctorId || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: "Patient, Department, Doctor, Date, and Time slot are mandatory." },
        { status: 400 }
      );
    }

    // Check slot collision on doctor
    const existingSlot = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, parseInt(doctorId, 10)),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.appointmentTime, appointmentTime),
          sql`${appointments.status} NOT IN ('CANCELLED', 'NO_SHOW')`
        )
      )
      .limit(1);

    if (existingSlot.length > 0) {
      return NextResponse.json(
        {
          error: `Doctor is already scheduled for slot ${appointmentTime} on ${appointmentDate}. Choose another time slot.`,
        },
        { status: 409 }
      );
    }

    // Generate appointment number
    const apptNum = `APT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const inserted = await db
      .insert(appointments)
      .values({
        appointmentNumber: apptNum,
        patientId: parseInt(patientId, 10),
        departmentId: parseInt(departmentId, 10),
        doctorId: parseInt(doctorId, 10),
        appointmentDate,
        appointmentTime,
        visitType,
        status: "SCHEDULED",
        chiefComplaint: chiefComplaint || null,
        notes: notes || null,
      })
      .returning();

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "CREATE",
      module: "OPD",
      resource: "Appointment",
      resourceId: apptNum,
      afterState: inserted[0],
      reason: `Booked ${visitType} appointment for Patient ID ${patientId} on ${appointmentDate} ${appointmentTime}`,
    });

    await eventBus.emit("appointment.booked", {
      appointmentId: inserted[0].id,
      appointmentNumber: apptNum,
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
    });

    return NextResponse.json({ success: true, appointment: inserted[0] });
  } catch (err) {
    console.error("POST appointment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


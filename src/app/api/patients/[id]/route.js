import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  patients,
  patientAllergies,
  patientConditions,
  encounters,
  vitals,
  consultationNotes,
  prescriptions,
  prescriptionItems,
  orders,
  orderItems,
  departments,
  users,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(request, { params }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const patientId = parseInt(id, 10);

    const patientRes = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (patientRes.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patient = patientRes[0];

    // Fetch related clinical details
    const allergies = await db
      .select()
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, patientId));

    const conditions = await db
      .select()
      .from(patientConditions)
      .where(eq(patientConditions.patientId, patientId));

    const pastEncounters = await db
      .select({
        id: encounters.id,
        encounterNumber: encounters.encounterNumber,
        encounterType: encounters.encounterType,
        status: encounters.status,
        chiefComplaint: encounters.chiefComplaint,
        arrivalTime: encounters.arrivalTime,
        dischargeTime: encounters.dischargeTime,
        departmentName: departments.name,
        doctorName: users.firstName,
      })
      .from(encounters)
      .leftJoin(departments, eq(encounters.departmentId, departments.id))
      .leftJoin(users, eq(encounters.doctorId, users.id))
      .where(eq(encounters.patientId, patientId))
      .orderBy(desc(encounters.arrivalTime));

    const pastVitals = await db
      .select()
      .from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.recordedAt))
      .limit(10);

    const pastNotes = await db
      .select({
        id: consultationNotes.id,
        encounterId: consultationNotes.encounterId,
        subjective: consultationNotes.subjective,
        objective: consultationNotes.objective,
        assessment: consultationNotes.assessment,
        plan: consultationNotes.plan,
        primaryDiagnosis: consultationNotes.primaryDiagnosis,
        secondaryDiagnosis: consultationNotes.secondaryDiagnosis,
        isSigned: consultationNotes.isSigned,
        signedAt: consultationNotes.signedAt,
        doctorName: users.firstName,
        createdAt: consultationNotes.createdAt,
      })
      .from(consultationNotes)
      .leftJoin(users, eq(consultationNotes.doctorId, users.id))
      .where(eq(consultationNotes.patientId, patientId))
      .orderBy(desc(consultationNotes.createdAt));

    const pastOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.patientId, patientId))
      .orderBy(desc(orders.createdAt));

    const pastPrescriptions = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));

    return NextResponse.json({
      patient,
      allergies,
      conditions,
      encounters: pastEncounters,
      vitals: pastVitals,
      notes: pastNotes,
      orders: pastOrders,
      prescriptions: pastPrescriptions,
    });
  } catch (err) {
    console.error("GET patient by ID error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


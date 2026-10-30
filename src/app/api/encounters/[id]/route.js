import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  encounters,
  patients,
  patientAllergies,
  patientConditions,
  vitals,
  consultationNotes,
  orders,
  orderItems,
  prescriptions,
  prescriptionItems,
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
    const encounterId = parseInt(id, 10);

    const encRes = await db
      .select({
        id: encounters.id,
        encounterNumber: encounters.encounterNumber,
        encounterType: encounters.encounterType,
        departmentId: encounters.departmentId,
        doctorId: encounters.doctorId,
        status: encounters.status,
        triageLevel: encounters.triageLevel,
        chiefComplaint: encounters.chiefComplaint,
        arrivalTime: encounters.arrivalTime,
        patientId: encounters.patientId,
        departmentName: departments.name,
        doctorName: users.firstName,
      })
      .from(encounters)
      .leftJoin(departments, eq(encounters.departmentId, departments.id))
      .leftJoin(users, eq(encounters.doctorId, users.id))
      .where(eq(encounters.id, encounterId))
      .limit(1);

    if (encRes.length === 0) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const encounter = encRes[0];

    // Patient
    const pRes = await db
      .select()
      .from(patients)
      .where(eq(patients.id, encounter.patientId))
      .limit(1);

    const patient = pRes[0];

    // Allergies & Conditions
    const allergies = await db
      .select()
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, patient.id));

    const conditions = await db
      .select()
      .from(patientConditions)
      .where(eq(patientConditions.patientId, patient.id));

    // Vitals for this encounter
    const encounterVitals = await db
      .select()
      .from(vitals)
      .where(eq(vitals.encounterId, encounterId))
      .orderBy(desc(vitals.recordedAt));

    // Consultation Note
    const notesRes = await db
      .select()
      .from(consultationNotes)
      .where(eq(consultationNotes.encounterId, encounterId))
      .orderBy(desc(consultationNotes.createdAt));

    // Orders
    const ordersList = await db
      .select()
      .from(orders)
      .where(eq(orders.encounterId, encounterId))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = await Promise.all(
      ordersList.map(async (ord) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, ord.id));
        return { ...ord, items };
      })
    );

    // Prescriptions
    const rxList = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.encounterId, encounterId))
      .orderBy(desc(prescriptions.createdAt));

    const rxWithItems = await Promise.all(
      rxList.map(async (rx) => {
        const items = await db
          .select()
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, rx.id));
        return { ...rx, items };
      })
    );

    return NextResponse.json({
      encounter,
      patient,
      allergies,
      conditions,
      vitals: encounterVitals,
      note: notesRes[0] || null,
      noteHistory: notesRes,
      orders: ordersWithItems,
      prescriptions: rxWithItems,
    });
  } catch (err) {
    console.error("GET encounter details error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


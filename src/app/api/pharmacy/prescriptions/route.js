import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  prescriptions,
  prescriptionItems,
  encounters,
  patients,
  patientAllergies,
  users,
  inventoryItems,
  inventoryBatches,
} from "@/db/schema/index.js";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // SIGNED, DISPENSED, PARTIAL

    // Fetch prescriptions
    const rxList = await db
      .select({
        id: prescriptions.id,
        prescriptionNumber: prescriptions.prescriptionNumber,
        encounterId: prescriptions.encounterId,
        patientId: prescriptions.patientId,
        patientName: sql`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientUhid: patients.uhid,
        patientGender: patients.gender,
        patientDob: patients.dateOfBirth,
        patientPhone: patients.phone,
        doctorId: prescriptions.doctorId,
        doctorName: sql`concat(${users.firstName}, ' ', ${users.lastName})`,
        status: prescriptions.status,
        instructions: prescriptions.instructions,
        signedAt: prescriptions.signedAt,
        createdAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(prescriptions.patientId, patients.id))
      .innerJoin(users, eq(prescriptions.doctorId, users.id))
      .where(status ? eq(prescriptions.status, status) : undefined)
      .orderBy(desc(prescriptions.createdAt));

    const rxIds = rxList.map((r) => r.id);
    const patientIds = [...new Set(rxList.map((r) => r.patientId))];

    let items = [];
    let allergies = [];

    if (rxIds.length > 0) {
      items = await db
        .select()
        .from(prescriptionItems)
        .where(inArray(prescriptionItems.prescriptionId, rxIds));
    }

    if (patientIds.length > 0) {
      allergies = await db
        .select()
        .from(patientAllergies)
        .where(inArray(patientAllergies.patientId, patientIds));
    }

    // Attach items, allergies, and current batch availability
    const enriched = rxList.map((rx) => ({
      ...rx,
      items: items.filter((i) => i.prescriptionId === rx.id),
      allergies: allergies.filter((a) => a.patientId === rx.patientId),
    }));

    return NextResponse.json({ success: true, prescriptions: enriched });
  } catch (error) {
    console.error("Failed to fetch prescriptions:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


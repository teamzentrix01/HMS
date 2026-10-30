import { NextResponse } from "next/server";
import { db } from "@/db";
import { prescriptions, prescriptionItems, patients, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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
    const encounterId = searchParams.get("encounterId");
    const patientId = searchParams.get("patientId");

    let rxList = [];
    if (encounterId) {
      rxList = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.encounterId, parseInt(encounterId, 10)))
        .orderBy(desc(prescriptions.createdAt));
    } else if (patientId) {
      rxList = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.patientId, parseInt(patientId, 10)))
        .orderBy(desc(prescriptions.createdAt));
    }

    const listWithItems = await Promise.all(
      rxList.map(async (rx) => {
        const items = await db
          .select()
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, rx.id));
        return { ...rx, items };
      })
    );

    return NextResponse.json({ prescriptions: listWithItems });
  } catch (err) {
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
    const { encounterId, patientId, instructions, items = [] } = body;

    if (!encounterId || !patientId || items.length === 0) {
      return NextResponse.json(
        { error: "Encounter ID, Patient ID, and at least one medication are required." },
        { status: 400 }
      );
    }

    const prescriptionNumber = `RX-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const rxRes = await db
      .insert(prescriptions)
      .values({
        prescriptionNumber,
        encounterId: parseInt(encounterId, 10),
        patientId: parseInt(patientId, 10),
        doctorId: session.id,
        status: "SIGNED",
        instructions,
        signedAt: new Date(),
      })
      .returning();

    const newRx = rxRes[0];

    for (const item of items) {
      await db.insert(prescriptionItems).values({
        prescriptionId: newRx.id,
        medicationName: item.medicationName,
        genericName: item.genericName || null,
        dosage: item.dosage,
        route: item.route || "ORAL",
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions || null,
        dispenseStatus: "PENDING",
      });
    }

    // Lookup patient
    const pRes = await db
      .select({ uhid: patients.uhid })
      .from(patients)
      .where(eq(patients.id, parseInt(patientId, 10)))
      .limit(1);

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "PRESCRIPTION",
      module: "CLINICAL",
      resource: "Prescription",
      resourceId: prescriptionNumber,
      afterState: { ...newRx, itemsCount: items.length },
      reason: `Issued clinical prescription with ${items.length} medications for Patient ${pRes[0]?.uhid || ""}`,
    });

    await eventBus.emit("medication.prescribed", {
      prescriptionId: newRx.id,
      prescriptionNumber,
      encounterId: parseInt(encounterId, 10),
      patientId: parseInt(patientId, 10),
      doctorId: session.id,
      itemsCount: items.length,
    });

    return NextResponse.json({ success: true, prescription: newRx });
  } catch (err) {
    console.error("POST prescription error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


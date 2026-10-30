import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  nursingCareNotes,
  patients,
  users,
  auditLogs,
} from "@/db/schema/index.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get("admissionId");
    const patientId = searchParams.get("patientId");

    const notes = await db
      .select({
        id: nursingCareNotes.id,
        admissionId: nursingCareNotes.admissionId,
        encounterId: nursingCareNotes.encounterId,
        patientId: nursingCareNotes.patientId,
        recordedById: nursingCareNotes.recordedById,
        nurseName: sql`concat(${users.firstName}, ' ', ${users.lastName})`,
        shift: nursingCareNotes.shift,
        intakeOralMl: nursingCareNotes.intakeOralMl,
        intakeIvMl: nursingCareNotes.intakeIvMl,
        outputUrineMl: nursingCareNotes.outputUrineMl,
        outputDrainMl: nursingCareNotes.outputDrainMl,
        fluidBalanceMl: nursingCareNotes.fluidBalanceMl,
        fallRiskScore: nursingCareNotes.fallRiskScore,
        painScore: nursingCareNotes.painScore,
        cannulaSite: nursingCareNotes.cannulaSite,
        sbarHandover: nursingCareNotes.sbarHandover,
        nursingSummary: nursingCareNotes.nursingSummary,
        createdAt: nursingCareNotes.createdAt,
      })
      .from(nursingCareNotes)
      .innerJoin(users, eq(nursingCareNotes.recordedById, users.id))
      .where(
        and(
          admissionId ? eq(nursingCareNotes.admissionId, parseInt(admissionId)) : undefined,
          patientId ? eq(nursingCareNotes.patientId, parseInt(patientId)) : undefined
        )
      )
      .orderBy(desc(nursingCareNotes.createdAt));

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error("Failed to fetch nursing care notes:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      admissionId,
      encounterId,
      patientId,
      shift = "MORNING",
      intakeOralMl = 0,
      intakeIvMl = 0,
      outputUrineMl = 0,
      outputDrainMl = 0,
      fallRiskScore = 0,
      painScore = 0,
      cannulaSite = "Left Forearm (Healthy)",
      sbarHandover,
      nursingSummary,
    } = body;

    if (!admissionId || !encounterId || !patientId || !nursingSummary) {
      return NextResponse.json(
        { error: "admissionId, encounterId, patientId, and nursingSummary are required" },
        { status: 400 }
      );
    }

    // Compute fluid balance: (Oral + IV) - (Urine + Drain)
    const totalIntake = (parseInt(intakeOralMl) || 0) + (parseInt(intakeIvMl) || 0);
    const totalOutput = (parseInt(outputUrineMl) || 0) + (parseInt(outputDrainMl) || 0);
    const fluidBalanceMl = totalIntake - totalOutput;

    const [note] = await db
      .insert(nursingCareNotes)
      .values({
        admissionId,
        encounterId,
        patientId,
        recordedById: session.id,
        shift,
        intakeOralMl: parseInt(intakeOralMl) || 0,
        intakeIvMl: parseInt(intakeIvMl) || 0,
        outputUrineMl: parseInt(outputUrineMl) || 0,
        outputDrainMl: parseInt(outputDrainMl) || 0,
        fluidBalanceMl,
        fallRiskScore: parseInt(fallRiskScore) || 0,
        painScore: parseInt(painScore) || 0,
        cannulaSite,
        sbarHandover,
        nursingSummary,
      })
      .returning();

    return NextResponse.json({ success: true, note, fluidBalanceMl });
  } catch (error) {
    console.error("Failed to save nursing care note:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


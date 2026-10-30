import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultationNotes, encounters, patients, appointments } from "@/db/schema";
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

    if (!encounterId) {
      return NextResponse.json({ error: "encounterId is required" }, { status: 400 });
    }

    const notes = await db
      .select()
      .from(consultationNotes)
      .where(eq(consultationNotes.encounterId, parseInt(encounterId, 10)))
      .orderBy(desc(consultationNotes.createdAt));

    return NextResponse.json({
      note: notes[0] || null,
      history: notes,
    });
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
    const {
      encounterId,
      patientId,
      subjective,
      objective,
      assessment,
      plan,
      primaryDiagnosis,
      secondaryDiagnosis,
      followUpDate,
      followUpInstructions,
      admissionRequested = false,
      admissionWardType,
      referralDepartmentId,
    } = body;

    if (!encounterId || !patientId) {
      return NextResponse.json(
        { error: "encounterId and patientId are required" },
        { status: 400 }
      );
    }

    // Check existing note for encounter
    const existing = await db
      .select()
      .from(consultationNotes)
      .where(eq(consultationNotes.encounterId, parseInt(encounterId, 10)))
      .limit(1);

    let savedNote;

    if (existing.length > 0) {
      if (existing[0].isSigned) {
        return NextResponse.json(
          {
            error:
              "This consultation note is already digitally signed and cannot be silently overwritten. Use the Amendment protocol.",
          },
          { status: 403 }
        );
      }

      // Update draft note
      const updated = await db
        .update(consultationNotes)
        .set({
          subjective,
          objective,
          assessment,
          plan,
          primaryDiagnosis,
          secondaryDiagnosis,
          followUpDate: followUpDate || null,
          followUpInstructions,
          admissionRequested,
          admissionWardType: admissionRequested ? admissionWardType : null,
          referralDepartmentId: referralDepartmentId ? parseInt(referralDepartmentId, 10) : null,
          updatedAt: new Date(),
        })
        .where(eq(consultationNotes.id, existing[0].id))
        .returning();

      savedNote = updated[0];
    } else {
      // Insert new draft note
      const inserted = await db
        .insert(consultationNotes)
        .values({
          encounterId: parseInt(encounterId, 10),
          patientId: parseInt(patientId, 10),
          doctorId: session.id,
          subjective,
          objective,
          assessment,
          plan,
          primaryDiagnosis,
          secondaryDiagnosis,
          followUpDate: followUpDate || null,
          followUpInstructions,
          admissionRequested,
          admissionWardType: admissionRequested ? admissionWardType : null,
          referralDepartmentId: referralDepartmentId ? parseInt(referralDepartmentId, 10) : null,
          isSigned: false,
        })
        .returning();

      savedNote = inserted[0];
    }

    // Also update encounter status to IN_CONSULTATION if not already
    await db
      .update(encounters)
      .set({ status: "IN_CONSULTATION", updatedAt: new Date() })
      .where(eq(encounters.id, parseInt(encounterId, 10)));

    return NextResponse.json({ success: true, note: savedNote });
  } catch (err) {
    console.error("POST consultation note error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      noteId,
      encounterId,
      patientId,
      subjective,
      objective,
      assessment,
      plan,
      primaryDiagnosis,
      secondaryDiagnosis,
      followUpDate,
      followUpInstructions,
      admissionRequested = false,
      admissionWardType,
      isAmendment = false,
      amendmentReason = null,
    } = body;

    let targetNote;

    if (isAmendment) {
      if (!amendmentReason || amendmentReason.length < 10) {
        return NextResponse.json(
          { error: "A valid clinical amendment reason is mandatory (min 10 characters)." },
          { status: 400 }
        );
      }

      // Create linked amendment record preserving the signed original
      const amendedRes = await db
        .insert(consultationNotes)
        .values({
          encounterId: parseInt(encounterId, 10),
          patientId: parseInt(patientId, 10),
          doctorId: session.id,
          subjective,
          objective,
          assessment,
          plan,
          primaryDiagnosis,
          secondaryDiagnosis,
          followUpDate: followUpDate || null,
          followUpInstructions,
          admissionRequested,
          admissionWardType: admissionRequested ? admissionWardType : null,
          isSigned: true,
          signedAt: new Date(),
          isAmendment: true,
          amendedFromId: parseInt(noteId, 10),
          amendmentReason,
        })
        .returning();

      targetNote = amendedRes[0];
    } else {
      // Standard initial digital signature
      const signedRes = await db
        .update(consultationNotes)
        .set({
          subjective,
          objective,
          assessment,
          plan,
          primaryDiagnosis,
          secondaryDiagnosis,
          followUpDate: followUpDate || null,
          followUpInstructions,
          admissionRequested,
          admissionWardType: admissionRequested ? admissionWardType : null,
          isSigned: true,
          signedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(consultationNotes.id, parseInt(noteId, 10)))
        .returning();

      targetNote = signedRes[0];
    }

    // Update encounter and appointment status
    const finalEncounterStatus = admissionRequested ? "ADMITTED" : "COMPLETED";
    await db
      .update(encounters)
      .set({
        status: finalEncounterStatus,
        dischargeTime: admissionRequested ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(encounters.id, parseInt(encounterId, 10)));

    await db
      .update(appointments)
      .set({
        status: "COMPLETED",
        consultationEndedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(appointments.encounterId, parseInt(encounterId, 10)));

    // Immutable Audit Log
    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: isAmendment ? "AMEND_SIGN" : "SIGN",
      module: "CLINICAL",
      resource: "ConsultationNote",
      resourceId: String(targetNote.id),
      afterState: targetNote,
      reason: isAmendment
        ? `Clinical note amendment signed: ${amendmentReason}`
        : "Digitally signed OPD clinical consultation note",
    });

    // Emit Event
    await eventBus.emit("consultation.signed", {
      noteId: targetNote.id,
      encounterId: parseInt(encounterId, 10),
      patientId: parseInt(patientId, 10),
      doctorId: session.id,
      primaryDiagnosis,
      admissionRequested,
    });

    return NextResponse.json({ success: true, note: targetNote });
  } catch (err) {
    console.error("PUT sign consultation note error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


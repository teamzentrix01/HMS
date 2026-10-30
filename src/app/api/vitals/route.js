import { NextResponse } from "next/server";
import { db } from "@/db";
import { vitals, encounters, patients, notifications } from "@/db/schema";
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

    let list = [];
    if (encounterId) {
      list = await db
        .select()
        .from(vitals)
        .where(eq(vitals.encounterId, parseInt(encounterId, 10)))
        .orderBy(desc(vitals.recordedAt));
    } else if (patientId) {
      list = await db
        .select()
        .from(vitals)
        .where(eq(vitals.patientId, parseInt(patientId, 10)))
        .orderBy(desc(vitals.recordedAt))
        .limit(10);
    }

    return NextResponse.json({ vitals: list });
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
      systolicBp,
      diastolicBp,
      heartRate,
      respiratoryRate,
      temperatureCelsius,
      spo2Percent,
      painScore = 0,
      weightKg,
      heightCm,
    } = body;

    if (!encounterId || !patientId) {
      return NextResponse.json(
        { error: "Encounter ID and Patient ID are required" },
        { status: 400 }
      );
    }

    // Auto-calculate BMI if weight and height exist
    let bmi = null;
    if (weightKg && heightCm && heightCm > 0) {
      const heightInMeters = heightCm / 100;
      bmi = (weightKg / (heightInMeters * heightInMeters)).toFixed(1);
    }

    const inserted = await db
      .insert(vitals)
      .values({
        encounterId: parseInt(encounterId, 10),
        patientId: parseInt(patientId, 10),
        recordedBy: session.id,
        systolicBp: systolicBp ? parseInt(systolicBp, 10) : null,
        diastolicBp: diastolicBp ? parseInt(diastolicBp, 10) : null,
        heartRate: heartRate ? parseInt(heartRate, 10) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : null,
        temperatureCelsius: temperatureCelsius ? String(temperatureCelsius) : null,
        spo2Percent: spo2Percent ? parseInt(spo2Percent, 10) : null,
        painScore: painScore ? parseInt(painScore, 10) : 0,
        weightKg: weightKg ? String(weightKg) : null,
        heightCm: heightCm ? String(heightCm) : null,
        bmi: bmi ? String(bmi) : null,
      })
      .returning();

    const record = inserted[0];

    // Check for Critical Alerts
    const criticalFlags = [];
    if (spo2Percent && spo2Percent < 92) {
      criticalFlags.push(`Critical Hypoxemia (SpO2 ${spo2Percent}%)`);
    }
    if (systolicBp && systolicBp >= 180) {
      criticalFlags.push(`Hypertensive Urgency (BP ${systolicBp}/${diastolicBp || "-"} mmHg)`);
    } else if (systolicBp && systolicBp <= 85) {
      criticalFlags.push(`Hypotensive Shock Warning (BP ${systolicBp}/${diastolicBp || "-"} mmHg)`);
    }
    if (heartRate && heartRate >= 130) {
      criticalFlags.push(`Severe Tachycardia (HR ${heartRate} bpm)`);
    }

    if (criticalFlags.length > 0) {
      const pRes = await db
        .select({ uhid: patients.uhid, name: patients.firstName })
        .from(patients)
        .where(eq(patients.id, parseInt(patientId, 10)))
        .limit(1);

      const patientUhid = pRes[0]?.uhid || "Unknown";

      // Dispatch urgent notification to Doctor
      await db.insert(notifications).values({
        roleSlug: "doctor",
        title: "CRITICAL VITAL SIGN ALERT",
        message: `Patient ${pRes[0]?.name} (${patientUhid}): ${criticalFlags.join("; ")}. Immediate clinician attention required.`,
        priority: "CRITICAL",
        category: "CLINICAL",
        actionUrl: `/opd/${encounterId}`,
      });
    }

    // Log Audit
    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "CREATE",
      module: "CLINICAL",
      resource: "Vitals",
      resourceId: String(record.id),
      afterState: record,
      reason: `Recorded vital signs for Encounter #${encounterId}`,
    });

    return NextResponse.json({ success: true, vitals: record, criticalFlags });
  } catch (err) {
    console.error("POST vitals error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


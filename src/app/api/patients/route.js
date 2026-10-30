import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  patients,
  patientAllergies,
  patientConditions,
  numberingRules,
} from "@/db/schema";
import { ilike, or, eq, sql } from "drizzle-orm";
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
    const query = searchParams.get("q") || "";

    let patientList;
    if (query.trim()) {
      const pattern = `%${query.trim()}%`;
      patientList = await db
        .select()
        .from(patients)
        .where(
          or(
            ilike(patients.uhid, pattern),
            ilike(patients.firstName, pattern),
            ilike(patients.lastName, pattern),
            ilike(patients.phone, pattern),
            ilike(patients.nationalIdNumber, pattern)
          )
        )
        .orderBy(patients.firstName)
        .limit(20);
    } else {
      patientList = await db
        .select()
        .from(patients)
        .orderBy(sql`${patients.createdAt} DESC`)
        .limit(50);
    }

    return NextResponse.json({ patients: patientList });
  } catch (err) {
    console.error("GET patients error:", err);
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
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      city = "Noida",
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      nationalIdNumber,
      allergies = [],
      conditions = [],
      checkDuplicatesOnly = false,
    } = body;

    if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
      return NextResponse.json(
        { error: "First Name, Last Name, Date of Birth, Gender, and Phone are mandatory." },
        { status: 400 }
      );
    }

    // 1. Duplicate Detection Check (Rule: Never create duplicate patient identities silently)
    const existingDuplicates = await db
      .select({
        id: patients.id,
        uhid: patients.uhid,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        dateOfBirth: patients.dateOfBirth,
        nationalIdNumber: patients.nationalIdNumber,
      })
      .from(patients)
      .where(
        or(
          eq(patients.phone, phone.trim()),
          nationalIdNumber ? eq(patients.nationalIdNumber, nationalIdNumber.trim()) : sql`FALSE`,
          sql`LOWER(${patients.firstName}) = LOWER(${firstName.trim()}) AND LOWER(${patients.lastName}) = LOWER(${lastName.trim()}) AND ${patients.dateOfBirth} = ${dateOfBirth}`
        )
      );

    if (checkDuplicatesOnly) {
      return NextResponse.json({ duplicates: existingDuplicates });
    }

    if (existingDuplicates.length > 0 && !body.forceCreate) {
      return NextResponse.json(
        {
          duplicateWarning: true,
          message:
            "Potential duplicate patient identity detected! Review existing records to prevent fractured medical history.",
          duplicates: existingDuplicates,
        },
        { status: 409 }
      );
    }

    // 2. Generate Next UHID Atomically
    const ruleRes = await db
      .select()
      .from(numberingRules)
      .where(eq(numberingRules.entityType, "UHID"))
      .limit(1);

    let nextSequence = 1005;
    let formatTemplate = "JGY-{YYYY}-{SEQ}";
    let padLength = 5;

    if (ruleRes.length > 0) {
      nextSequence = ruleRes[0].currentSequence + 1;
      formatTemplate = ruleRes[0].formatTemplate;
      padLength = ruleRes[0].padLength;

      await db
        .update(numberingRules)
        .set({ currentSequence: nextSequence, updatedAt: new Date() })
        .where(eq(numberingRules.entityType, "UHID"));
    }

    const year = new Date().getFullYear();
    const seqStr = String(nextSequence).padStart(padLength, "0");
    const uhid = formatTemplate.replace("{YYYY}", year).replace("{SEQ}", seqStr);

    // 3. Insert Patient
    const insertedPatient = await db
      .insert(patients)
      .values({
        uhid,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        gender,
        bloodGroup: bloodGroup || null,
        phone: phone.trim(),
        email: email ? email.trim() : null,
        address: address || null,
        city,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: emergencyContactRelation || null,
        nationalIdNumber: nationalIdNumber ? nationalIdNumber.trim() : null,
        status: "ACTIVE",
      })
      .returning();

    const newPatient = insertedPatient[0];

    // 4. Insert Initial Allergies if provided
    if (allergies.length > 0) {
      for (const al of allergies) {
        if (al.allergen) {
          await db.insert(patientAllergies).values({
            patientId: newPatient.id,
            allergen: al.allergen,
            severity: al.severity || "MODERATE",
            reaction: al.reaction || null,
          });
        }
      }
    }

    // 5. Insert Initial Chronic Conditions if provided
    if (conditions.length > 0) {
      for (const cond of conditions) {
        if (cond.name) {
          await db.insert(patientConditions).values({
            patientId: newPatient.id,
            conditionName: cond.name,
            icdCode: cond.icdCode || null,
            status: "ACTIVE",
          });
        }
      }
    }

    // 6. Audit Logging
    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "CREATE",
      module: "PATIENT",
      resource: "PatientMaster",
      resourceId: uhid,
      afterState: newPatient,
      reason: `Registered new hospital patient ${firstName} ${lastName} with UHID ${uhid}`,
    });

    // 7. Event Dispatching
    await eventBus.emit("patient.registered", {
      patientId: newPatient.id,
      uhid: newPatient.uhid,
      name: `${firstName} ${lastName}`,
      phone: newPatient.phone,
    });

    return NextResponse.json({
      success: true,
      patient: newPatient,
    });
  } catch (err) {
    console.error("POST patient error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  labResults,
  labSpecimens,
  labTestCatalog,
  orders,
  orderItems,
  patients,
  users,
  notifications,
  tasks,
  auditLogs,
} from "@/db/schema/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

// GET: Retrieve results for an order or patient
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const patientId = searchParams.get("patientId");

    const query = db
      .select({
        id: labResults.id,
        orderId: labResults.orderId,
        orderItemId: labResults.orderItemId,
        specimenId: labResults.specimenId,
        patientId: labResults.patientId,
        parameterName: labResults.parameterName,
        measuredValue: labResults.measuredValue,
        unit: labResults.unit,
        referenceRange: labResults.referenceRange,
        isCritical: labResults.isCritical,
        criticalType: labResults.criticalType,
        status: labResults.status,
        technicianId: labResults.technicianId,
        technicianNotes: labResults.technicianNotes,
        enteredAt: labResults.enteredAt,
        verifiedById: labResults.verifiedById,
        verifiedAt: labResults.verifiedAt,
        isCorrected: labResults.isCorrected,
        correctionReason: labResults.correctionReason,
        correctedFromId: labResults.correctedFromId,
      })
      .from(labResults)
      .where(
        and(
          orderId ? eq(labResults.orderId, parseInt(orderId)) : undefined,
          patientId ? eq(labResults.patientId, parseInt(patientId)) : undefined
        )
      )
      .orderBy(desc(labResults.createdAt));

    const results = await query;
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Failed to fetch lab results:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Enter test results (Technician result entry with panic value evaluation)
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderItemId, specimenId, patientId, testCode, parameters, technicianNotes } = body;

    if (!orderId || !orderItemId || !parameters || !Array.isArray(parameters)) {
      return NextResponse.json(
        { error: "orderId, orderItemId, and parameters array are required" },
        { status: 400 }
      );
    }

    // Look up test catalog reference ranges if testCode provided
    let catalogEntry = null;
    if (testCode) {
      const catRes = await db
        .select()
        .from(labTestCatalog)
        .where(eq(labTestCatalog.testCode, testCode));
      catalogEntry = catRes[0] || null;
    }

    const insertedResults = [];
    let hasPanicValue = false;
    const panicDetails = [];

    for (const p of parameters) {
      const paramName = p.parameterName;
      const valStr = String(p.measuredValue).trim();
      const numVal = parseFloat(valStr);

      let isCritical = false;
      let criticalType = "NORMAL";
      let refRangeStr = p.referenceRange || "";
      let unit = p.unit || "";

      // Match against catalog thresholds
      if (catalogEntry?.referenceRanges) {
        const refParam = catalogEntry.referenceRanges.find(
          (r) => r.parameter.toLowerCase() === paramName.toLowerCase()
        );
        if (refParam) {
          if (!refRangeStr) {
            refRangeStr = `${refParam.normalMin} - ${refParam.normalMax} ${refParam.unit || ""}`;
          }
          if (!unit) {
            unit = refParam.unit || "";
          }

          if (!isNaN(numVal)) {
            if (refParam.panicHigh !== undefined && numVal >= refParam.panicHigh) {
              isCritical = true;
              criticalType = "PANIC_HIGH";
              hasPanicValue = true;
              panicDetails.push(`${paramName}: ${valStr} ${unit} (PANIC HIGH threshold ≥ ${refParam.panicHigh})`);
            } else if (refParam.panicLow !== undefined && numVal <= refParam.panicLow) {
              isCritical = true;
              criticalType = "PANIC_LOW";
              hasPanicValue = true;
              panicDetails.push(`${paramName}: ${valStr} ${unit} (PANIC LOW threshold ≤ ${refParam.panicLow})`);
            } else if (refParam.normalMax !== undefined && numVal > refParam.normalMax) {
              criticalType = "HIGH";
            } else if (refParam.normalMin !== undefined && numVal < refParam.normalMin) {
              criticalType = "LOW";
            }
          }
        }
      }

      const [resRow] = await db
        .insert(labResults)
        .values({
          orderId,
          orderItemId,
          specimenId: specimenId || null,
          patientId,
          parameterName: paramName,
          measuredValue: valStr,
          unit,
          referenceRange: refRangeStr,
          isCritical,
          criticalType,
          status: "RESULT_ENTERED",
          technicianId: session.id,
          technicianNotes,
          enteredAt: new Date(),
        })
        .returning();

      insertedResults.push(resRow);
    }

    // Update order item status
    await db
      .update(orderItems)
      .set({ status: "COMPLETED", resultNotes: technicianNotes })
      .where(eq(orderItems.id, orderItemId));

    // If critical panic value detected, dispatch urgent escalation alerts
    if (hasPanicValue) {
      const [orderRec] = await db.select().from(orders).where(eq(orders.id, orderId));
      const [patientRec] = await db.select().from(patients).where(eq(patients.id, patientId));

      // 1. Alert attending doctor
      await db.insert(notifications).values({
        userId: orderRec?.orderedById,
        roleSlug: "doctor",
        title: `CRITICAL PANIC LAB ALERT: ${patientRec?.uhid || "Patient"}`,
        message: `Panic lab values detected for ${patientRec?.firstName} ${patientRec?.lastName} (${patientRec?.uhid}): ${panicDetails.join(", ")}. Immediate medical review required!`,
        priority: "CRITICAL",
        category: "CLINICAL",
        actionUrl: `/opd`,
      });

      // 2. Alert on-duty nurses
      await db.insert(notifications).values({
        roleSlug: "nurse",
        departmentId: orderRec?.departmentId,
        title: `Urgent Panic Result: ${patientRec?.firstName} ${patientRec?.lastName}`,
        message: `Abnormal critical test result flagged by pathology: ${panicDetails.join(", ")}. Notify attending clinician.`,
        priority: "CRITICAL",
        category: "CLINICAL",
        actionUrl: `/vitals`,
      });

      // 3. Create high-priority clinical task
      await db.insert(tasks).values({
        taskNumber: `TSK-PANIC-${Date.now().toString().slice(-5)}`,
        title: `Panic Lab Value Follow-Up: ${patientRec?.uhid}`,
        description: `Critical values: ${panicDetails.join("; ")}`,
        taskType: "CLINICAL",
        priority: "STAT",
        status: "NEW",
        patientId,
        encounterId: orderRec?.encounterId,
        departmentId: orderRec?.departmentId,
        assignedRole: "doctor",
      });
    }

    return NextResponse.json({
      success: true,
      results: insertedResults,
      hasPanicValue,
      panicDetails,
    });
  } catch (error) {
    console.error("Failed to enter lab results:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: Pathologist Verification & Report Release
export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderItemId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // Mark results as VERIFIED
    const updated = await db
      .update(labResults)
      .set({
        status: "VERIFIED",
        verifiedById: session.id,
        verifiedAt: new Date(),
      })
      .where(
        orderItemId
          ? and(eq(labResults.orderId, orderId), eq(labResults.orderItemId, orderItemId))
          : eq(labResults.orderId, orderId)
      )
      .returning();

    // Mark Order as COMPLETED
    await db
      .update(orders)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    // Audit log
    await db.insert(auditLogs).values({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug || "pathologist",
      action: "VERIFY_LAB_REPORT",
      module: "LABORATORY",
      resource: "LabOrder",
      resourceId: String(orderId),
      afterState: { orderId, verifiedCount: updated.length },
      reason: "Official Pathologist clinical verification & release",
    });

    return NextResponse.json({ success: true, verifiedCount: updated.length });
  } catch (error) {
    console.error("Failed to verify lab report:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Report Amendment / Correction Workflow
export async function PATCH(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { resultId, correctedValue, correctionReason } = body;

    if (!resultId || !correctedValue || !correctionReason) {
      return NextResponse.json(
        { error: "resultId, correctedValue, and mandatory correctionReason are required" },
        { status: 400 }
      );
    }

    // Fetch original result
    const [original] = await db
      .select()
      .from(labResults)
      .where(eq(labResults.id, resultId));

    if (!original) {
      return NextResponse.json({ error: "Original result not found" }, { status: 404 });
    }

    // Insert new amended result linked to original
    const [amended] = await db
      .insert(labResults)
      .values({
        orderId: original.orderId,
        orderItemId: original.orderItemId,
        specimenId: original.specimenId,
        patientId: original.patientId,
        parameterName: original.parameterName,
        measuredValue: correctedValue,
        unit: original.unit,
        referenceRange: original.referenceRange,
        isCritical: original.isCritical,
        criticalType: original.criticalType,
        status: "VERIFIED",
        technicianId: session.id,
        technicianNotes: `Amended: ${correctionReason}`,
        enteredAt: new Date(),
        verifiedById: session.id,
        verifiedAt: new Date(),
        isCorrected: true,
        correctionReason,
        correctedFromId: original.id,
      })
      .returning();

    // Mark previous as CORRECTION
    await db
      .update(labResults)
      .set({ status: "CORRECTION" })
      .where(eq(labResults.id, original.id));

    // Audit log
    await db.insert(auditLogs).values({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug || "pathologist",
      action: "CORRECT_LAB_RESULT",
      module: "LABORATORY",
      resource: "LabResult",
      resourceId: String(resultId),
      beforeState: { value: original.measuredValue },
      afterState: { value: correctedValue, reason: correctionReason },
      reason: correctionReason,
    });

    return NextResponse.json({ success: true, amendedResult: amended });
  } catch (error) {
    console.error("Failed to correct lab result:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


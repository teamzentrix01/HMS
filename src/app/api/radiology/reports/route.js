import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  radiologyStudies,
  orders,
  orderItems,
  patients,
  users,
  notifications,
  auditLogs,
} from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get("studyId");
    if (!studyId) {
      return NextResponse.json({ error: "studyId is required" }, { status: 400 });
    }

    const [study] = await db
      .select()
      .from(radiologyStudies)
      .where(eq(radiologyStudies.id, parseInt(studyId)));

    if (!study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, study });
  } catch (error) {
    console.error("Failed to fetch radiology report:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Sign & Verify Radiologist Report
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studyId, findings, impression, keyImages, isCriticalAlert } = body;

    if (!studyId || !findings || !impression) {
      return NextResponse.json(
        { error: "studyId, findings, and clinical impression are required" },
        { status: 400 }
      );
    }

    const [study] = await db
      .select()
      .from(radiologyStudies)
      .where(eq(radiologyStudies.id, studyId));

    if (!study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    // Update study to VERIFIED
    const [updated] = await db
      .update(radiologyStudies)
      .set({
        findings,
        impression,
        keyImages: keyImages || [],
        status: "VERIFIED",
        radiologistId: session.id,
        reportedAt: new Date(),
        verifiedAt: new Date(),
      })
      .where(eq(radiologyStudies.id, studyId))
      .returning();

    // Mark order item & order as COMPLETED
    if (study.orderItemId) {
      await db
        .update(orderItems)
        .set({ status: "COMPLETED", resultNotes: impression })
        .where(eq(orderItems.id, study.orderItemId));
    }

    await db
      .update(orders)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(orders.id, study.orderId));

    // Notify attending physician
    const [orderRec] = await db.select().from(orders).where(eq(orders.id, study.orderId));
    const [patientRec] = await db.select().from(patients).where(eq(patients.id, study.patientId));

    await db.insert(notifications).values({
      userId: orderRec?.orderedById,
      roleSlug: "doctor",
      title: `${isCriticalAlert ? "CRITICAL " : ""}Radiology Report Signed: ${study.procedureName}`,
      message: `Radiologist report verified for ${patientRec?.firstName} ${patientRec?.lastName} (${patientRec?.uhid}). Impression: ${impression}`,
      priority: isCriticalAlert ? "CRITICAL" : "INFO",
      category: "CLINICAL",
      actionUrl: "/opd",
    });

    // Audit log
    await db.insert(auditLogs).values({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug || "radiologist",
      action: "VERIFY_RADIOLOGY_REPORT",
      module: "RADIOLOGY",
      resource: "RadiologyStudy",
      resourceId: study.accessionNumber,
      afterState: { accessionNumber: study.accessionNumber, impression },
      reason: "Official Radiologist diagnostic report sign-off",
    });

    return NextResponse.json({ success: true, study: updated });
  } catch (error) {
    console.error("Failed to sign radiology report:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


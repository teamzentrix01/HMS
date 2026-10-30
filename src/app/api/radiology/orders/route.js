import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  orders,
  orderItems,
  radiologyStudies,
  radiologyModalities,
  patients,
  users,
  departments,
  auditLogs,
  numberingRules,
} from "@/db/schema/index.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

// GET: List all radiology orders with studies and modality details
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const modalityId = searchParams.get("modalityId");

    const radOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        encounterId: orders.encounterId,
        patientId: orders.patientId,
        patientName: sql`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientUhid: patients.uhid,
        patientGender: patients.gender,
        patientDob: patients.dateOfBirth,
        patientPhone: patients.phone,
        orderedById: orders.orderedById,
        doctorName: sql`concat(${users.firstName}, ' ', ${users.lastName})`,
        departmentId: orders.departmentId,
        departmentName: departments.name,
        orderType: orders.orderType,
        priority: orders.priority,
        status: orders.status,
        instructions: orders.instructions,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(patients, eq(orders.patientId, patients.id))
      .innerJoin(users, eq(orders.orderedById, users.id))
      .innerJoin(departments, eq(orders.departmentId, departments.id))
      .where(
        and(
          eq(orders.orderType, "RADIOLOGY"),
          status ? eq(orders.status, status) : undefined
        )
      )
      .orderBy(desc(orders.createdAt));

    const orderIds = radOrders.map((o) => o.id);
    let items = [];
    let studies = [];

    if (orderIds.length > 0) {
      items = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      studies = await db
        .select({
          id: radiologyStudies.id,
          accessionNumber: radiologyStudies.accessionNumber,
          orderId: radiologyStudies.orderId,
          orderItemId: radiologyStudies.orderItemId,
          patientId: radiologyStudies.patientId,
          modalityId: radiologyStudies.modalityId,
          modalityName: radiologyModalities.name,
          modalityCode: radiologyModalities.code,
          procedureName: radiologyStudies.procedureName,
          status: radiologyStudies.status,
          scheduledAt: radiologyStudies.scheduledAt,
          arrivedAt: radiologyStudies.arrivedAt,
          contrastUsed: radiologyStudies.contrastUsed,
          contrastDetails: radiologyStudies.contrastDetails,
          findings: radiologyStudies.findings,
          impression: radiologyStudies.impression,
          reportedAt: radiologyStudies.reportedAt,
          verifiedAt: radiologyStudies.verifiedAt,
        })
        .from(radiologyStudies)
        .leftJoin(radiologyModalities, eq(radiologyStudies.modalityId, radiologyModalities.id))
        .where(inArray(radiologyStudies.orderId, orderIds));
    }

    const enriched = radOrders.map((order) => ({
      ...order,
      items: items.filter((i) => i.orderId === order.id),
      studies: studies.filter((s) => s.orderId === order.id),
    }));

    return NextResponse.json({ success: true, orders: enriched });
  } catch (error) {
    console.error("Failed to fetch radiology orders:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Manage study state machine (SCHEDULE, ARRIVE, START_SCAN, COMPLETE_SCAN)
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, orderId, orderItemId, patientId, modalityId, procedureName, scheduledAt, contrastUsed, contrastDetails } = body;

    if (!action || !orderId) {
      return NextResponse.json(
        { error: "action and orderId are required" },
        { status: 400 }
      );
    }

    // ACTION: SCHEDULE STUDY / CREATE ACCESSION
    if (action === "SCHEDULE") {
      const year = new Date().getFullYear();
      const ruleRes = await db
        .select()
        .from(numberingRules)
        .where(eq(numberingRules.entityType, "RAD_STUDY"));

      let seq = 101;
      if (ruleRes.length > 0) {
        seq = ruleRes[0].currentSequence + 1;
        await db
          .update(numberingRules)
          .set({ currentSequence: seq, updatedAt: new Date() })
          .where(eq(numberingRules.entityType, "RAD_STUDY"));
      }

      const padLen = ruleRes[0]?.padLength || 5;
      const accessionNumber = `RAD-${year}-${seq.toString().padStart(padLen, "0")}`;

      const [study] = await db
        .insert(radiologyStudies)
        .values({
          accessionNumber,
          orderId,
          orderItemId: orderItemId || 0,
          patientId,
          modalityId: modalityId || 1,
          procedureName: procedureName || "Digital Imaging Examination",
          status: "SCHEDULED",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          contrastUsed: !!contrastUsed,
          contrastDetails,
        })
        .returning();

      // Update order status
      await db
        .update(orders)
        .set({ status: "IN_PROGRESS", updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      return NextResponse.json({ success: true, study });
    }

    // ACTION: ARRIVE PATIENT AT SCANNER
    if (action === "ARRIVE") {
      const { studyId } = body;
      const [updated] = await db
        .update(radiologyStudies)
        .set({ status: "ARRIVED", arrivedAt: new Date() })
        .where(eq(radiologyStudies.id, studyId))
        .returning();

      return NextResponse.json({ success: true, study: updated });
    }

    // ACTION: START ACQUISITION / IN_PROGRESS
    if (action === "START_SCAN") {
      const { studyId } = body;
      const [updated] = await db
        .update(radiologyStudies)
        .set({ status: "IN_PROGRESS", radiographerId: session.id })
        .where(eq(radiologyStudies.id, studyId))
        .returning();

      return NextResponse.json({ success: true, study: updated });
    }

    // ACTION: COMPLETE ACQUISITION (READY FOR RADIOLOGIST REPORT)
    if (action === "COMPLETE_SCAN") {
      const { studyId } = body;
      const [updated] = await db
        .update(radiologyStudies)
        .set({ status: "COMPLETED", radiographerId: session.id })
        .where(eq(radiologyStudies.id, studyId))
        .returning();

      return NextResponse.json({ success: true, study: updated });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process radiology study action:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


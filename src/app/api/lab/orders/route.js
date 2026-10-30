import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  orders,
  orderItems,
  labSpecimens,
  patients,
  users,
  departments,
  tasks,
  notifications,
  auditLogs,
  numberingRules,
} from "@/db/schema/index.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

// GET: List all laboratory orders with specimens and patient details
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const patientId = searchParams.get("patientId");

    // Fetch orders of type LAB
    const labOrders = await db
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
          eq(orders.orderType, "LAB"),
          status ? eq(orders.status, status) : undefined,
          priority ? eq(orders.priority, priority) : undefined,
          patientId ? eq(orders.patientId, parseInt(patientId)) : undefined
        )
      )
      .orderBy(desc(orders.createdAt));

    // Fetch line items and specimens for these orders
    const orderIds = labOrders.map((o) => o.id);
    let items = [];
    let specimens = [];

    if (orderIds.length > 0) {
      items = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      specimens = await db
        .select({
          id: labSpecimens.id,
          barcode: labSpecimens.barcode,
          orderId: labSpecimens.orderId,
          orderItemId: labSpecimens.orderItemId,
          patientId: labSpecimens.patientId,
          specimenType: labSpecimens.specimenType,
          collectionStatus: labSpecimens.collectionStatus,
          collectedById: labSpecimens.collectedById,
          collectedAt: labSpecimens.collectedAt,
          receivedById: labSpecimens.receivedById,
          receivedAt: labSpecimens.receivedAt,
          rejectionReason: labSpecimens.rejectionReason,
          recollectionNeeded: labSpecimens.recollectionNeeded,
        })
        .from(labSpecimens)
        .where(inArray(labSpecimens.orderId, orderIds));
    }

    // Attach items and specimens to their orders
    const enrichedOrders = labOrders.map((order) => ({
      ...order,
      items: items.filter((i) => i.orderId === order.id),
      specimens: specimens.filter((s) => s.orderId === order.id),
    }));

    return NextResponse.json({ success: true, orders: enrichedOrders });
  } catch (error) {
    console.error("Failed to fetch lab orders:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Manage specimen collection, receipt, or sample rejection
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, orderId, orderItemId, patientId, specimenType, reason } = body;

    if (!action || !orderId) {
      return NextResponse.json(
        { error: "action and orderId are required" },
        { status: 400 }
      );
    }

    // ACTION: COLLECT SPECIMEN
    if (action === "COLLECT") {
      // Generate specimen barcode LAB-YYYY-XXXXX
      const year = new Date().getFullYear();
      const ruleRes = await db
        .select()
        .from(numberingRules)
        .where(eq(numberingRules.entityType, "LAB_SPECIMEN"));

      let seq = 101;
      if (ruleRes.length > 0) {
        seq = ruleRes[0].currentSequence + 1;
        await db
          .update(numberingRules)
          .set({ currentSequence: seq, updatedAt: new Date() })
          .where(eq(numberingRules.entityType, "LAB_SPECIMEN"));
      }

      const padLen = ruleRes[0]?.padLength || 5;
      const barcode = `LAB-${year}-${seq.toString().padStart(padLen, "0")}`;

      const [specimen] = await db
        .insert(labSpecimens)
        .values({
          barcode,
          orderId,
          orderItemId: orderItemId || 0,
          patientId,
          specimenType: specimenType || "Whole Blood (EDTA)",
          collectionStatus: "COLLECTED",
          collectedById: session.id,
          collectedAt: new Date(),
        })
        .returning();

      // Update order and item status to IN_PROGRESS / PROCESSING
      await db
        .update(orders)
        .set({ status: "IN_PROGRESS", updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      if (orderItemId) {
        await db
          .update(orderItems)
          .set({ status: "PROCESSING" })
          .where(eq(orderItems.id, orderItemId));
      }

      // Log audit
      await db.insert(auditLogs).values({
        userId: session.id,
        userEmail: session.email,
        userRole: session.roleSlug || "lab_tech",
        action: "COLLECT_SPECIMEN",
        module: "LABORATORY",
        resource: "LabSpecimen",
        resourceId: barcode,
        afterState: { specimenId: specimen.id, barcode, orderId },
        reason: "Phlebotomy / specimen collection completed",
      });

      return NextResponse.json({ success: true, specimen });
    }

    // ACTION: RECEIVE SPECIMEN IN LAB
    if (action === "RECEIVE") {
      const { specimenId } = body;
      if (!specimenId) {
        return NextResponse.json({ error: "specimenId required" }, { status: 400 });
      }

      const [updated] = await db
        .update(labSpecimens)
        .set({
          collectionStatus: "RECEIVED",
          receivedById: session.id,
          receivedAt: new Date(),
        })
        .where(eq(labSpecimens.id, specimenId))
        .returning();

      return NextResponse.json({ success: true, specimen: updated });
    }

    // ACTION: REJECT SPECIMEN (Hemolyzed, clotted, insufficient volume)
    if (action === "REJECT") {
      const { specimenId } = body;
      if (!specimenId || !reason) {
        return NextResponse.json(
          { error: "specimenId and rejection reason required" },
          { status: 400 }
        );
      }

      const [rejected] = await db
        .update(labSpecimens)
        .set({
          collectionStatus: "REJECTED",
          rejectionReason: reason,
          recollectionNeeded: true,
        })
        .where(eq(labSpecimens.id, specimenId))
        .returning();

      // Create an urgent recollection task and notification
      const [orderRec] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      await db.insert(tasks).values({
        taskNumber: `TSK-RECOLLECT-${Date.now().toString().slice(-5)}`,
        title: `Specimen Recollection: ${rejected.specimenType}`,
        description: `Specimen ${rejected.barcode} was rejected by lab: "${reason}". Immediate recollection needed.`,
        taskType: "NURSING",
        priority: "URGENT",
        status: "NEW",
        patientId: rejected.patientId,
        encounterId: orderRec?.encounterId,
        departmentId: orderRec?.departmentId,
        assignedRole: "nurse",
      });

      await db.insert(notifications).values({
        roleSlug: "nurse",
        departmentId: orderRec?.departmentId,
        title: "Lab Sample Rejected - Recollection Required",
        message: `Sample ${rejected.barcode} for patient rejected: ${reason}. Please arrange urgent recollection.`,
        priority: "CRITICAL",
        category: "CLINICAL",
        actionUrl: "/lab",
      });

      return NextResponse.json({ success: true, specimen: rejected });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process lab specimen action:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


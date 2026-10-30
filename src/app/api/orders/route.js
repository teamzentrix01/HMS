import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, services, departments, patients } from "@/db/schema";
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

    let orderList = [];
    if (encounterId) {
      orderList = await db
        .select()
        .from(orders)
        .where(eq(orders.encounterId, parseInt(encounterId, 10)))
        .orderBy(desc(orders.createdAt));
    } else if (patientId) {
      orderList = await db
        .select()
        .from(orders)
        .where(eq(orders.patientId, parseInt(patientId, 10)))
        .orderBy(desc(orders.createdAt));
    }

    // Attach items
    const ordersWithItems = await Promise.all(
      orderList.map(async (ord) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, ord.id));
        return { ...ord, items };
      })
    );

    return NextResponse.json({ orders: ordersWithItems });
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
      departmentId,
      orderType = "LAB", // LAB, RADIOLOGY, PROCEDURE, DIET, BLOOD
      priority = "ROUTINE", // ROUTINE, URGENT, STAT
      instructions,
      clinicalNotes,
      items = [], // Array of { serviceId, itemDescription, quantity, unitPrice }
    } = body;

    if (!encounterId || !patientId || items.length === 0) {
      return NextResponse.json(
        { error: "Encounter ID, Patient ID, and at least one ordered service item are required" },
        { status: 400 }
      );
    }

    // Target department ID lookup if not provided
    let targetDeptId = departmentId;
    if (!targetDeptId) {
      const code = orderType === "LAB" ? "LAB" : orderType === "RADIOLOGY" ? "RAD" : "MED";
      const dRes = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.code, code))
        .limit(1);
      targetDeptId = dRes[0]?.id || 1;
    }

    const orderNumber = `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const ordRes = await db
      .insert(orders)
      .values({
        orderNumber,
        encounterId: parseInt(encounterId, 10),
        patientId: parseInt(patientId, 10),
        orderedById: session.id,
        departmentId: parseInt(targetDeptId, 10),
        orderType,
        priority,
        status: "PENDING",
        instructions,
        clinicalNotes,
      })
      .returning();

    const newOrder = ordRes[0];

    // Insert order items
    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        serviceId: item.serviceId ? parseInt(item.serviceId, 10) : null,
        itemDescription: item.itemDescription,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice ? String(item.unitPrice) : "0.00",
        status: "PENDING",
      });
    }

    // Lookup patient UHID for audit & events
    const pRes = await db
      .select({ uhid: patients.uhid })
      .from(patients)
      .where(eq(patients.id, parseInt(patientId, 10)))
      .limit(1);

    const patientUhid = pRes[0]?.uhid || "";

    // Log Audit
    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "CREATE",
      module: "CLINICAL",
      resource: "Order",
      resourceId: orderNumber,
      afterState: { ...newOrder, itemsCount: items.length },
      reason: `Placed ${priority} ${orderType} order for Patient ${patientUhid}`,
    });

    // Emit event on EventBus (triggers Task Creation & Department Notification)
    await eventBus.emit("order.created", {
      orderId: newOrder.id,
      orderNumber,
      orderType,
      priority,
      departmentId: targetDeptId,
      encounterId: parseInt(encounterId, 10),
      patientId: parseInt(patientId, 10),
      patientUhid,
    });

    return NextResponse.json({ success: true, order: newOrder });
  } catch (err) {
    console.error("POST order error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


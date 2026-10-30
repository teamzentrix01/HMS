import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  inventoryStores,
  inventoryItems,
  inventoryBatches,
  inventoryStockTransactions,
  numberingRules,
  auditLogs,
} from "@/db/schema/index.js";
import { eq, desc, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pos = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        storeId: purchaseOrders.storeId,
        storeName: inventoryStores.name,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .innerJoin(inventoryStores, eq(purchaseOrders.storeId, inventoryStores.id))
      .orderBy(desc(purchaseOrders.createdAt));

    const poIds = pos.map((p) => p.id);
    let items = [];
    if (poIds.length > 0) {
      items = await db
        .select({
          id: purchaseOrderItems.id,
          poId: purchaseOrderItems.poId,
          itemId: purchaseOrderItems.itemId,
          itemName: inventoryItems.name,
          itemCode: inventoryItems.itemCode,
          uom: inventoryItems.uom,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: purchaseOrderItems.quantityReceived,
          unitCost: purchaseOrderItems.unitCost,
          totalCost: purchaseOrderItems.totalCost,
        })
        .from(purchaseOrderItems)
        .innerJoin(inventoryItems, eq(purchaseOrderItems.itemId, inventoryItems.id))
        .where(inArray(purchaseOrderItems.poId, poIds));
    }

    const enriched = pos.map((p) => ({
      ...p,
      items: items.filter((i) => i.poId === p.id),
    }));

    return NextResponse.json({ success: true, purchaseOrders: enriched });
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create PO or Receive Goods
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action = "CREATE", supplierId, storeId, expectedDeliveryDate, notes, items } = body;

    // ACTION: CREATE PURCHASE ORDER
    if (action === "CREATE") {
      if (!supplierId || !storeId || !items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: "supplierId, storeId, and items array are required" },
          { status: 400 }
        );
      }

      // Generate PO Number PO-YYYY-XXXXX
      const year = new Date().getFullYear();
      const ruleRes = await db
        .select()
        .from(numberingRules)
        .where(eq(numberingRules.entityType, "PURCHASE_ORDER"));

      let seq = 101;
      if (ruleRes.length > 0) {
        seq = ruleRes[0].currentSequence + 1;
        await db
          .update(numberingRules)
          .set({ currentSequence: seq, updatedAt: new Date() })
          .where(eq(numberingRules.entityType, "PURCHASE_ORDER"));
      }

      const padLen = ruleRes[0]?.padLength || 5;
      const poNumber = `PO-${year}-${seq.toString().padStart(padLen, "0")}`;

      let totalAmount = 0;
      for (const itm of items) {
        const q = parseInt(itm.quantityOrdered) || 0;
        const c = parseFloat(itm.unitCost) || 0;
        totalAmount += q * c;
      }

      const todayStr = new Date().toISOString().split("T")[0];

      const [po] = await db
        .insert(purchaseOrders)
        .values({
          poNumber,
          supplierId,
          storeId,
          status: "SUBMITTED",
          orderDate: todayStr,
          expectedDeliveryDate: expectedDeliveryDate || todayStr,
          totalAmount: totalAmount.toFixed(2),
          createdById: session.id,
          notes,
        })
        .returning();

      for (const itm of items) {
        const q = parseInt(itm.quantityOrdered) || 0;
        const c = parseFloat(itm.unitCost) || 0;
        await db.insert(purchaseOrderItems).values({
          poId: po.id,
          itemId: itm.itemId,
          quantityOrdered: q,
          unitCost: c.toFixed(2),
          totalCost: (q * c).toFixed(2),
        });
      }

      return NextResponse.json({ success: true, poNumber, poId: po.id });
    }

    // ACTION: RECEIVE GOODS AGAINST PO
    if (action === "RECEIVE_GOODS") {
      const { poId, receiptItems } = body; // [{ poItemId, itemId, batchNumber, expiryDate, quantityReceived, sellingMrp }]
      if (!poId || !receiptItems || !Array.isArray(receiptItems)) {
        return NextResponse.json(
          { error: "poId and receiptItems are required" },
          { status: 400 }
        );
      }

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, poId));

      if (!po) {
        return NextResponse.json({ error: "PO not found" }, { status: 404 });
      }

      for (const rec of receiptItems) {
        const qty = parseInt(rec.quantityReceived) || 0;
        if (qty <= 0) continue;

        // Create or update batch
        const [batch] = await db
          .insert(inventoryBatches)
          .values({
            itemId: rec.itemId,
            storeId: po.storeId,
            batchNumber: rec.batchNumber || `GRN-${Date.now().toString().slice(-5)}`,
            expiryDate: rec.expiryDate || "2028-12-31",
            currentStock: qty,
            availableStock: qty,
            reservedStock: 0,
            purchaseCost: rec.unitCost || "0.00",
            sellingMrp: rec.sellingMrp || "0.00",
            status: "ACTIVE",
          })
          .returning();

        // Record stock transaction
        const year = new Date().getFullYear();
        const txnNumber = `TXN-${year}-${Date.now().toString().slice(-6)}`;

        await db.insert(inventoryStockTransactions).values({
          transactionNumber: txnNumber,
          itemId: rec.itemId,
          storeId: po.storeId,
          batchId: batch.id,
          transactionType: "PURCHASE_RECEIPT",
          quantity: qty,
          balanceAfter: qty,
          referenceEntityType: "purchase_order",
          referenceEntityId: po.id,
          createdById: session.id,
          notes: `Goods Receipt from PO ${po.poNumber}`,
        });

        // Update PO item quantity received
        if (rec.poItemId) {
          await db
            .update(purchaseOrderItems)
            .set({ quantityReceived: qty })
            .where(eq(purchaseOrderItems.id, rec.poItemId));
        }
      }

      // Mark PO as RECEIVED
      await db
        .update(purchaseOrders)
        .set({ status: "RECEIVED" })
        .where(eq(purchaseOrders.id, poId));

      return NextResponse.json({ success: true, message: "Goods received into stock" });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process purchase order:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


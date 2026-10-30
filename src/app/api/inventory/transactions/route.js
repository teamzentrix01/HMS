import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  inventoryStockTransactions,
  inventoryBatches,
  inventoryItems,
  inventoryStores,
  auditLogs,
} from "@/db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const storeId = searchParams.get("storeId");

    const txns = await db
      .select({
        id: inventoryStockTransactions.id,
        transactionNumber: inventoryStockTransactions.transactionNumber,
        itemId: inventoryStockTransactions.itemId,
        itemName: inventoryItems.name,
        itemCode: inventoryItems.itemCode,
        uom: inventoryItems.uom,
        storeId: inventoryStockTransactions.storeId,
        storeName: inventoryStores.name,
        batchId: inventoryStockTransactions.batchId,
        transactionType: inventoryStockTransactions.transactionType,
        quantity: inventoryStockTransactions.quantity,
        balanceAfter: inventoryStockTransactions.balanceAfter,
        referenceEntityType: inventoryStockTransactions.referenceEntityType,
        notes: inventoryStockTransactions.notes,
        createdAt: inventoryStockTransactions.createdAt,
      })
      .from(inventoryStockTransactions)
      .innerJoin(inventoryItems, eq(inventoryStockTransactions.itemId, inventoryItems.id))
      .innerJoin(inventoryStores, eq(inventoryStockTransactions.storeId, inventoryStores.id))
      .orderBy(desc(inventoryStockTransactions.createdAt));

    return NextResponse.json({ success: true, transactions: txns });
  } catch (error) {
    console.error("Failed to fetch stock transactions:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Stock Adjustment or Store Transfer
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action = "ADJUST", batchId, quantityChange, reason } = body;

    if (!batchId || quantityChange === undefined || !reason) {
      return NextResponse.json(
        { error: "batchId, quantityChange, and mandatory reason are required" },
        { status: 400 }
      );
    }

    const [batch] = await db
      .select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.id, batchId));

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const qty = parseInt(quantityChange);
    const newStock = Math.max(0, batch.currentStock + qty);
    const newAvail = Math.max(0, batch.availableStock + qty);

    // Update batch
    await db
      .update(inventoryBatches)
      .set({
        currentStock: newStock,
        availableStock: newAvail,
        status: newStock === 0 ? "DEPLETED" : batch.status,
      })
      .where(eq(inventoryBatches.id, batchId));

    // Record stock transaction
    const year = new Date().getFullYear();
    const txnNumber = `TXN-${year}-${Date.now().toString().slice(-6)}`;

    const [txn] = await db
      .insert(inventoryStockTransactions)
      .values({
        transactionNumber: txnNumber,
        itemId: batch.itemId,
        storeId: batch.storeId,
        batchId: batch.id,
        transactionType: "ADJUSTMENT",
        quantity: qty,
        balanceAfter: newStock,
        referenceEntityType: "stock_adjustment",
        createdById: session.id,
        notes: reason,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug || "pharmacist",
      action: "ADJUST_STOCK",
      module: "INVENTORY",
      resource: "InventoryBatch",
      resourceId: String(batchId),
      beforeState: { stock: batch.currentStock },
      afterState: { stock: newStock, delta: qty },
      reason,
    });

    return NextResponse.json({ success: true, transaction: txn, newStock });
  } catch (error) {
    console.error("Failed to adjust stock:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  inventoryItems,
  inventoryCategories,
  inventoryBatches,
  inventoryStores,
  auditLogs,
} from "@/db/schema/index.js";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    // Fetch items with category name
    const items = await db
      .select({
        id: inventoryItems.id,
        itemCode: inventoryItems.itemCode,
        name: inventoryItems.name,
        genericName: inventoryItems.genericName,
        categoryId: inventoryItems.categoryId,
        categoryName: inventoryCategories.name,
        uom: inventoryItems.uom,
        reorderLevel: inventoryItems.reorderLevel,
        minStock: inventoryItems.minStock,
        maxStock: inventoryItems.maxStock,
        standardCost: inventoryItems.standardCost,
        sellingMrp: inventoryItems.sellingMrp,
        isPrescriptionRequired: inventoryItems.isPrescriptionRequired,
        isControlledSubstance: inventoryItems.isControlledSubstance,
        storageCondition: inventoryItems.storageCondition,
        isActive: inventoryItems.isActive,
      })
      .from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
      .where(categoryId ? eq(inventoryItems.categoryId, parseInt(categoryId)) : undefined)
      .orderBy(inventoryItems.name);

    // Fetch batches to aggregate stock
    const batches = await db
      .select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.status, "ACTIVE"));

    const enriched = items.map((item) => {
      const itemBatches = batches.filter((b) => b.itemId === item.id);
      const totalStock = itemBatches.reduce((sum, b) => sum + (b.currentStock || 0), 0);
      const availableStock = itemBatches.reduce((sum, b) => sum + (b.availableStock || 0), 0);

      let stockStatus = "HEALTHY";
      if (totalStock === 0) stockStatus = "OUT_OF_STOCK";
      else if (totalStock <= item.reorderLevel) stockStatus = "LOW_STOCK";

      return {
        ...item,
        totalStock,
        availableStock,
        batchCount: itemBatches.length,
        stockStatus,
        batches: itemBatches,
      };
    });

    return NextResponse.json({ success: true, items: enriched });
  } catch (error) {
    console.error("Failed to fetch inventory items:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      itemCode,
      name,
      genericName,
      categoryId,
      uom,
      reorderLevel = 100,
      standardCost = "0.00",
      sellingMrp = "0.00",
      isPrescriptionRequired = true,
      isControlledSubstance = false,
      storageCondition = "ROOM_TEMPERATURE",
    } = body;

    if (!itemCode || !name || !uom) {
      return NextResponse.json(
        { error: "itemCode, name, and uom are required" },
        { status: 400 }
      );
    }

    const [item] = await db
      .insert(inventoryItems)
      .values({
        itemCode,
        name,
        genericName,
        categoryId: categoryId ? parseInt(categoryId) : null,
        uom,
        reorderLevel: parseInt(reorderLevel),
        standardCost,
        sellingMrp,
        isPrescriptionRequired: !!isPrescriptionRequired,
        isControlledSubstance: !!isControlledSubstance,
        storageCondition,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug || "pharmacist",
      action: "CREATE_INVENTORY_ITEM",
      module: "INVENTORY",
      resource: "InventoryItem",
      resourceId: itemCode,
      afterState: item,
      reason: "Product master creation",
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Failed to create inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


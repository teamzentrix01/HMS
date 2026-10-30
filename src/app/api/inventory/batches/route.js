import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  inventoryBatches,
  inventoryItems,
  inventoryStores,
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
    const storeId = searchParams.get("storeId");
    const itemId = searchParams.get("itemId");

    const batches = await db
      .select({
        id: inventoryBatches.id,
        itemId: inventoryBatches.itemId,
        itemName: inventoryItems.name,
        itemCode: inventoryItems.itemCode,
        uom: inventoryItems.uom,
        storeId: inventoryBatches.storeId,
        storeName: inventoryStores.name,
        storeCode: inventoryStores.code,
        batchNumber: inventoryBatches.batchNumber,
        manufacturingDate: inventoryBatches.manufacturingDate,
        expiryDate: inventoryBatches.expiryDate,
        currentStock: inventoryBatches.currentStock,
        availableStock: inventoryBatches.availableStock,
        reservedStock: inventoryBatches.reservedStock,
        purchaseCost: inventoryBatches.purchaseCost,
        sellingMrp: inventoryBatches.sellingMrp,
        status: inventoryBatches.status,
      })
      .from(inventoryBatches)
      .innerJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
      .innerJoin(inventoryStores, eq(inventoryBatches.storeId, inventoryStores.id))
      .orderBy(inventoryBatches.expiryDate);

    // Compute expiry health
    const today = new Date();
    const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const enriched = batches.map((b) => {
      const exp = new Date(b.expiryDate);
      let expiryStatus = "VALID";
      if (exp < today) expiryStatus = "EXPIRED";
      else if (exp <= ninetyDays) expiryStatus = "EXPIRING_SOON";

      return {
        ...b,
        expiryStatus,
      };
    });

    return NextResponse.json({ success: true, batches: enriched });
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


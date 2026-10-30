import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import {
  pharmacyDispenses,
  pharmacyDispenseItems,
  prescriptions,
  prescriptionItems,
  inventoryItems,
  inventoryBatches,
  inventoryStockTransactions,
  numberingRules,
  auditLogs,
  notifications,
  patients,
  users,
} from "@/db/schema/index.js";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

// GET: List recent dispenses
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    const dispenses = await db
      .select({
        id: pharmacyDispenses.id,
        dispenseNumber: pharmacyDispenses.dispenseNumber,
        prescriptionId: pharmacyDispenses.prescriptionId,
        encounterId: pharmacyDispenses.encounterId,
        patientId: pharmacyDispenses.patientId,
        patientName: sql`concat(${patients.firstName}, ' ', ${patients.lastName})`,
        patientUhid: patients.uhid,
        dispensedById: pharmacyDispenses.dispensedById,
        pharmacistName: sql`concat(${users.firstName}, ' ', ${users.lastName})`,
        dispenseType: pharmacyDispenses.dispenseType,
        status: pharmacyDispenses.status,
        totalAmount: pharmacyDispenses.totalAmount,
        billingStatus: pharmacyDispenses.billingStatus,
        pharmacistNotes: pharmacyDispenses.pharmacistNotes,
        dispensedAt: pharmacyDispenses.dispensedAt,
      })
      .from(pharmacyDispenses)
      .innerJoin(patients, eq(pharmacyDispenses.patientId, patients.id))
      .innerJoin(users, eq(pharmacyDispenses.dispensedById, users.id))
      .where(patientId ? eq(pharmacyDispenses.patientId, parseInt(patientId)) : undefined)
      .orderBy(desc(pharmacyDispenses.dispensedAt));

    const dispenseIds = dispenses.map((d) => d.id);
    let items = [];
    if (dispenseIds.length > 0) {
      items = await db
        .select()
        .from(pharmacyDispenseItems)
        .where(inArray(pharmacyDispenseItems.dispenseId, dispenseIds));
    }

    const enriched = dispenses.map((d) => ({
      ...d,
      items: items.filter((i) => i.dispenseId === d.id),
    }));

    return NextResponse.json({ success: true, dispenses: enriched });
  } catch (error) {
    console.error("Failed to fetch dispenses:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Execute Dispense
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      prescriptionId,
      encounterId,
      patientId,
      dispenseType = "OPD",
      items, // [{ prescriptionItemId, inventoryItemId, batchId, medicationName, quantityPrescribed, quantityDispensed, unitPrice, substitutionMade, substitutionReason }]
      pharmacistNotes,
    } = body;

    if (!prescriptionId || !encounterId || !patientId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "prescriptionId, encounterId, patientId, and items array are required" },
        { status: 400 }
      );
    }

    // Generate Dispense Number: DSP-YYYY-XXXXX
    const year = new Date().getFullYear();
    const ruleRes = await db
      .select()
      .from(numberingRules)
      .where(eq(numberingRules.entityType, "DISPENSE"));

    let seq = 101;
    if (ruleRes.length > 0) {
      seq = ruleRes[0].currentSequence + 1;
      await db
        .update(numberingRules)
        .set({ currentSequence: seq, updatedAt: new Date() })
        .where(eq(numberingRules.entityType, "DISPENSE"));
    }

    const padLen = ruleRes[0]?.padLength || 5;
    const dispenseNumber = `DSP-${year}-${seq.toString().padStart(padLen, "0")}`;

    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      const q = parseInt(item.quantityDispensed) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      totalAmount += q * p;
    }

    // Check if partial dispense
    let isPartial = false;
    for (const item of items) {
      if ((parseInt(item.quantityDispensed) || 0) < (parseInt(item.quantityPrescribed) || 0)) {
        isPartial = true;
        break;
      }
    }

    // 1. Create pharmacy dispense record
    const [dispense] = await db
      .insert(pharmacyDispenses)
      .values({
        dispenseNumber,
        prescriptionId,
        encounterId,
        patientId,
        dispensedById: session.id,
        dispenseType,
        status: isPartial ? "PARTIAL" : "DISPENSED",
        totalAmount: totalAmount.toFixed(2),
        billingStatus: "PENDING_BILLING",
        pharmacistNotes,
        dispensedAt: new Date(),
      })
      .returning();

    // 2. Process line items, stock deduction, and inventory transactions
    for (const item of items) {
      const qDisp = parseInt(item.quantityDispensed) || 0;
      const uPrice = parseFloat(item.unitPrice) || 0;
      const tPrice = qDisp * uPrice;

      // Insert line item
      await db.insert(pharmacyDispenseItems).values({
        dispenseId: dispense.id,
        prescriptionItemId: item.prescriptionItemId || null,
        inventoryItemId: item.inventoryItemId || null,
        batchId: item.batchId || null,
        medicationName: item.medicationName,
        quantityPrescribed: parseInt(item.quantityPrescribed) || qDisp,
        quantityDispensed: qDisp,
        unitPrice: uPrice.toFixed(2),
        totalPrice: tPrice.toFixed(2),
        substitutionMade: !!item.substitutionMade,
        substitutionReason: item.substitutionReason || null,
        dosageInstructions: item.dosageInstructions || null,
      });

      // Deduct stock from batch if batchId provided
      if (item.batchId && qDisp > 0) {
        const [batch] = await db
          .select()
          .from(inventoryBatches)
          .where(eq(inventoryBatches.id, item.batchId));

        if (batch) {
          const newCurrent = Math.max(0, batch.currentStock - qDisp);
          const newAvailable = Math.max(0, batch.availableStock - qDisp);

          await db
            .update(inventoryBatches)
            .set({
              currentStock: newCurrent,
              availableStock: newAvailable,
              status: newCurrent === 0 ? "DEPLETED" : batch.status,
            })
            .where(eq(inventoryBatches.id, item.batchId));

          // Log in stock transactions
          const txnYear = new Date().getFullYear();
          const txnNumber = `TXN-${txnYear}-${Date.now().toString().slice(-6)}`;

          await db.insert(inventoryStockTransactions).values({
            transactionNumber: txnNumber,
            itemId: batch.itemId,
            storeId: batch.storeId,
            batchId: batch.id,
            transactionType: "DISPENSE",
            quantity: -qDisp,
            balanceAfter: newCurrent,
            referenceEntityType: "pharmacy_dispense",
            referenceEntityId: dispense.id,
            createdById: session.id,
            notes: `Dispensed to patient prescription #${prescriptionId} (Voucher ${dispenseNumber})`,
          });
        }
      }
    }

    // 3. Update prescription status
    await db
      .update(prescriptions)
      .set({
        status: isPartial ? "PARTIALLY_DISPENSED" : "DISPENSED",
      })
      .where(eq(prescriptions.id, prescriptionId));

    // 4. Audit Log
    await db.insert(auditLogs).values({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug || "pharmacist",
      action: "DISPENSE_MEDICATION",
      module: "PHARMACY",
      resource: "PharmacyDispense",
      resourceId: dispenseNumber,
      afterState: { dispenseNumber, prescriptionId, totalAmount, isPartial },
      reason: `Prescription dispensed by pharmacist: ₹${totalAmount.toFixed(2)}`,
    });

    return NextResponse.json({
      success: true,
      dispenseNumber,
      dispenseId: dispense.id,
      totalAmount: totalAmount.toFixed(2),
      status: dispense.status,
    });
  } catch (error) {
    console.error("Failed to execute pharmacy dispense:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


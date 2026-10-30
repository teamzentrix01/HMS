import { pgTable, text, serial, integer, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { prescriptions, prescriptionItems, encounters, patients } from "./clinical.js";
import { inventoryItems, inventoryBatches } from "./inventory.js";
import { users } from "./rbac.js";

export const pharmacyDispenses = pgTable("pharmacy_dispenses", {
  id: serial("id").primaryKey(),
  dispenseNumber: text("dispense_number").notNull().unique(), // DSP-YYYY-XXXXX
  prescriptionId: integer("prescription_id").references(() => prescriptions.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  dispensedById: integer("dispensed_by_id").references(() => users.id).notNull(),
  dispenseType: text("dispense_type").default("OPD").notNull(), // OPD, IPD, EMERGENCY
  status: text("status").default("DISPENSED").notNull(), // DISPENSED, PARTIAL, CANCELLED
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  billingStatus: text("billing_status").default("PENDING_BILLING").notNull(), // PENDING_BILLING, CHARGED_TO_ENCOUNTER, PAID
  pharmacistNotes: text("pharmacist_notes"),
  dispensedAt: timestamp("dispensed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pharmacyDispenseItems = pgTable("pharmacy_dispense_items", {
  id: serial("id").primaryKey(),
  dispenseId: integer("dispense_id").references(() => pharmacyDispenses.id, { onDelete: "cascade" }).notNull(),
  prescriptionItemId: integer("prescription_item_id").references(() => prescriptionItems.id),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id),
  batchId: integer("batch_id").references(() => inventoryBatches.id),
  medicationName: text("medication_name").notNull(),
  quantityPrescribed: integer("quantity_prescribed").notNull(),
  quantityDispensed: integer("quantity_dispensed").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  substitutionMade: boolean("substitution_made").default(false).notNull(),
  substitutionReason: text("substitution_reason"),
  dosageInstructions: text("dosage_instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


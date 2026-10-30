import { pgTable, text, serial, integer, timestamp, numeric, boolean, date } from "drizzle-orm/pg-core";
import { departments } from "./hospital.js";
import { users } from "./rbac.js";

export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // DRUG_ORAL, DRUG_INJECTABLE, CONSUMABLE, REAGENT, IMPLANT, etc.
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryStores = pgTable("inventory_stores", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // MAIN_STORE, OPD_PHARMACY, IPD_PHARMACY, LAB_STORE, etc.
  name: text("name").notNull(),
  storeType: text("store_type").notNull(), // CENTRAL_WAREHOUSE, PHARMACY, LAB, SUBSTORE
  departmentId: integer("department_id").references(() => departments.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  itemCode: text("item_code").notNull().unique(), // MED-ATORVA-40, MED-AMLO-5, etc.
  name: text("name").notNull(),
  genericName: text("generic_name"),
  categoryId: integer("category_id").references(() => inventoryCategories.id),
  uom: text("uom").notNull(), // TABLET, CAPSULE, VIAL, AMPOULE, STRIP, BOTTLE, BOX, PIECE
  reorderLevel: integer("reorder_level").default(100).notNull(),
  minStock: integer("min_stock").default(50).notNull(),
  maxStock: integer("max_stock").default(1000).notNull(),
  standardCost: numeric("standard_cost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  sellingMrp: numeric("selling_mrp", { precision: 10, scale: 2 }).default("0.00").notNull(),
  isPrescriptionRequired: boolean("is_prescription_required").default(true).notNull(),
  isControlledSubstance: boolean("is_controlled_substance").default(false).notNull(),
  storageCondition: text("storage_condition").default("ROOM_TEMPERATURE").notNull(), // ROOM_TEMPERATURE, REFRIGERATED_2_8C, FROZEN_MINUS_20C
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryBatches = pgTable("inventory_batches", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  storeId: integer("store_id").references(() => inventoryStores.id).notNull(),
  batchNumber: text("batch_number").notNull(),
  manufacturingDate: date("manufacturing_date"),
  expiryDate: date("expiry_date").notNull(),
  currentStock: integer("current_stock").default(0).notNull(),
  availableStock: integer("available_stock").default(0).notNull(),
  reservedStock: integer("reserved_stock").default(0).notNull(),
  purchaseCost: numeric("purchase_cost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  sellingMrp: numeric("selling_mrp", { precision: 10, scale: 2 }).default("0.00").notNull(),
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, EXPIRED, QUARANTINED, DEPLETED
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryStockTransactions = pgTable("inventory_stock_transactions", {
  id: serial("id").primaryKey(),
  transactionNumber: text("transaction_number").notNull().unique(), // TXN-YYYY-XXXXX
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  storeId: integer("store_id").references(() => inventoryStores.id).notNull(),
  batchId: integer("batch_id").references(() => inventoryBatches.id),
  transactionType: text("transaction_type").notNull(), // RECEIPT, DISPENSE, WARD_ISSUE, RETURN, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
  quantity: integer("quantity").notNull(), // Positive for in, negative for out
  balanceAfter: integer("balance_after").notNull(),
  referenceEntityType: text("reference_entity_type"), // pharmacy_dispense, purchase_order, stock_adjustment
  referenceEntityId: integer("reference_entity_id"),
  createdById: integer("created_by_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // SUP-001
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone").notNull(),
  email: text("email"),
  gstNumber: text("gst_number"),
  address: text("address"),
  paymentTerms: text("payment_terms").default("Net 30 Days"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(), // PO-YYYY-XXXXX
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  storeId: integer("store_id").references(() => inventoryStores.id).notNull(),
  status: text("status").default("DRAFT").notNull(), // DRAFT, SUBMITTED, APPROVED, RECEIVED, CANCELLED
  orderDate: date("order_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdById: integer("created_by_id").references(() => users.id),
  approvedById: integer("approved_by_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityReceived: integer("quantity_received").default(0).notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


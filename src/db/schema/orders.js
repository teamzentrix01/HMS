import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { encounters, patients } from "./clinical.js";
import { departments, services } from "./hospital.js";
import { users } from "./rbac.js";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(), // ORD-YYYY-XXXXX
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  orderedById: integer("ordered_by_id").references(() => users.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  orderType: text("order_type").notNull(), // LAB, RADIOLOGY, PHARMACY, PROCEDURE, DIET, BLOOD, ADMISSION
  priority: text("priority").default("ROUTINE").notNull(), // ROUTINE, URGENT, STAT
  status: text("status").default("PENDING").notNull(), // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  instructions: text("instructions"),
  clinicalNotes: text("clinical_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  serviceId: integer("service_id").references(() => services.id),
  itemDescription: text("item_description").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  status: text("status").default("PENDING").notNull(), // PENDING, PROCESSING, COMPLETED, CANCELLED
  resultValue: text("result_value"),
  resultNotes: text("result_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


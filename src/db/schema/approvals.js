import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./rbac.js";

export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // DISCOUNT, REFUND, INVOICE_CANCEL, STOCK_ADJUST, SENSITIVE_ACCESS, PATIENT_MERGE
  requestedById: integer("requested_by_id").references(() => users.id).notNull(),
  approverId: integer("approver_id").references(() => users.id),
  status: text("status").default("PENDING").notNull(), // PENDING, APPROVED, REJECTED
  justification: text("justification").notNull(),
  details: jsonb("details"),
  comment: text("comment"),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


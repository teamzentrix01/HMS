import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, SIGN, VERIFY, DISPENSE, BREAK_GLASS, LOGIN, LOGOUT
  module: text("module").notNull(), // AUTH, ADMIN, CLINICAL, LAB, PHARMACY, BILLING, SECURITY
  resource: text("resource").notNull(), // e.g. "HospitalSetting", "Patient", "ConsultationNote", "Bed"
  resourceId: text("resource_id"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


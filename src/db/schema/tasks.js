import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { departments } from "./hospital.js";
import { users } from "./rbac.js";
import { patients, encounters } from "./clinical.js";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  taskNumber: text("task_number").notNull().unique(), // TSK-YYYY-XXXXX
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(), // SAMPLE_COLLECTION, MEDICATION_ADMIN, BED_CLEANING, CONSULT_REVIEW, APPROVAL_PENDING
  priority: text("priority").default("MEDIUM").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  status: text("status").default("NEW").notNull(), // NEW, ASSIGNED, ACCEPTED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED, REJECTED, ESCALATED
  assignedDepartmentId: integer("assigned_department_id").references(() => departments.id),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  patientId: integer("patient_id").references(() => patients.id),
  encounterId: integer("encounter_id").references(() => encounters.id),
  relatedEntityType: text("related_entity_type"), // ORDER, BED, PRESCRIPTION, APPROVAL
  relatedEntityId: integer("related_entity_id"),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  completionNotes: text("completion_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./rbac.js";
import { departments } from "./hospital.js";

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  roleSlug: text("role_slug"), // Can broadcast to all users of a specific role
  departmentId: integer("department_id").references(() => departments.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").default("INFO").notNull(), // INFO, IMPORTANT, URGENT, CRITICAL
  category: text("category").default("CLINICAL").notNull(), // CLINICAL, OPERATIONAL, FINANCIAL, SYSTEM
  actionUrl: text("action_url"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


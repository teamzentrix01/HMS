import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { departments } from "./hospital.js";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // super_admin, hospital_admin, doctor, nurse, receptionist, lab_tech, pharmacist, cashier
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  module: text("module").notNull(), // admin, patient, opd, ipd, emergency, lab, radiology, pharmacy, billing, audit, etc.
  action: text("action").notNull(), // VIEW, CREATE, EDIT, DELETE, APPROVE, SIGN, EXPORT, DISPENSE, ADMIN
  resource: text("resource").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, INACTIVE, SUSPENDED
  avatarUrl: text("avatar_url"),
  employeeId: text("employee_id").unique(),
  specialization: text("specialization"),
  designation: text("designation"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  isPrimary: boolean("is_primary").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const departmentAssignments = pgTable("department_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  isPrimary: boolean("is_primary").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const staffCredentials = pgTable("staff_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  credentialType: text("credential_type").notNull(), // MEDICAL_COUNCIL, NURSING_COUNCIL, PHARMACY_COUNCIL, BLS_ACLS
  licenseNumber: text("license_number").notNull(),
  issuingAuthority: text("issuing_authority").notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  isVerified: boolean("is_verified").default(true).notNull(),
  verificationNotes: text("verification_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const breakGlassAccess = pgTable("break_glass_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  patientId: integer("patient_id"),
  encounterId: integer("encounter_id"),
  reason: text("reason").notNull(), // Emergency resuscitation, Immediate surgery, Unresponsive patient, etc.
  justification: text("justification").notNull(),
  accessDurationMinutes: integer("access_duration_minutes").default(60).notNull(),
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, EXPIRED, REVOKED
  approvedBy: text("approved_by"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


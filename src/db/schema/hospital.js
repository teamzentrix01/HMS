import { pgTable, text, serial, integer, timestamp, boolean, numeric } from "drizzle-orm/pg-core";

export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Jigyasa Super Speciality Hospital"),
  code: text("code").notNull().default("JSSH"),
  tagline: text("tagline").default("Advanced Clinical Care & Excellence"),
  logoUrl: text("logo_url").default("/logo.png"),
  address: text("address").default("Plot 12, Healthcare Knowledge City, Sector 62"),
  city: text("city").default("Noida"),
  state: text("state").default("Uttar Pradesh"),
  postalCode: text("postal_code").default("201309"),
  phone: text("phone").default("+91 120 4567890"),
  emergencyPhone: text("emergency_phone").default("+91 120 4567999"),
  email: text("email").default("contact@jigyasahospital.com"),
  website: text("website").default("https://www.jigyasahospital.com"),
  taxId: text("tax_id").default("GSTIN07AAAAA0000A1Z5"),
  accreditation: text("accreditation").default("NABH / NABL Accredited"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // CLINICAL, DIAGNOSTIC, PHARMACY, ADMINISTRATIVE, SUPPORT
  description: text("description"),
  headOfDepartment: text("head_of_department"),
  phoneExtension: text("phone_extension"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const consultationRooms = pgTable("consultation_rooms", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  roomNumber: text("room_number").notNull(),
  floor: text("floor").default("1st Floor"),
  wing: text("wing").default("OPD Block A"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // GENERAL, SEMI_PRIVATE, PRIVATE, ICU, CCU, NICU, EMERGENCY_OBSERVATION
  floor: text("floor").notNull(),
  wing: text("wing"),
  genderRestriction: text("gender_restriction").default("NONE"), // NONE, MALE_ONLY, FEMALE_ONLY
  totalBeds: integer("total_beds").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  wardId: integer("ward_id").references(() => wards.id).notNull(),
  bedNumber: text("bed_number").notNull(),
  type: text("type").default("STANDARD"), // STANDARD, ICU, VENTILATOR, ISOLATION
  status: text("status").default("AVAILABLE").notNull(), // AVAILABLE, RESERVED, OCCUPIED, CLEANING, MAINTENANCE, ISOLATION, OUT_OF_SERVICE
  dailyCharge: numeric("daily_charge", { precision: 10, scale: 2 }).default("1500.00").notNull(),
  currentPatientId: integer("current_patient_id"),
  currentEncounterId: integer("current_encounter_id"),
  cleaningAssignedTo: text("cleaning_assigned_to"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const operatingRooms = pgTable("operating_rooms", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  roomNumber: text("room_number").notNull(),
  floor: text("floor").default("3rd Floor"),
  status: text("status").default("AVAILABLE").notNull(), // AVAILABLE, PREPARING, IN_SURGERY, RECOVERY, CLEANING, MAINTENANCE
  speciality: text("speciality").default("General & Laparoscopic"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  category: text("category").notNull(), // CONSULTATION, INVESTIGATION, PROCEDURE, BED_CHARGE, NURSING, SURGERY
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tariffs = pgTable("tariffs", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  planName: text("plan_name").notNull(), // STANDARD, INSURANCE_TPA, CORPORATE, GOVERNMENT
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const numberingRules = pgTable("numbering_rules", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull().unique(), // UHID, ENCOUNTER, INVOICE, LAB_SAMPLE, PRESCRIPTION, ADMISSION
  prefix: text("prefix").notNull(),
  currentSequence: integer("current_sequence").default(1000).notNull(),
  padLength: integer("pad_length").default(5).notNull(),
  formatTemplate: text("format_template").notNull(), // e.g. "JGY-{YYYY}-{SEQ}"
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hospitalSettings = pgTable("hospital_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").default("GENERAL").notNull(), // GENERAL, CLINICAL, BILLING, SECURITY, NOTIFICATIONS
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


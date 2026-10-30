import { pgTable, text, serial, integer, timestamp, numeric, boolean, jsonb, date } from "drizzle-orm/pg-core";
import { orders, orderItems } from "./orders.js";
import { patients } from "./clinical.js";
import { users } from "./rbac.js";

// ==========================================
// 1. LABORATORY / LIMS
// ==========================================

export const labTestCatalog = pgTable("lab_test_catalog", {
  id: serial("id").primaryKey(),
  testCode: text("test_code").notNull().unique(), // CBC, CMP, LIPID, TROP_I, LFT, KFT, etc.
  testName: text("test_name").notNull(),
  departmentSection: text("department_section").notNull(), // Hematology, Biochemistry, Microbiology, Pathology
  specimenType: text("specimen_type").notNull(), // EDTA Whole Blood, Serum, Fluoride Plasma, Urine, etc.
  turnaroundTimeMins: integer("turnaround_time_mins").default(60).notNull(),
  referenceRanges: jsonb("reference_ranges").notNull().default([]), // [{ parameter, unit, normalMin, normalMax, panicLow, panicHigh }]
  price: numeric("price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labSpecimens = pgTable("lab_specimens", {
  id: serial("id").primaryKey(),
  barcode: text("barcode").notNull().unique(), // LAB-YYYY-XXXXX
  orderId: integer("order_id").references(() => orders.id).notNull(),
  orderItemId: integer("order_item_id").references(() => orderItems.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  specimenType: text("specimen_type").notNull(),
  collectionStatus: text("collection_status").default("ORDERED").notNull(), // ORDERED, COLLECTED, RECEIVED, PROCESSING, COMPLETED, REJECTED
  collectedById: integer("collected_by_id").references(() => users.id),
  collectedAt: timestamp("collected_at"),
  receivedById: integer("received_by_id").references(() => users.id),
  receivedAt: timestamp("received_at"),
  rejectionReason: text("rejection_reason"),
  recollectionNeeded: boolean("recollection_needed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  orderItemId: integer("order_item_id").references(() => orderItems.id).notNull(),
  specimenId: integer("specimen_id").references(() => labSpecimens.id),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  parameterName: text("parameter_name").notNull(),
  measuredValue: text("measured_value").notNull(),
  unit: text("unit"),
  referenceRange: text("reference_range"),
  isCritical: boolean("is_critical").default(false).notNull(),
  criticalType: text("critical_type").default("NORMAL").notNull(), // NORMAL, HIGH, LOW, PANIC_HIGH, PANIC_LOW
  status: text("status").default("DRAFT").notNull(), // DRAFT, RESULT_ENTERED, VERIFIED, RELEASED, CORRECTION
  technicianId: integer("technician_id").references(() => users.id),
  technicianNotes: text("technician_notes"),
  enteredAt: timestamp("entered_at"),
  verifiedById: integer("verified_by_id").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  isCorrected: boolean("is_corrected").default(false).notNull(),
  correctionReason: text("correction_reason"),
  correctedFromId: integer("corrected_from_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 2. RADIOLOGY / RIS
// ==========================================

export const radiologyModalities = pgTable("radiology_modalities", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // XRAY_01, CT_64, MRI_3T, USG_COLOR, ECG_12L
  name: text("name").notNull(),
  modalityType: text("modality_type").notNull(), // XR, CT, MRI, USG, ECG
  location: text("location").default("Radiology Block Basement"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const radiologyStudies = pgTable("radiology_studies", {
  id: serial("id").primaryKey(),
  accessionNumber: text("accession_number").notNull().unique(), // RAD-YYYY-XXXXX
  orderId: integer("order_id").references(() => orders.id).notNull(),
  orderItemId: integer("order_item_id").references(() => orderItems.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  modalityId: integer("modality_id").references(() => radiologyModalities.id),
  procedureName: text("procedure_name").notNull(),
  status: text("status").default("ORDERED").notNull(), // ORDERED, SCHEDULED, ARRIVED, IN_PROGRESS, COMPLETED, REPORTED, VERIFIED
  scheduledAt: timestamp("scheduled_at"),
  arrivedAt: timestamp("arrived_at"),
  contrastUsed: boolean("contrast_used").default(false).notNull(),
  contrastDetails: text("contrast_details"),
  findings: text("findings"),
  impression: text("impression"),
  keyImages: jsonb("key_images").default([]),
  radiographerId: integer("radiographer_id").references(() => users.id),
  radiologistId: integer("radiologist_id").references(() => users.id),
  reportedAt: timestamp("reported_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


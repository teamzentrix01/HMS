import { pgTable, text, serial, integer, timestamp, numeric, boolean, jsonb, date } from "drizzle-orm/pg-core";
import { patients, encounters, prescriptionItems } from "./clinical.js";
import { departments, wards, beds } from "./hospital.js";
import { users } from "./rbac.js";

// ==========================================
// 1. IPD ADMISSIONS
// ==========================================

export const ipdAdmissions = pgTable("ipd_admissions", {
  id: serial("id").primaryKey(),
  admissionNumber: text("admission_number").notNull().unique(), // IPD-YYYY-XXXXX
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  admissionSource: text("admission_source").notNull(), // OPD_REFERRAL, EMERGENCY, DIRECT_PLANNED, EXTERNAL_TRANSFER
  admittingDoctorId: integer("admitting_doctor_id").references(() => users.id).notNull(),
  primaryConsultantId: integer("primary_consultant_id").references(() => users.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  wardId: integer("ward_id").references(() => wards.id).notNull(),
  bedId: integer("bed_id").references(() => beds.id).notNull(),
  provisionalDiagnosis: text("provisional_diagnosis").notNull(),
  plannedProcedures: text("planned_procedures"),
  dietType: text("diet_type").default("NORMAL").notNull(), // NORMAL, DIABETIC, RENAL, LIQUID, NPO
  admissionDate: timestamp("admission_date").defaultNow().notNull(),
  status: text("status").default("ADMITTED").notNull(), // ADMITTED, TRANSFERRED, DISCHARGED, LAMA, DECEASED
  dischargeDate: timestamp("discharge_date"),
  dischargeType: text("discharge_type"), // ROUTINE, LAMA, TRANSFER, DECEASED
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 2. IPD TRANSFERS (Bed / Ward / Consultant)
// ==========================================

export const ipdTransfers = pgTable("ipd_transfers", {
  id: serial("id").primaryKey(),
  admissionId: integer("admission_id").references(() => ipdAdmissions.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  transferType: text("transfer_type").notNull(), // BED_TRANSFER, WARD_TRANSFER, CONSULTANT_TRANSFER
  fromWardId: integer("from_ward_id").references(() => wards.id),
  fromBedId: integer("from_bed_id").references(() => beds.id),
  toWardId: integer("to_ward_id").references(() => wards.id),
  toBedId: integer("to_bed_id").references(() => beds.id),
  fromDoctorId: integer("from_doctor_id").references(() => users.id),
  toDoctorId: integer("to_doctor_id").references(() => users.id),
  reason: text("reason").notNull(),
  handoverNotes: text("handover_notes"),
  transferredById: integer("transferred_by_id").references(() => users.id).notNull(),
  transferredAt: timestamp("transferred_at").defaultNow().notNull(),
});

// ==========================================
// 3. eMAR (Electronic Medication Administration Record)
// ==========================================

export const emarRecords = pgTable("emar_records", {
  id: serial("id").primaryKey(),
  admissionId: integer("admission_id").references(() => ipdAdmissions.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  prescriptionItemId: integer("prescription_item_id").references(() => prescriptionItems.id),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  route: text("route").notNull(), // ORAL, IV, IM, SC, INHALATION, TOPICAL
  scheduledTime: timestamp("scheduled_time").notNull(),
  administeredTime: timestamp("administered_time"),
  administeredById: integer("administered_by_id").references(() => users.id),
  status: text("status").default("SCHEDULED").notNull(), // SCHEDULED, GIVEN, HELD, REFUSED, MISSED
  heldReason: text("held_reason"),
  preAdministrationVitals: text("pre_administration_vitals"), // BP/HR checks prior to admin
  clinicalNotes: text("clinical_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 4. NURSING CARE NOTES & FLUID BALANCE
// ==========================================

export const nursingCareNotes = pgTable("nursing_care_notes", {
  id: serial("id").primaryKey(),
  admissionId: integer("admission_id").references(() => ipdAdmissions.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  recordedById: integer("recorded_by_id").references(() => users.id).notNull(),
  shift: text("shift").notNull(), // MORNING, EVENING, NIGHT
  intakeOralMl: integer("intake_oral_ml").default(0).notNull(),
  intakeIvMl: integer("intake_iv_ml").default(0).notNull(),
  outputUrineMl: integer("output_urine_ml").default(0).notNull(),
  outputDrainMl: integer("output_drain_ml").default(0).notNull(),
  fluidBalanceMl: integer("fluid_balance_ml").default(0).notNull(),
  fallRiskScore: integer("fall_risk_score").default(0).notNull(),
  painScore: integer("pain_score").default(0).notNull(),
  cannulaSite: text("cannula_site").default("Left Forearm (Healthy)"),
  sbarHandover: text("sbar_handover"), // Situation, Background, Assessment, Recommendation
  nursingSummary: text("nursing_summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 5. DISCHARGE SUMMARIES
// ==========================================

export const dischargeSummaries = pgTable("discharge_summaries", {
  id: serial("id").primaryKey(),
  admissionId: integer("admission_id").references(() => ipdAdmissions.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  dischargedById: integer("discharged_by_id").references(() => users.id).notNull(),
  dischargeType: text("discharge_type").notNull(), // ROUTINE, LAMA, TRANSFER, DECEASED
  admissionDiagnosis: text("admission_diagnosis").notNull(),
  finalDiagnosis: text("final_diagnosis").notNull(),
  icd10Codes: text("icd10_codes"),
  hospitalCourse: text("hospital_course").notNull(),
  proceduresPerformed: text("procedures_performed"),
  conditionAtDischarge: text("condition_at_discharge").notNull(), // STABLE, IMPROVED, CRITICAL, EXPIRED
  dischargeMedications: jsonb("discharge_medications").default([]),
  dietAndLifestyleAdvice: text("diet_and_lifestyle_advice"),
  followUpDate: date("follow_up_date"),
  emergencyWarningSigns: text("emergency_warning_signs"),
  isSigned: boolean("is_signed").default(false).notNull(),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


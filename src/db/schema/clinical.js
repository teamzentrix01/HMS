import { pgTable, text, serial, integer, timestamp, boolean, numeric, date } from "drizzle-orm/pg-core";
import { departments } from "./hospital.js";
import { users } from "./rbac.js";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  uhid: text("uhid").notNull().unique(), // JGY-YYYY-XXXXX
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(), // MALE, FEMALE, OTHER
  bloodGroup: text("blood_group"), // A+, B+, AB+, O+, A-, B-, AB-, O-
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  city: text("city").default("Noida"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  nationalIdNumber: text("national_id_number"), // Aadhaar / National ID
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, INACTIVE, DECEASED
  mergedWithUhid: text("merged_with_uhid"),
  isUnknownEmergency: boolean("is_unknown_emergency").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientAllergies = pgTable("patient_allergies", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  allergen: text("allergen").notNull(),
  severity: text("severity").notNull(), // MILD, MODERATE, SEVERE, LIFE_THREATENING
  reaction: text("reaction"),
  diagnosedAt: timestamp("diagnosed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patientConditions = pgTable("patient_conditions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  conditionName: text("condition_name").notNull(),
  icdCode: text("icd_code"),
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, RESOLVED, CHRONIC
  diagnosedAt: timestamp("diagnosed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const encounters = pgTable("encounters", {
  id: serial("id").primaryKey(),
  encounterNumber: text("encounter_number").notNull().unique(), // ENC-YYYY-XXXXX
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterType: text("encounter_type").notNull(), // OPD, IPD, EMERGENCY
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id),
  status: text("status").default("CHECKED_IN").notNull(), // SCHEDULED, CHECKED_IN, WAITING, IN_CONSULTATION, ADMITTED, COMPLETED, DISCHARGED, CANCELLED
  triageLevel: text("triage_level"), // RED, ORANGE, YELLOW, GREEN, BLUE
  chiefComplaint: text("chief_complaint"),
  clinicalNotes: text("clinical_notes"),
  arrivalTime: timestamp("arrival_time").defaultNow().notNull(),
  dischargeTime: timestamp("discharge_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  appointmentNumber: text("appointment_number").notNull().unique(), // APT-YYYY-XXXXX
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(), // e.g. "10:15 AM"
  visitType: text("visit_type").default("NEW").notNull(), // NEW, FOLLOW_UP, REFERRAL, SECOND_OPINION
  status: text("status").default("SCHEDULED").notNull(), // SCHEDULED, CHECKED_IN, WAITING, IN_CONSULTATION, COMPLETED, CANCELLED, NO_SHOW
  tokenNumber: text("token_number"), // e.g. "CARD-001"
  chiefComplaint: text("chief_complaint"),
  notes: text("notes"),
  checkedInAt: timestamp("checked_in_at"),
  consultationStartedAt: timestamp("consultation_started_at"),
  consultationEndedAt: timestamp("consultation_ended_at"),
  encounterId: integer("encounter_id").references(() => encounters.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vitals = pgTable("vitals", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  recordedBy: integer("recorded_by").references(() => users.id).notNull(),
  systolicBp: integer("systolic_bp"),
  diastolicBp: integer("diastolic_bp"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  temperatureCelsius: numeric("temperature_celsius", { precision: 4, scale: 1 }),
  spo2Percent: integer("spo2_percent"),
  painScore: integer("pain_score"), // 0 - 10
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  heightCm: numeric("height_cm", { precision: 5, scale: 2 }),
  bmi: numeric("bmi", { precision: 4, scale: 1 }),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const consultationNotes = pgTable("consultation_notes", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  primaryDiagnosis: text("primary_diagnosis"),
  secondaryDiagnosis: text("secondary_diagnosis"),
  followUpDate: date("follow_up_date"),
  followUpInstructions: text("follow_up_instructions"),
  admissionRequested: boolean("admission_requested").default(false).notNull(),
  admissionWardType: text("admission_ward_type"),
  referralDepartmentId: integer("referral_department_id").references(() => departments.id),
  isSigned: boolean("is_signed").default(false).notNull(),
  signedAt: timestamp("signed_at"),
  isAmendment: boolean("is_amendment").default(false).notNull(),
  amendedFromId: integer("amended_from_id"),
  amendmentReason: text("amendment_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  prescriptionNumber: text("prescription_number").notNull().unique(), // RX-YYYY-XXXXX
  encounterId: integer("encounter_id").references(() => encounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => users.id).notNull(),
  status: text("status").default("DRAFT").notNull(), // DRAFT, SIGNED, DISPENSED, CANCELLED
  instructions: text("instructions"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prescriptionItems = pgTable("prescription_items", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id, { onDelete: "cascade" }).notNull(),
  medicationName: text("medication_name").notNull(),
  genericName: text("generic_name"),
  dosage: text("dosage").notNull(), // e.g. "500 mg"
  route: text("route").default("ORAL").notNull(), // ORAL, IV, IM, SUBLINGUAL, TOPICAL, INHALATION
  frequency: text("frequency").notNull(), // "1-0-1", "Once Daily", "TID", "SOS"
  duration: text("duration").notNull(), // "5 days", "14 days", "1 month"
  instructions: text("instructions"), // "After meals", "Before bed"
  dispenseStatus: text("dispense_status").default("PENDING").notNull(), // PENDING, DISPENSED, SUBSTITUTED
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

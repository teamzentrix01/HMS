export const ROLES = {
  SUPER_ADMIN: "super_admin",
  HOSPITAL_ADMIN: "hospital_admin",
  DOCTOR: "doctor",
  RESIDENT_DOCTOR: "resident_doctor",
  EMERGENCY_DOCTOR: "emergency_doctor",
  NURSE: "nurse",
  RECEPTIONIST: "receptionist",
  LAB_TECH: "lab_tech",
  PATHOLOGIST: "pathologist",
  PHARMACIST: "pharmacist",
  CASHIER: "cashier",
};

export const ACTIONS = {
  VIEW: "VIEW",
  CREATE: "CREATE",
  EDIT: "EDIT",
  DELETE: "DELETE",
  SIGN: "SIGN",
  VERIFY: "VERIFY",
  DISPENSE: "DISPENSE",
  APPROVE: "APPROVE",
  ADMIN: "ADMIN",
  BREAK_GLASS: "BREAK_GLASS",
};

export const RESOURCES = {
  DEPARTMENTS: "departments",
  SETTINGS: "settings",
  WARDS: "wards",
  BEDS: "beds",
  SERVICES: "services",
  STAFF: "staff",
  PATIENT_DEMOGRAPHICS: "patient_demographics",
  CLINICAL_NOTES: "clinical_notes",
  VITALS: "vitals",
  ORDERS: "orders",
  LAB_RESULTS: "lab_results",
  PRESCRIPTIONS: "prescriptions",
  INVOICES: "invoices",
  PAYMENTS: "payments",
  AUDIT_LOGS: "audit_logs",
  BREAK_GLASS: "break_glass",
};

// Base permission map per role
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    wildcard: true,
  },
  [ROLES.HOSPITAL_ADMIN]: {
    allowed: [
      { resource: RESOURCES.DEPARTMENTS, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.SETTINGS, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.WARDS, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.BEDS, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.SERVICES, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.STAFF, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.AUDIT_LOGS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.PATIENT_DEMOGRAPHICS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.INVOICES, actions: [ACTIONS.VIEW, ACTIONS.APPROVE] },
    ],
    prohibited: [
      { resource: RESOURCES.CLINICAL_NOTES, actions: [ACTIONS.EDIT, ACTIONS.SIGN] },
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.CREATE, ACTIONS.EDIT] },
    ],
  },
  [ROLES.DOCTOR]: {
    allowed: [
      { resource: RESOURCES.PATIENT_DEMOGRAPHICS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.CLINICAL_NOTES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.SIGN] },
      { resource: RESOURCES.VITALS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.ORDERS, actions: [ACTIONS.VIEW, ACTIONS.CREATE] },
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.SIGN] },
      { resource: RESOURCES.LAB_RESULTS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.BEDS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.BREAK_GLASS, actions: [ACTIONS.CREATE] },
    ],
    prohibited: [
      { resource: RESOURCES.INVOICES, actions: [ACTIONS.EDIT, ACTIONS.APPROVE] },
      { resource: RESOURCES.LAB_RESULTS, actions: [ACTIONS.VERIFY] },
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.DISPENSE] },
    ],
  },
  [ROLES.NURSE]: {
    allowed: [
      { resource: RESOURCES.PATIENT_DEMOGRAPHICS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.VITALS, actions: [ACTIONS.VIEW, ACTIONS.CREATE] },
      { resource: RESOURCES.CLINICAL_NOTES, actions: [ACTIONS.VIEW, ACTIONS.CREATE] }, // Nursing notes only
      { resource: RESOURCES.ORDERS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.VIEW] }, // for eMAR
      { resource: RESOURCES.BEDS, actions: [ACTIONS.VIEW, ACTIONS.EDIT] }, // bed status & cleaning updates
      { resource: RESOURCES.BREAK_GLASS, actions: [ACTIONS.CREATE] },
    ],
    prohibited: [
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.CREATE, ACTIONS.SIGN] },
      { resource: RESOURCES.INVOICES, actions: [ACTIONS.CREATE, ACTIONS.EDIT] },
      { resource: RESOURCES.LAB_RESULTS, actions: [ACTIONS.VERIFY] },
    ],
  },
  [ROLES.RECEPTIONIST]: {
    allowed: [
      { resource: RESOURCES.PATIENT_DEMOGRAPHICS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
      { resource: RESOURCES.ORDERS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.BEDS, actions: [ACTIONS.VIEW] },
    ],
    prohibited: [
      { resource: RESOURCES.CLINICAL_NOTES, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.LAB_RESULTS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.VIEW] },
    ],
  },
  [ROLES.LAB_TECH]: {
    allowed: [
      { resource: RESOURCES.ORDERS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.LAB_RESULTS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
    ],
    prohibited: [
      { resource: RESOURCES.CLINICAL_NOTES, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.INVOICES, actions: [ACTIONS.EDIT] },
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.DISPENSE] },
    ],
  },
  [ROLES.PHARMACIST]: {
    allowed: [
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.VIEW, ACTIONS.DISPENSE] },
      { resource: RESOURCES.ORDERS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.SERVICES, actions: [ACTIONS.VIEW] },
    ],
    prohibited: [
      { resource: RESOURCES.CLINICAL_NOTES, actions: [ACTIONS.EDIT, ACTIONS.SIGN] },
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.CREATE, ACTIONS.SIGN] },
    ],
  },
  [ROLES.CASHIER]: {
    allowed: [
      { resource: RESOURCES.INVOICES, actions: [ACTIONS.VIEW, ACTIONS.CREATE] },
      { resource: RESOURCES.PAYMENTS, actions: [ACTIONS.VIEW, ACTIONS.CREATE] },
      { resource: RESOURCES.SERVICES, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.PATIENT_DEMOGRAPHICS, actions: [ACTIONS.VIEW] },
    ],
    prohibited: [
      { resource: RESOURCES.CLINICAL_NOTES, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { resource: RESOURCES.LAB_RESULTS, actions: [ACTIONS.VIEW] },
      { resource: RESOURCES.PRESCRIPTIONS, actions: [ACTIONS.DISPENSE] },
    ],
  },
};


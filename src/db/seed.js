import bcrypt from "bcryptjs";
import pg from "pg";
const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:%40Vivek123@localhost:5432/jigyasa_hms";

const pool = new Pool({ connectionString });

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log("Starting Jigyasa HMS Phase 1 Seeding...");
    await client.query("BEGIN;");

    // 1. Hospital Master
    const hospRes = await client.query(`
      INSERT INTO hospitals (name, code, tagline, logo_url, address, city, state, postal_code, phone, emergency_phone, email, website, tax_id, accreditation)
      VALUES (
        'Jigyasa Super Speciality Hospital',
        'JSSH',
        'Advanced Clinical Care & Excellence',
        '/logo.png',
        'Plot 12, Healthcare Knowledge City, Sector 62',
        'Noida',
        'Uttar Pradesh',
        '201309',
        '+91 120 4567890',
        '+91 120 4567999',
        'contact@jigyasahospital.com',
        'https://www.jigyasahospital.com',
        'GSTIN07AAAAA0000A1Z5',
        'NABH & NABL Accredited Center of Clinical Excellence'
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    const hospitalId = hospRes.rows[0]?.id || 1;

    // 2. Branch
    const branchRes = await client.query(`
      INSERT INTO branches (hospital_id, name, code, address, phone, is_active)
      VALUES (
        ${hospitalId},
        'Main Super Speciality Campus - Sector 62',
        'JSSH-MAIN',
        'Plot 12, Sector 62, Noida, NCR',
        '+91 120 4567890',
        TRUE
      )
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const branchId = branchRes.rows[0]?.id || 1;

    // 3. Departments
    const deptData = [
      { name: "Emergency & Trauma Care", code: "EMERG", type: "CLINICAL", desc: "24x7 Level-1 Emergency & Trauma Care Unit", hod: "Dr. Vikram Sethi", ext: "100" },
      { name: "Cardiology & Cardiac Surgery", code: "CARDIO", type: "CLINICAL", desc: "Comprehensive Invasive & Non-Invasive Cardiac Care", hod: "Dr. Arvind Kejriwal", ext: "101" },
      { name: "Neurology & Neurosurgery", code: "NEURO", type: "CLINICAL", desc: "Brain, Spine and Advanced Neuro-vascular Care", hod: "Dr. Neha Saxena", ext: "102" },
      { name: "Orthopedics & Joint Replacement", code: "ORTHO", type: "CLINICAL", desc: "Arthroscopy, Trauma and Total Joint Replacements", hod: "Dr. Rajeshwar Rao", ext: "103" },
      { name: "Internal Medicine & Critical Care", code: "MED", type: "CLINICAL", desc: "Multisystem Internal Diseases & Intensive Care", hod: "Dr. Sunita Kapoor", ext: "104" },
      { name: "General & Laparoscopic Surgery", code: "SURG", type: "CLINICAL", desc: "Minimally Invasive General & GI Surgeries", hod: "Dr. Alok Verma", ext: "105" },
      { name: "Pediatrics & Neonatology", code: "PED", type: "CLINICAL", desc: "Child Wellness, Pediatric ICU and NICU Care", hod: "Dr. Pooja Iyer", ext: "106" },
      { name: "Radiology & Diagnostic Imaging", code: "RAD", type: "DIAGNOSTIC", desc: "3T MRI, 128-Slice CT, 4D Ultrasound, Digital X-Ray", hod: "Dr. Manish Mehra", ext: "201" },
      { name: "Pathology & Clinical Biochemistry", code: "LAB", type: "DIAGNOSTIC", desc: "NABL Certified Hematology, Histopathology & Molecular Lab", hod: "Dr. Rashmi Deshmukh", ext: "202" },
      { name: "Central Hospital Pharmacy", code: "PHARM", type: "PHARMACY", desc: "24x7 Outpatient & Inpatient Pharmacotherapy Dispensing", hod: "Mr. Suresh Gupta", ext: "301" },
      { name: "Inpatient Nursing Services", code: "NURSE", type: "SUPPORT", desc: "Ward, Critical Care & Perioperative Nursing Care", hod: "Ms. Anita George", ext: "401" },
      { name: "Patient Accounts & Billing", code: "BILL", type: "ADMINISTRATIVE", desc: "Registration, Insurance/TPA Claims & Discharge Billing", hod: "Mr. Dinesh Pandey", ext: "501" },
      { name: "Hospital Administration & Governance", code: "ADMIN", type: "ADMINISTRATIVE", desc: "Executive Leadership, Operations & Quality Standards", hod: "Dr. S. K. Jigyasa", ext: "900" },
    ];

    const departmentMap = {};
    for (const d of deptData) {
      const res = await client.query(`
        INSERT INTO departments (branch_id, name, code, type, description, head_of_department, phone_extension, is_active)
        VALUES (${branchId}, '${d.name}', '${d.code}', '${d.type}', '${d.desc}', '${d.hod}', '${d.ext}', TRUE)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, code;
      `);
      departmentMap[res.rows[0].code] = res.rows[0].id;
    }

    // 4. Units
    const unitsData = [
      { deptCode: "CARDIO", name: "Coronary Care Unit (CCU)", code: "CCU-1" },
      { deptCode: "MED", name: "Medical Intensive Care Unit (MICU)", code: "MICU-1" },
      { deptCode: "SURG", name: "Surgical Intensive Care Unit (SICU)", code: "SICU-1" },
      { deptCode: "PED", name: "Neonatal Intensive Care Unit (NICU)", code: "NICU-1" },
      { deptCode: "EMERG", name: "Triage & Resuscitation Unit", code: "TRIAGE-1" },
    ];
    for (const u of unitsData) {
      const dId = departmentMap[u.deptCode];
      if (dId) {
        await client.query(`
          INSERT INTO units (department_id, name, code, is_active)
          VALUES (${dId}, '${u.name}', '${u.code}', TRUE)
          ON CONFLICT DO NOTHING;
        `);
      }
    }

    // 5. Consultation Rooms
    const roomsData = [
      { deptCode: "CARDIO", room: "OPD-101", floor: "1st Floor", wing: "Heart Care Wing" },
      { deptCode: "NEURO", room: "OPD-102", floor: "1st Floor", wing: "Neuro Wing" },
      { deptCode: "ORTHO", room: "OPD-103", floor: "1st Floor", wing: "Surgical Wing" },
      { deptCode: "MED", room: "OPD-104", floor: "1st Floor", wing: "Medical Wing" },
      { deptCode: "PED", room: "OPD-105", floor: "Ground Floor", wing: "Child Health Wing" },
      { deptCode: "SURG", room: "OPD-106", floor: "1st Floor", wing: "Surgical Wing" },
    ];
    for (const r of roomsData) {
      const dId = departmentMap[r.deptCode];
      if (dId) {
        await client.query(`
          INSERT INTO consultation_rooms (department_id, room_number, floor, wing, is_active)
          VALUES (${dId}, '${r.room}', '${r.floor}', '${r.wing}', TRUE)
          ON CONFLICT DO NOTHING;
        `);
      }
    }

    // 6. Wards
    const wardsData = [
      { name: "Emergency Observation Ward", code: "WARD-EMG", type: "EMERGENCY_OBSERVATION", floor: "Ground Floor", wing: "Emergency Block", beds: 10 },
      { name: "Medical Intensive Care Unit (ICU)", code: "WARD-ICU", type: "ICU", floor: "2nd Floor", wing: "Critical Care Tower", beds: 12 },
      { name: "Coronary Care Unit (CCU)", code: "WARD-CCU", type: "CCU", floor: "2nd Floor", wing: "Critical Care Tower", beds: 8 },
      { name: "General Medical Ward (Male)", code: "WARD-GM-M", type: "GENERAL", floor: "3rd Floor", wing: "Wing A", beds: 16 },
      { name: "General Medical Ward (Female)", code: "WARD-GM-F", type: "GENERAL", floor: "3rd Floor", wing: "Wing B", beds: 16 },
      { name: "Super Deluxe Private Suites", code: "WARD-PVT", type: "PRIVATE", floor: "4th Floor", wing: "Executive Suite Wing", beds: 8 },
    ];

    const wardMap = {};
    for (const w of wardsData) {
      const res = await client.query(`
        INSERT INTO wards (branch_id, name, code, type, floor, wing, total_beds, is_active)
        VALUES (${branchId}, '${w.name}', '${w.code}', '${w.type}', '${w.floor}', '${w.wing}', ${w.beds}, TRUE)
        ON CONFLICT (code) DO UPDATE SET total_beds = EXCLUDED.total_beds
        RETURNING id, code;
      `);
      wardMap[res.rows[0].code] = res.rows[0].id;
    }

    // 7. Beds
    const bedsToCreate = [
      { ward: "WARD-EMG", bed: "EMG-01", type: "MONITORING", status: "AVAILABLE", charge: 2500 },
      { ward: "WARD-EMG", bed: "EMG-02", type: "MONITORING", status: "OCCUPIED", charge: 2500 },
      { ward: "WARD-EMG", bed: "EMG-03", type: "MONITORING", status: "AVAILABLE", charge: 2500 },
      { ward: "WARD-ICU", bed: "ICU-101", type: "VENTILATOR", status: "OCCUPIED", charge: 8500 },
      { ward: "WARD-ICU", bed: "ICU-102", type: "VENTILATOR", status: "AVAILABLE", charge: 8500 },
      { ward: "WARD-ICU", bed: "ICU-103", type: "STANDARD", status: "CLEANING", charge: 7500 },
      { ward: "WARD-CCU", bed: "CCU-201", type: "VENTILATOR", status: "AVAILABLE", charge: 9000 },
      { ward: "WARD-CCU", bed: "CCU-202", type: "STANDARD", status: "OCCUPIED", charge: 8000 },
      { ward: "WARD-GM-M", bed: "GWM-301", type: "STANDARD", status: "AVAILABLE", charge: 1500 },
      { ward: "WARD-GM-M", bed: "GWM-302", type: "STANDARD", status: "AVAILABLE", charge: 1500 },
      { ward: "WARD-GM-M", bed: "GWM-303", type: "STANDARD", status: "OCCUPIED", charge: 1500 },
      { ward: "WARD-GM-F", bed: "GWF-311", type: "STANDARD", status: "AVAILABLE", charge: 1500 },
      { ward: "WARD-GM-F", bed: "GWF-312", type: "STANDARD", status: "RESERVED", charge: 1500 },
      { ward: "WARD-PVT", bed: "PVT-401", type: "STANDARD", status: "AVAILABLE", charge: 4500 },
      { ward: "WARD-PVT", bed: "PVT-402", type: "STANDARD", status: "OCCUPIED", charge: 4500 },
    ];

    for (const b of bedsToCreate) {
      const wId = wardMap[b.ward];
      if (wId) {
        await client.query(`
          INSERT INTO beds (ward_id, bed_number, type, status, daily_charge, is_active)
          VALUES (${wId}, '${b.bed}', '${b.type}', '${b.status}', ${b.charge}, TRUE)
          ON CONFLICT DO NOTHING;
        `);
      }
    }

    // 8. Operating Rooms
    const ots = [
      { name: "Cardiac Surgery Theatre", code: "OT-CARDIO", room: "OT-301", floor: "3rd Floor", status: "AVAILABLE", spec: "Open Heart & CABG" },
      { name: "Neuro-Navigation Theatre", code: "OT-NEURO", room: "OT-302", floor: "3rd Floor", status: "AVAILABLE", spec: "Craniotomy & Spine" },
      { name: "Laparoscopy & GI Theatre", code: "OT-LAP", room: "OT-303", floor: "3rd Floor", status: "AVAILABLE", spec: "Minimally Invasive" },
      { name: "Emergency Trauma OT", code: "OT-EMG", room: "OT-001", floor: "Ground Floor", status: "AVAILABLE", spec: "Emergency Polytrauma" },
    ];
    for (const o of ots) {
      await client.query(`
        INSERT INTO operating_rooms (branch_id, name, code, room_number, floor, status, speciality, is_active)
        VALUES (${branchId}, '${o.name}', '${o.code}', '${o.room}', '${o.floor}', '${o.status}', '${o.spec}', TRUE)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
      `);
    }

    // 9. Services & Tariffs
    const servicesData = [
      { name: "OPD Consultation - General Physician", code: "SRV-OPD-GEN", cat: "CONSULTATION", price: 800, dept: "MED" },
      { name: "OPD Super-Specialist Consultation", code: "SRV-OPD-SPEC", cat: "CONSULTATION", price: 1500, dept: "CARDIO" },
      { name: "Emergency Triage & Resuscitation", code: "SRV-EMG-TRIAGE", cat: "PROCEDURE", price: 2500, dept: "EMERG" },
      { name: "Complete Blood Count (CBC) with ESR", code: "SRV-LAB-CBC", cat: "INVESTIGATION", price: 450, dept: "LAB" },
      { name: "Comprehensive Metabolic Panel (CMP)", code: "SRV-LAB-CMP", cat: "INVESTIGATION", price: 1200, dept: "LAB" },
      { name: "Lipid Profile Full Panel", code: "SRV-LAB-LIPID", cat: "INVESTIGATION", price: 850, dept: "LAB" },
      { name: "Cardiac Troponin-I Quantitative", code: "SRV-LAB-TROP", cat: "INVESTIGATION", price: 1400, dept: "LAB" },
      { name: "Digital Chest X-Ray PA View", code: "SRV-RAD-XRAY", cat: "INVESTIGATION", price: 750, dept: "RAD" },
      { name: "12-Lead Electrocardiogram (ECG)", code: "SRV-CARD-ECG", cat: "INVESTIGATION", price: 600, dept: "CARDIO" },
      { name: "2D Echocardiography with Color Doppler", code: "SRV-CARD-ECHO", cat: "INVESTIGATION", price: 2800, dept: "CARDIO" },
      { name: "ICU Bed Daily Tariff", code: "SRV-BED-ICU", cat: "BED_CHARGE", price: 8500, dept: "NURSE" },
      { name: "General Ward Bed Daily Tariff", code: "SRV-BED-GEN", cat: "BED_CHARGE", price: 1500, dept: "NURSE" },
      { name: "Private Suite Bed Daily Tariff", code: "SRV-BED-PVT", cat: "BED_CHARGE", price: 4500, dept: "NURSE" },
    ];

    for (const s of servicesData) {
      const dId = departmentMap[s.dept];
      const sRes = await client.query(`
        INSERT INTO services (department_id, name, code, category, base_price, tax_percent, is_active)
        VALUES (${dId || "NULL"}, '${s.name}', '${s.code}', '${s.cat}', ${s.price}, 0.00, TRUE)
        ON CONFLICT (code) DO UPDATE SET base_price = EXCLUDED.base_price
        RETURNING id;
      `);
      const sId = sRes.rows[0].id;
      // Add standard tariff
      await client.query(`
        INSERT INTO tariffs (service_id, plan_name, rate, effective_from, is_active)
        VALUES (${sId}, 'STANDARD', ${s.price}, CURRENT_TIMESTAMP, TRUE)
        ON CONFLICT DO NOTHING;
      `);
      // Add insurance tariff (10% negotiated discount)
      await client.query(`
        INSERT INTO tariffs (service_id, plan_name, rate, effective_from, is_active)
        VALUES (${sId}, 'INSURANCE_TPA', ${Math.round(s.price * 0.9)}, CURRENT_TIMESTAMP, TRUE)
        ON CONFLICT DO NOTHING;
      `);
    }

    // 10. Numbering Rules
    const numbering = [
      { type: "UHID", prefix: "JGY", seq: 1005, pad: 5, template: "JGY-{YYYY}-{SEQ}" },
      { type: "ENCOUNTER", prefix: "ENC", seq: 2005, pad: 5, template: "ENC-{YYYY}-{SEQ}" },
      { type: "INVOICE", prefix: "INV", seq: 5001, pad: 5, template: "INV-{YYYY}-{SEQ}" },
      { type: "LAB_SAMPLE", prefix: "LAB", seq: 3001, pad: 5, template: "LAB-{YYYY}-{SEQ}" },
      { type: "PRESCRIPTION", prefix: "RX", seq: 4001, pad: 5, template: "RX-{YYYY}-{SEQ}" },
      { type: "ADMISSION", prefix: "ADM", seq: 101, pad: 4, template: "ADM-{YYYY}-{SEQ}" },
    ];
    for (const n of numbering) {
      await client.query(`
        INSERT INTO numbering_rules (entity_type, prefix, current_sequence, pad_length, format_template)
        VALUES ('${n.type}', '${n.prefix}', ${n.seq}, ${n.pad}, '${n.template}')
        ON CONFLICT (entity_type) DO UPDATE SET prefix = EXCLUDED.prefix, format_template = EXCLUDED.format_template;
      `);
    }

    // 11. Hospital Settings
    const settings = [
      { key: "HOSPITAL_NAME", value: "Jigyasa Super Speciality Hospital", cat: "GENERAL", desc: "Official registered facility name" },
      { key: "EMERGENCY_CODE_BLUE", value: "+91 120 4567999", cat: "CLINICAL", desc: "Emergency crash cart and resuscitation direct extension" },
      { key: "OPD_SLOT_MINUTES", value: "15", cat: "CLINICAL", desc: "Default OPD doctor consultation time slot in minutes" },
      { key: "AUTO_CHARGE_ELIGIBILITY", value: "ENABLED", cat: "BILLING", desc: "Automatically enqueue billing item upon service completion" },
      { key: "BREAK_GLASS_TIMEOUT_HOURS", value: "2", cat: "SECURITY", desc: "Maximum validity period for emergency break-glass privilege elevation" },
      { key: "MFA_FOR_ADMINS", value: "ENABLED", cat: "SECURITY", desc: "Require multi-factor authentication for administrative personnel" },
      { key: "SYSTEM_CURRENCY", value: "INR", cat: "GENERAL", desc: "Hospital base accounting currency symbol (₹ / INR)" },
    ];
    for (const st of settings) {
      await client.query(`
        INSERT INTO hospital_settings (key, value, category, description, is_system)
        VALUES ('${st.key}', '${st.value}', '${st.cat}', '${st.desc}', TRUE)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `);
    }

    // 12. Roles
    const rolesData = [
      { name: "Super Administrator", slug: "super_admin", desc: "Hospital Enterprise Super Administrator with unrestricted governance access" },
      { name: "Hospital Administrator", slug: "hospital_admin", desc: "Operational hospital management, masters, staff, and departments" },
      { name: "Consultant Doctor", slug: "doctor", desc: "Attending consultant clinician for OPD, IPD, and surgical orders" },
      { name: "Resident Doctor", slug: "resident_doctor", desc: "Junior medical officer and ward resident" },
      { name: "Emergency Doctor", slug: "emergency_doctor", desc: "Trauma and emergency room attending clinician" },
      { name: "Nursing Officer", slug: "nurse", desc: "Ward and ICU nursing officer for vitals, eMAR, and care plans" },
      { name: "Receptionist / Front Desk", slug: "receptionist", desc: "Patient registration, appointment scheduling, and OPD token generation" },
      { name: "Laboratory Technician", slug: "lab_tech", desc: "Specimen intake, laboratory analysis, and test results processing" },
      { name: "Pathologist", slug: "pathologist", desc: "Laboratory verification, sign-off and critical result reporting" },
      { name: "Hospital Pharmacist", slug: "pharmacist", desc: "Medication review, dispensing, inventory management, and batch tracking" },
      { name: "Billing Executive / Cashier", slug: "cashier", desc: "Invoice generation, payment receipts, deposit collections, and refunds" },
    ];

    const roleMap = {};
    for (const r of rolesData) {
      const res = await client.query(`
        INSERT INTO roles (name, slug, description, is_system)
        VALUES ('${r.name}', '${r.slug}', '${r.desc}', TRUE)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, slug;
      `);
      roleMap[res.rows[0].slug] = res.rows[0].id;
    }

    // 13. Permissions
    const permList = [
      // Admin
      { module: "admin", action: "VIEW", res: "departments", desc: "View hospital departments and units" },
      { module: "admin", action: "EDIT", res: "departments", desc: "Create or modify hospital departments" },
      { module: "admin", action: "VIEW", res: "settings", desc: "View hospital global configurations" },
      { module: "admin", action: "EDIT", res: "settings", desc: "Update hospital global configurations" },
      { module: "admin", action: "VIEW", res: "wards", desc: "View hospital wards and beds" },
      { module: "admin", action: "EDIT", res: "wards", desc: "Manage hospital wards and beds" },
      { module: "admin", action: "VIEW", res: "services", desc: "View services and tariffs" },
      { module: "admin", action: "EDIT", res: "services", desc: "Manage services and tariffs" },
      // Patient & Registration
      { module: "patient", action: "CREATE", res: "patient", desc: "Register new patient and issue UHID" },
      { module: "patient", action: "VIEW", res: "patient", desc: "Search and view patient demographics" },
      { module: "patient", action: "EDIT", res: "patient", desc: "Edit patient demographics" },
      // Appointments & Queue
      { module: "opd", action: "CREATE", res: "appointment", desc: "Book appointment" },
      { module: "opd", action: "VIEW", res: "queue", desc: "View OPD queue and token status" },
      { module: "opd", action: "EDIT", res: "checkin", desc: "Check in patient and issue token" },
      // Clinical & Consultation
      { module: "clinical", action: "VIEW", res: "history", desc: "View patient medical history" },
      { module: "clinical", action: "CREATE", res: "consultation", desc: "Create clinical consultation note" },
      { module: "clinical", action: "SIGN", res: "consultation", desc: "Digitally sign consultation note" },
      { module: "clinical", action: "CREATE", res: "order", desc: "Place lab, radiology, pharmacy orders" },
      // Nursing
      { module: "nursing", action: "VIEW", res: "patients", desc: "View assigned ward patients" },
      { module: "nursing", action: "CREATE", res: "vitals", desc: "Record clinical vital signs" },
      { module: "nursing", action: "EDIT", res: "emar", desc: "Record medication administration" },
      // Lab
      { module: "lab", action: "VIEW", res: "orders", desc: "View laboratory order worklist" },
      { module: "lab", action: "EDIT", res: "results", desc: "Enter laboratory test results" },
      { module: "lab", action: "SIGN", res: "results", desc: "Verify and release laboratory results" },
      // Pharmacy
      { module: "pharmacy", action: "VIEW", res: "orders", desc: "View pharmacy prescription queue" },
      { module: "pharmacy", action: "DISPENSE", res: "medication", desc: "Dispense medication and deduct inventory" },
      // Billing
      { module: "billing", action: "VIEW", res: "invoices", desc: "View billing and invoices" },
      { module: "billing", action: "CREATE", res: "payment", desc: "Collect payments and issue receipts" },
      { module: "billing", action: "APPROVE", res: "discount", desc: "Approve invoice discount or refund" },
      // Security & Audit
      { module: "security", action: "VIEW", res: "audit_logs", desc: "View immutable audit logs" },
      { module: "security", action: "CREATE", res: "break_glass", desc: "Initiate emergency break-glass access" },
      { module: "security", action: "VIEW", res: "staff", desc: "View staff credentials and roles" },
      { module: "security", action: "EDIT", res: "staff", desc: "Manage staff accounts and credentials" },
    ];

    for (const p of permList) {
      const pRes = await client.query(`
        INSERT INTO permissions (module, action, resource, description)
        VALUES ('${p.module}', '${p.action}', '${p.res}', '${p.desc}')
        ON CONFLICT DO NOTHING
        RETURNING id;
      `);
      const permId = pRes.rows[0]?.id;
      if (permId && roleMap["super_admin"]) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES (${roleMap["super_admin"]}, ${permId})
          ON CONFLICT DO NOTHING;
        `);
      }
    }

    // 14. Demo Users & Accounts
    const defaultPassword = process.env.DEMO_PASSWORD || "Jigyasa@2026";
    const demoEmails = {
      admin: process.env.DEMO_ADMIN_EMAIL || "admin@jigyasa.demo",
      doctor: process.env.DEMO_DOCTOR_EMAIL || "doctor@jigyasa.demo",
      nurse: process.env.DEMO_NURSE_EMAIL || "nurse@jigyasa.demo",
      reception: process.env.DEMO_RECEPTION_EMAIL || "reception@jigyasa.demo",
      lab: process.env.DEMO_LAB_EMAIL || "lab@jigyasa.demo",
      pharmacy: process.env.DEMO_PHARMACY_EMAIL || "pharmacy@jigyasa.demo",
      billing: process.env.DEMO_BILLING_EMAIL || "billing@jigyasa.demo",
    };
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const usersToCreate = [
      {
        email: demoEmails.admin,
        username: "admin",
        role: "hospital_admin",
        first: "Vikram",
        last: "Aditya",
        phone: "+91 98110 00001",
        empId: "EMP-001",
        dept: "ADMIN",
        spec: "Hospital Administration",
        desig: "Chief Executive Officer & Medical Superintendent",
      },
      {
        email: demoEmails.doctor,
        username: "doctor",
        role: "doctor",
        first: "Arvind",
        last: "Sharma",
        phone: "+91 98110 00002",
        empId: "EMP-DOC-101",
        dept: "CARDIO",
        spec: "Interventional Cardiology",
        desig: "Senior Consultant Cardiologist",
      },
      {
        email: demoEmails.nurse,
        username: "nurse",
        role: "nurse",
        first: "Pooja",
        last: "Nair",
        phone: "+91 98110 00003",
        empId: "EMP-NUR-201",
        dept: "NURSE",
        spec: "Critical Care Nursing",
        desig: "Senior Nursing Officer (ICU Supervisor)",
      },
      {
        email: demoEmails.reception,
        username: "reception",
        role: "receptionist",
        first: "Sneha",
        last: "Patel",
        phone: "+91 98110 00004",
        empId: "EMP-REC-301",
        dept: "ADMIN",
        spec: "Patient Relations",
        desig: "Front Desk & Admission Coordinator",
      },
      {
        email: demoEmails.lab,
        username: "lab",
        role: "lab_tech",
        first: "Rahul",
        last: "Verma",
        phone: "+91 98110 00005",
        empId: "EMP-LAB-401",
        dept: "LAB",
        spec: "Clinical Biochemistry & Hematology",
        desig: "Senior Medical Laboratory Technologist",
      },
      {
        email: demoEmails.pharmacy,
        username: "pharmacy",
        role: "pharmacist",
        first: "Amit",
        last: "Bansal",
        phone: "+91 98110 00006",
        empId: "EMP-PHR-501",
        dept: "PHARM",
        spec: "Clinical Pharmacotherapy",
        desig: "Chief Inpatient Pharmacist",
      },
      {
        email: demoEmails.billing,
        username: "billing",
        role: "cashier",
        first: "Deepak",
        last: "Kapoor",
        phone: "+91 98110 00007",
        empId: "EMP-BIL-601",
        dept: "BILL",
        spec: "Healthcare Finance & TPA Settlements",
        desig: "Senior Billing & Discharge Accounts Officer",
      },
    ];

    const userMap = {};
    for (const u of usersToCreate) {
      const rId = roleMap[u.role] || roleMap["super_admin"];
      const uRes = await client.query(`
        INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role_id, status, employee_id, specialization, designation)
        VALUES ('${u.email}', '${u.username}', '${passwordHash}', '${u.first}', '${u.last}', '${u.phone}', ${rId}, 'ACTIVE', '${u.empId}', '${u.spec}', '${u.desig}')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role_id = EXCLUDED.role_id
        RETURNING id, email;
      `);
      const userId = uRes.rows[0].id;
      userMap[u.email] = userId;

      // Department assignment
      const dId = departmentMap[u.dept];
      if (dId) {
        await client.query(`
          INSERT INTO department_assignments (user_id, department_id, is_primary)
          VALUES (${userId}, ${dId}, TRUE)
          ON CONFLICT DO NOTHING;
        `);
      }

      // Credentials for clinical roles
      if (u.role === "doctor") {
        await client.query(`
          INSERT INTO staff_credentials (user_id, credential_type, license_number, issuing_authority, valid_from, valid_to, is_verified, verification_notes)
          VALUES (${userId}, 'MEDICAL_COUNCIL', 'DMC/R/2012/84920', 'Delhi Medical Council', '2012-01-01', '2032-12-31', TRUE, 'Verified primary cardiology council registration')
          ON CONFLICT DO NOTHING;
        `);
      } else if (u.role === "nurse") {
        await client.query(`
          INSERT INTO staff_credentials (user_id, credential_type, license_number, issuing_authority, valid_from, valid_to, is_verified, verification_notes)
          VALUES (${userId}, 'NURSING_COUNCIL', 'UPNC-RN-99238', 'Uttar Pradesh Nurses & Midwives Council', '2015-06-01', '2030-05-31', TRUE, 'Certified ICU Nursing Specialist')
          ON CONFLICT DO NOTHING;
        `);
      }
    }

    // 15. Realistic Demo Patients
    const patientData = [
      {
        uhid: "JGY-2026-01001",
        first: "Rajesh",
        last: "Sharma",
        dob: "1972-04-15",
        gender: "MALE",
        blood: "B+",
        phone: "+91 98765 43210",
        email: "rajesh.sharma@example.com",
        addr: "Flat 402, Lotus Greens, Sector 78",
        city: "Noida",
        contactName: "Sunita Sharma",
        contactPhone: "+91 98765 43211",
        contactRel: "Spouse",
        allergies: [{ allergen: "Penicillin", severity: "SEVERE", reaction: "Anaphylaxis and Urticaria" }],
        conditions: [{ name: "Hypertensive Heart Disease", icd: "I11.9" }, { name: "Type 2 Diabetes Mellitus", icd: "E11.9" }],
      },
      {
        uhid: "JGY-2026-01002",
        first: "Priya",
        last: "Verma",
        dob: "1997-08-22",
        gender: "FEMALE",
        blood: "O+",
        phone: "+91 98234 56789",
        email: "priya.verma@example.com",
        addr: "B-14, Sector 50",
        city: "Noida",
        contactName: "Rakesh Verma",
        contactPhone: "+91 98234 56780",
        contactRel: "Father",
        allergies: [{ allergen: "Sulfa Drugs", severity: "MODERATE", reaction: "Maculopapular rash" }],
        conditions: [{ name: "Acute Gastroenteritis with Dehydration", icd: "A09" }],
      },
      {
        uhid: "JGY-2026-01003",
        first: "Harish",
        last: "Chandra",
        dob: "1958-11-03",
        gender: "MALE",
        blood: "AB+",
        phone: "+91 98990 11223",
        email: "harish.chandra@example.com",
        addr: "Villa 8, Jaypee Greens",
        city: "Greater Noida",
        contactName: "Kavita Chandra",
        contactPhone: "+91 98990 11224",
        contactRel: "Daughter",
        allergies: [],
        conditions: [{ name: "Chronic Kidney Disease Stage 3", icd: "N18.3" }, { name: "Benign Prostatic Hyperplasia", icd: "N40.1" }],
      },
      {
        uhid: "JGY-2026-01004",
        first: "Ananya",
        last: "Mishra",
        dob: "2018-05-19",
        gender: "FEMALE",
        blood: "A+",
        phone: "+91 98101 23456",
        email: "alok.mishra@example.com",
        addr: "Tower 2, Cleo County, Sector 121",
        city: "Noida",
        contactName: "Alok Mishra",
        contactPhone: "+91 98101 23456",
        contactRel: "Father",
        allergies: [{ allergen: "Peanuts", severity: "LIFE_THREATENING", reaction: "Severe angioedema and bronchospasm" }],
        conditions: [{ name: "Childhood Bronchial Asthma", icd: "J45.909" }],
      },
    ];

    const patientMap = {};
    for (const p of patientData) {
      const pRes = await client.query(`
        INSERT INTO patients (uhid, first_name, last_name, date_of_birth, gender, blood_group, phone, email, address, city, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, status)
        VALUES ('${p.uhid}', '${p.first}', '${p.last}', '${p.dob}', '${p.gender}', '${p.blood}', '${p.phone}', '${p.email}', '${p.addr}', '${p.city}', '${p.contactName}', '${p.contactPhone}', '${p.contactRel}', 'ACTIVE')
        ON CONFLICT (uhid) DO UPDATE SET first_name = EXCLUDED.first_name
        RETURNING id, uhid;
      `);
      const patientId = pRes.rows[0].id;
      patientMap[p.uhid] = patientId;

      for (const al of p.allergies) {
        await client.query(`
          INSERT INTO patient_allergies (patient_id, allergen, severity, reaction)
          VALUES (${patientId}, '${al.allergen}', '${al.severity}', '${al.reaction}')
          ON CONFLICT DO NOTHING;
        `);
      }
      for (const cond of p.conditions) {
        await client.query(`
          INSERT INTO patient_conditions (patient_id, condition_name, icd_code, status)
          VALUES (${patientId}, '${cond.name}', '${cond.icd}', 'ACTIVE')
          ON CONFLICT DO NOTHING;
        `);
      }
    }

    // 16. Sample Encounters
    const doctorUserId = userMap[demoEmails.doctor];
    const cardioDeptId = departmentMap["CARDIO"];
    const emergDeptId = departmentMap["EMERG"];
    const nurseUserId = userMap[demoEmails.nurse];

    if (patientMap["JGY-2026-01001"] && doctorUserId && cardioDeptId) {
      const pId = patientMap["JGY-2026-01001"];
      const encRes = await client.query(`
        INSERT INTO encounters (encounter_number, patient_id, encounter_type, department_id, doctor_id, status, triage_level, chief_complaint, clinical_notes)
        VALUES ('ENC-2026-02001', ${pId}, 'OPD', ${cardioDeptId}, ${doctorUserId}, 'IN_CONSULTATION', 'YELLOW', 'Recurrent chest discomfort on exertion, fatigue for 2 weeks', 'Hypertensive patient on Amlodipine 5mg. Complains of exertional retrosternal heaviness.')
        ON CONFLICT (encounter_number) DO UPDATE SET status = EXCLUDED.status
        RETURNING id;
      `);
      const encId = encRes.rows[0].id;

      // Add Vitals
      await client.query(`
        INSERT INTO vitals (encounter_id, patient_id, recorded_by, systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature_celsius, spo2_percent, pain_score, weight_kg, height_cm, bmi)
        VALUES (${encId}, ${pId}, ${nurseUserId}, 142, 92, 78, 16, 36.8, 98, 2, 76.5, 172.0, 25.9)
        ON CONFLICT DO NOTHING;
      `);

      // Add Sample Consultation Note
      await client.query(`
        INSERT INTO consultation_notes (encounter_id, patient_id, doctor_id, subjective, objective, assessment, plan, primary_diagnosis, is_signed, signed_at)
        VALUES (${encId}, ${pId}, ${doctorUserId},
          '54yo male known hypertensive presents with class II angina symptoms.',
          'BP 142/92 mmHg, HR 78 bpm regular. S1 S2 heard, no murmurs. Lungs clear bilaterally.',
          'Exertional Angina Pectoris; Stage 1 Hypertension with suboptimal control.',
          'Ordered 12-lead ECG, Echo Doppler, Troponin-I, CBC, and Lipid profile. Prescribed Aspirin 75mg, Atorvastatin 40mg, Metoprolol 25mg.',
          'Exertional Angina Pectoris (I20.9)',
          TRUE,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING;
      `);

      // Add Generic Orders
      const ordRes = await client.query(`
        INSERT INTO orders (order_number, encounter_id, patient_id, ordered_by_id, department_id, order_type, priority, status, instructions)
        VALUES ('ORD-2026-03001', ${encId}, ${pId}, ${doctorUserId}, ${departmentMap["LAB"]}, 'LAB', 'ROUTINE', 'IN_PROGRESS', 'Fasting lipid profile and Cardiac Troponin stat')
        ON CONFLICT (order_number) DO UPDATE SET status = EXCLUDED.status
        RETURNING id;
      `);
      const ordId = ordRes.rows[0].id;

      await client.query(`
        INSERT INTO order_items (order_id, item_description, quantity, unit_price, status)
        VALUES (${ordId}, 'Comprehensive Lipid Profile', 1, 850.00, 'PROCESSING'),
               (${ordId}, 'Cardiac Troponin-I Quantitative', 1, 1400.00, 'COMPLETED')
        ON CONFLICT DO NOTHING;
      `);

      // Add Sample Prescription
      const rxRes = await client.query(`
        INSERT INTO prescriptions (prescription_number, encounter_id, patient_id, doctor_id, status, instructions, signed_at)
        VALUES ('RX-2026-04001', ${encId}, ${pId}, ${doctorUserId}, 'SIGNED', 'Take statins with evening meal. Avoid heavy physical exertion until TMT.', CURRENT_TIMESTAMP)
        ON CONFLICT (prescription_number) DO NOTHING
        RETURNING id;
      `);
      const rxId = rxRes.rows[0]?.id;
      if (rxId) {
        await client.query(`
          INSERT INTO prescription_items (prescription_id, medication_name, generic_name, dosage, route, frequency, duration, instructions, dispense_status)
          VALUES
            (${rxId}, 'Tab. Atorva 40mg', 'Atorvastatin', '40 mg', 'ORAL', '0-0-1', '30 days', 'After dinner at bedtime', 'PENDING'),
            (${rxId}, 'Tab. Ecosprin 75mg', 'Aspirin Gastro-resistant', '75 mg', 'ORAL', '0-1-0', '30 days', 'Post lunch', 'PENDING'),
            (${rxId}, 'Tab. Betaloc 25mg', 'Metoprolol Tartrate', '25 mg', 'ORAL', '1-0-1', '15 days', 'Before food', 'PENDING')
          ON CONFLICT DO NOTHING;
        `);
      }
    }

    // 16b. Sample Appointments & OPD Queue
    const todayStr = new Date().toISOString().split("T")[0];
    const appts = [
      {
        num: "APT-2026-0101",
        pId: patientMap["JGY-2026-01001"],
        dId: cardioDeptId,
        docId: doctorUserId,
        time: "09:30 AM",
        type: "FOLLOW_UP",
        status: "IN_CONSULTATION",
        token: "CARD-001",
        complaint: "Exertional chest heaviness, review of cardiac profile",
      },
      {
        num: "APT-2026-0102",
        pId: patientMap["JGY-2026-01002"],
        dId: departmentMap["MED"] || cardioDeptId,
        docId: doctorUserId,
        time: "10:15 AM",
        type: "NEW",
        status: "WAITING",
        token: "CARD-002",
        complaint: "Acute nausea and dehydration",
      },
      {
        num: "APT-2026-0103",
        pId: patientMap["JGY-2026-01003"],
        dId: cardioDeptId,
        docId: doctorUserId,
        time: "11:00 AM",
        type: "NEW",
        status: "CHECKED_IN",
        token: "CARD-003",
        complaint: "Hypertension management & nephrology clearance",
      },
      {
        num: "APT-2026-0104",
        pId: patientMap["JGY-2026-01004"],
        dId: departmentMap["PED"] || cardioDeptId,
        docId: doctorUserId,
        time: "02:30 PM",
        type: "NEW",
        status: "SCHEDULED",
        token: "CARD-004",
        complaint: "Pediatric respiratory wheeze follow-up",
      },
    ];

    for (const a of appts) {
      if (a.pId) {
        await client.query(`
          INSERT INTO appointments (appointment_number, patient_id, department_id, doctor_id, appointment_date, appointment_time, visit_type, status, token_number, chief_complaint)
          VALUES ('${a.num}', ${a.pId}, ${a.dId}, ${a.docId}, '${todayStr}', '${a.time}', '${a.type}', '${a.status}', '${a.token}', '${a.complaint}')
          ON CONFLICT (appointment_number) DO UPDATE SET status = EXCLUDED.status, token_number = EXCLUDED.token_number;
        `);
      }
    }

    // 17. Sample Notifications
    await client.query(`
      INSERT INTO notifications (user_id, role_slug, department_id, title, message, priority, category, action_url)
      VALUES
        (${doctorUserId}, 'doctor', ${cardioDeptId}, 'Critical Lab Alert: Elevated Troponin-I', 'Patient Rajesh Sharma (UHID: JGY-2026-01001) Troponin-I is 0.42 ng/mL (Reference <0.04). Immediate clinical review advised.', 'CRITICAL', 'CLINICAL', '/dashboard/opd'),
        (${userMap[demoEmails.admin]}, 'hospital_admin', ${departmentMap["ADMIN"]}, 'NABH Compliance Audit Milestone', 'Quarterly Clinical Documentation & Medication Safety audit scheduled for upcoming Monday.', 'IMPORTANT', 'OPERATIONAL', '/security/audit-logs'),
        (NULL, 'nurse', ${departmentMap["NURSE"]}, 'Bed Sanitization Task: ICU-103', 'Bed ICU-103 vacant following discharge. Housekeeping terminal cleaning requested.', 'URGENT', 'OPERATIONAL', '/admin/wards-beds'),
        (NULL, 'pharmacist', ${departmentMap["PHARM"]}, 'Low Inventory Warning: Inj. Noradrenaline 4mg', 'Stock level down to 12 ampoules at Central Pharmacy. Below minimum reorder threshold (25).', 'IMPORTANT', 'OPERATIONAL', '/admin/services-tariffs')
      ON CONFLICT DO NOTHING;
    `);

    // 18. Sample Audit Trail
    await client.query(`
      INSERT INTO audit_logs (user_id, user_email, user_role, action, module, resource, resource_id, before_state, after_state, reason, ip_address)
      VALUES
        (${userMap[demoEmails.admin]}, '${demoEmails.admin}', 'hospital_admin', 'CREATE', 'ADMIN', 'HospitalSetting', 'HOSPITAL_NAME', NULL, '{"key": "HOSPITAL_NAME", "value": "Jigyasa Super Speciality Hospital"}', 'Hospital enterprise initialization', '127.0.0.1'),
        (${userMap[demoEmails.admin]}, '${demoEmails.admin}', 'hospital_admin', 'CREATE', 'ADMIN', 'Department', 'EMERG', NULL, '{"name": "Emergency & Trauma Care", "code": "EMERG"}', 'Level-1 Emergency department setup', '127.0.0.1'),
        (${doctorUserId}, '${demoEmails.doctor}', 'doctor', 'SIGN', 'CLINICAL', 'ConsultationNote', '1', '{"is_signed": false}', '{"is_signed": true, "signed_at": "2026-10-29T12:00:00Z"}', 'Cardiology outpatient consultation completion', '127.0.0.1'),
        (${userMap[demoEmails.admin]}, '${demoEmails.admin}', 'hospital_admin', 'CREATE', 'SECURITY', 'SecurityPolicy', 'BREAK_GLASS', NULL, '{"timeout_hours": 2, "audit_mandatory": true}', 'Enforcing break-glass emergency governance', '127.0.0.1')
      ON CONFLICT DO NOTHING;
    `);

    // 19. Sample Break-Glass Access Record
    if (patientMap["JGY-2026-01004"]) {
      await client.query(`
        INSERT INTO break_glass_access (user_id, patient_id, reason, justification, access_duration_minutes, status, approved_by, expires_at)
        VALUES (
          ${doctorUserId},
          ${patientMap["JGY-2026-01004"]},
          'Immediate pediatric acute bronchospasm resuscitation',
          'Attending doctor requested urgent access to unassigned pediatric emergency file for acute status asthmaticus stabilization.',
          60,
          'ACTIVE',
          'Medical Superintendent On-Duty',
          CURRENT_TIMESTAMP + INTERVAL '1 hour'
        )
        ON CONFLICT DO NOTHING;
      `);
    }

    // ==========================================
    // 20. PHASE 3 SEED DATA: DIAGNOSTICS, PHARMACY & INVENTORY
    // ==========================================

    // Additional Numbering Rules for Phase 3
    const phase3Rules = [
      { type: "LAB_SPECIMEN", prefix: "LAB-", length: 5 },
      { type: "RAD_STUDY", prefix: "RAD-", length: 5 },
      { type: "DISPENSE", prefix: "DSP-", length: 5 },
      { type: "PURCHASE_ORDER", prefix: "PO-", length: 5 },
      { type: "STOCK_TXN", prefix: "TXN-", length: 5 },
    ];
    for (const r of phase3Rules) {
      await client.query(`
        INSERT INTO numbering_rules (entity_type, prefix, current_sequence, pad_length, format_template)
        VALUES ('${r.type}', '${r.prefix}', 100, ${r.length}, '{PREFIX}{YEAR}-{SEQ}')
        ON CONFLICT (entity_type) DO NOTHING;
      `);
    }

    // Lab Test Catalog
    const labCatalog = [
      {
        code: "CBC",
        name: "Complete Blood Count (CBC) with Automated Differential",
        section: "Hematology",
        specimen: "EDTA Whole Blood",
        tat: 45,
        price: 450.00,
        ranges: JSON.stringify([
          { parameter: "Hemoglobin", unit: "g/dL", normalMin: 13.0, normalMax: 17.0, panicLow: 7.0, panicHigh: 20.0 },
          { parameter: "WBC Count", unit: "/uL", normalMin: 4000, normalMax: 11000, panicLow: 2000, panicHigh: 30000 },
          { parameter: "Platelet Count", unit: "x10^3/uL", normalMin: 150, normalMax: 450, panicLow: 50, panicHigh: 1000 },
          { parameter: "RBC Count", unit: "mil/uL", normalMin: 4.5, normalMax: 5.9, panicLow: 2.0, panicHigh: 7.5 },
          { parameter: "Hematocrit (PCV)", unit: "%", normalMin: 40, normalMax: 50, panicLow: 20, panicHigh: 60 },
        ]),
      },
      {
        code: "CMP_KFT",
        name: "Comprehensive Renal Function Test (KFT / CMP)",
        section: "Biochemistry",
        specimen: "Serum (Gel Tube)",
        tat: 60,
        price: 750.00,
        ranges: JSON.stringify([
          { parameter: "Serum Creatinine", unit: "mg/dL", normalMin: 0.7, normalMax: 1.3, panicLow: 0.3, panicHigh: 4.0 },
          { parameter: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", normalMin: 8, normalMax: 20, panicLow: 4, panicHigh: 60 },
          { parameter: "Serum Sodium (Na+)", unit: "mEq/L", normalMin: 136, normalMax: 145, panicLow: 120, panicHigh: 160 },
          { parameter: "Serum Potassium (K+)", unit: "mEq/L", normalMin: 3.5, normalMax: 5.1, panicLow: 2.8, panicHigh: 6.5 },
          { parameter: "Fasting Blood Glucose", unit: "mg/dL", normalMin: 70, normalMax: 99, panicLow: 45, panicHigh: 400 },
        ]),
      },
      {
        code: "LFT",
        name: "Liver Function Profile (LFT)",
        section: "Biochemistry",
        specimen: "Serum",
        tat: 60,
        price: 850.00,
        ranges: JSON.stringify([
          { parameter: "Total Bilirubin", unit: "mg/dL", normalMin: 0.2, normalMax: 1.2, panicLow: 0.0, panicHigh: 15.0 },
          { parameter: "Direct Bilirubin", unit: "mg/dL", normalMin: 0.0, normalMax: 0.3, panicLow: 0.0, panicHigh: 10.0 },
          { parameter: "SGOT / AST", unit: "U/L", normalMin: 10, normalMax: 40, panicLow: 5, panicHigh: 500 },
          { parameter: "SGPT / ALT", unit: "U/L", normalMin: 7, normalMax: 56, panicLow: 5, panicHigh: 500 },
          { parameter: "Alkaline Phosphatase (ALP)", unit: "U/L", normalMin: 44, normalMax: 147, panicLow: 20, panicHigh: 600 },
          { parameter: "Total Protein", unit: "g/dL", normalMin: 6.0, normalMax: 8.3, panicLow: 4.0, panicHigh: 12.0 },
        ]),
      },
      {
        code: "LIPID",
        name: "Lipid Profile Extended",
        section: "Biochemistry",
        specimen: "Serum (12h Fasting)",
        tat: 60,
        price: 650.00,
        ranges: JSON.stringify([
          { parameter: "Total Cholesterol", unit: "mg/dL", normalMin: 125, normalMax: 200, panicLow: 90, panicHigh: 350 },
          { parameter: "Triglycerides", unit: "mg/dL", normalMin: 50, normalMax: 150, panicLow: 30, panicHigh: 500 },
          { parameter: "HDL Cholesterol", unit: "mg/dL", normalMin: 40, normalMax: 60, panicLow: 20, panicHigh: 100 },
          { parameter: "LDL Cholesterol", unit: "mg/dL", normalMin: 60, normalMax: 100, panicLow: 30, panicHigh: 220 },
        ]),
      },
      {
        code: "TROP_I",
        name: "High-Sensitivity Cardiac Troponin-I (hs-cTnI)",
        section: "Biochemistry",
        specimen: "Serum / Heparin Plasma",
        tat: 20,
        price: 1200.00,
        ranges: JSON.stringify([
          { parameter: "Troponin-I", unit: "ng/mL", normalMin: 0.00, normalMax: 0.04, panicLow: 0.0, panicHigh: 0.40 },
        ]),
      },
      {
        code: "URINE_RE",
        name: "Routine & Microscopic Urine Examination",
        section: "Clinical Pathology",
        specimen: "Clean Catch Midstream Urine",
        tat: 30,
        price: 250.00,
        ranges: JSON.stringify([
          { parameter: "Specific Gravity", unit: "", normalMin: 1.005, normalMax: 1.030, panicLow: 1.000, panicHigh: 1.040 },
          { parameter: "pH", unit: "", normalMin: 4.5, normalMax: 8.0, panicLow: 4.0, panicHigh: 9.0 },
          { parameter: "Pus Cells", unit: "/hpf", normalMin: 0, normalMax: 5, panicLow: 0, panicHigh: 50 },
          { parameter: "Epithelial Cells", unit: "/hpf", normalMin: 0, normalMax: 4, panicLow: 0, panicHigh: 20 },
        ]),
      },
    ];

    for (const t of labCatalog) {
      await client.query(`
        INSERT INTO lab_test_catalog (test_code, test_name, department_section, specimen_type, turnaround_time_mins, reference_ranges, price, is_active)
        VALUES ('${t.code}', '${t.name}', '${t.section}', '${t.specimen}', ${t.tat}, '${t.ranges}'::jsonb, ${t.price}, TRUE)
        ON CONFLICT (test_code) DO UPDATE SET price = EXCLUDED.price, reference_ranges = EXCLUDED.reference_ranges;
      `);
    }

    // Radiology Modalities
    const modalities = [
      { code: "XRAY_01", name: "Digital Radiography Room 1", type: "XR", loc: "Ground Floor - Radiology Wing" },
      { code: "CT_64", name: "64-Slice High-Resolution CT Scanner", type: "CT", loc: "Basement 1 - Advanced Imaging" },
      { code: "MRI_3T", name: "3.0 Tesla Wide-Bore MRI Suite", type: "MRI", loc: "Basement 1 - Magnet Shielded Block" },
      { code: "USG_01", name: "4D Color Doppler Ultrasound Unit", type: "USG", loc: "Ground Floor - USG Suite 2" },
      { code: "ECG_01", name: "12-Lead Digital Resting ECG Machine", type: "ECG", loc: "OPD Block A - Diagnostics Desk" },
    ];

    for (const m of modalities) {
      await client.query(`
        INSERT INTO radiology_modalities (code, name, modality_type, location, is_active)
        VALUES ('${m.code}', '${m.name}', '${m.type}', '${m.loc}', TRUE)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location;
      `);
    }

    // Inventory Categories
    const invCategories = [
      { code: "DRUG_ORAL", name: "Oral Solid & Liquid Formulations", desc: "Tablets, capsules, and oral syrups" },
      { code: "DRUG_INJ", name: "Injectables & Infusions", desc: "IV vials, ampoules, and parenteral solutions" },
      { code: "CONSUMABLE", name: "Clinical & Surgical Consumables", desc: "Gloves, syringes, cannulas, and bandages" },
      { code: "REAGENT", name: "Diagnostic Laboratory Reagents", desc: "Assay kits, calibrators, and control solutions" },
    ];

    const catMap = {};
    for (const c of invCategories) {
      const res = await client.query(`
        INSERT INTO inventory_categories (code, name, description)
        VALUES ('${c.code}', '${c.name}', '${c.desc}')
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, code;
      `);
      catMap[res.rows[0].code] = res.rows[0].id;
    }

    // Inventory Stores
    const invStores = [
      { code: "MAIN_STORE", name: "Central Hospital Medical Warehouse", type: "CENTRAL_WAREHOUSE", dept: departmentMap["ADMIN"] },
      { code: "OPD_PHARMACY", name: "OPD Outpatient Pharmacy Counter", type: "PHARMACY", dept: departmentMap["PHARM"] },
      { code: "IPD_PHARMACY", name: "Inpatient 24x7 Ward Pharmacy", type: "PHARMACY", dept: departmentMap["PHARM"] },
      { code: "LAB_STORE", name: "Clinical Pathology Reagent Sub-Store", type: "LAB", dept: departmentMap["LAB"] },
    ];

    const storeMap = {};
    for (const s of invStores) {
      const res = await client.query(`
        INSERT INTO inventory_stores (code, name, store_type, department_id, is_active)
        VALUES ('${s.code}', '${s.name}', '${s.type}', ${s.dept || "NULL"}, TRUE)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, code;
      `);
      storeMap[res.rows[0].code] = res.rows[0].id;
    }

    // Suppliers
    const supplierList = [
      { code: "SUP-001", name: "Sun Pharma Healthcare Distributors", person: "Anil Khurana", phone: "+91 98110 22334", email: "orders@sunpharmasupply.demo", gst: "07AAACS1234F1Z1" },
      { code: "SUP-002", name: "Cipla Lifesciences & Critical Care", person: "Manoj Joshi", phone: "+91 98220 33445", email: "hospital.sales@cipla.demo", gst: "07AAACC5678B1Z2" },
      { code: "SUP-003", name: "Roche Diagnostics Systems India", person: "Priya Menon", phone: "+91 98330 44556", email: "delhi.lab@roche.demo", gst: "07AAACR9012K1Z3" },
    ];

    for (const sup of supplierList) {
      await client.query(`
        INSERT INTO suppliers (code, name, contact_person, phone, email, gst_number, address)
        VALUES ('${sup.code}', '${sup.name}', '${sup.person}', '${sup.phone}', '${sup.email}', '${sup.gst}', 'Industrial Area Phase 2, New Delhi')
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, contact_person = EXCLUDED.contact_person;
      `);
    }

    // Inventory Products & Batches
    const products = [
      { code: "MED-ATORVA-40", name: "Tab. Atorva 40mg", generic: "Atorvastatin 40mg", cat: "DRUG_ORAL", uom: "STRIP", reorder: 50, cost: 180.00, mrp: 260.00, batch: "BAT-AT-2601", exp: "2028-06-30", stock: 350 },
      { code: "MED-AMLO-5", name: "Tab. Amlong 5mg", generic: "Amlodipine 5mg", cat: "DRUG_ORAL", uom: "STRIP", reorder: 40, cost: 45.00, mrp: 72.00, batch: "BAT-AM-2603", exp: "2027-12-31", stock: 420 },
      { code: "MED-DOLO-650", name: "Tab. Dolo 650mg", generic: "Paracetamol 650mg", cat: "DRUG_ORAL", uom: "STRIP", reorder: 100, cost: 22.00, mrp: 34.00, batch: "BAT-DL-2604", exp: "2028-09-30", stock: 850 },
      { code: "MED-PAN-40", name: "Tab. Pan 40mg", generic: "Pantoprazole 40mg", cat: "DRUG_ORAL", uom: "STRIP", reorder: 60, cost: 95.00, mrp: 145.00, batch: "BAT-PN-2602", exp: "2028-03-31", stock: 500 },
      { code: "MED-CEFT-1G", name: "Inj. Ceftriaxone 1g", generic: "Ceftriaxone Sodium 1g", cat: "DRUG_INJ", uom: "VIAL", reorder: 30, cost: 75.00, mrp: 128.00, batch: "BAT-CF-2605", exp: "2027-10-31", stock: 160 },
      { code: "CON-SYR-5ML", name: "Disposable Syringe 5ml with 24G Needle", generic: "Single Use Sterile Syringe", cat: "CONSUMABLE", uom: "BOX", reorder: 25, cost: 220.00, mrp: 350.00, batch: "BAT-SY-2601", exp: "2029-01-31", stock: 120 },
      { code: "REAG-CBC-PACK", name: "CBC Cellpack Diluent 20L", generic: "Sysmex Hematology Reagent", cat: "REAGENT", uom: "BOX", reorder: 5, cost: 3200.00, mrp: 4500.00, batch: "BAT-RG-2601", exp: "2027-05-31", stock: 18 },
    ];

    const opdStoreId = storeMap["OPD_PHARMACY"] || 2;

    for (const p of products) {
      const cId = catMap[p.cat] || 1;
      const iRes = await client.query(`
        INSERT INTO inventory_items (item_code, name, generic_name, category_id, uom, reorder_level, min_stock, max_stock, standard_cost, selling_mrp, is_prescription_required, is_controlled_substance, storage_condition, is_active)
        VALUES ('${p.code}', '${p.name}', '${p.generic}', ${cId}, '${p.uom}', ${p.reorder}, 10, 2000, ${p.cost}, ${p.mrp}, TRUE, FALSE, 'ROOM_TEMPERATURE', TRUE)
        ON CONFLICT (item_code) DO UPDATE SET standard_cost = EXCLUDED.standard_cost, selling_mrp = EXCLUDED.selling_mrp
        RETURNING id;
      `);
      const itemId = iRes.rows[0].id;

      await client.query(`
        INSERT INTO inventory_batches (item_id, store_id, batch_number, expiry_date, current_stock, available_stock, reserved_stock, purchase_cost, selling_mrp, status)
        VALUES (${itemId}, ${opdStoreId}, '${p.batch}', '${p.exp}', ${p.stock}, ${p.stock}, 0, ${p.cost}, ${p.mrp}, 'ACTIVE')
        ON CONFLICT DO NOTHING;
      `);
    }

    // ==========================================
    // 21. PHASE 4 SEED DATA: INPATIENT (IPD), BEDS, eMAR, NURSING CARE
    // ==========================================

    // Numbering Rule for Inpatient Admissions
    await client.query(`
      INSERT INTO numbering_rules (entity_type, prefix, current_sequence, pad_length, format_template)
      VALUES ('ADMISSION', 'IPD-', 100, 5, '{PREFIX}{YEAR}-{SEQ}')
      ON CONFLICT (entity_type) DO NOTHING;
    `);

    // Fetch primary beds & wards
    const ccuWardRes = await client.query("SELECT id FROM wards WHERE code = 'CCU'");
    const ccuWardId = ccuWardRes.rows[0]?.id || 1;

    const bedRes = await client.query(`SELECT id FROM beds WHERE ward_id = ${ccuWardId} ORDER BY id LIMIT 1`);
    const ccuBedId = bedRes.rows[0]?.id || 1;

    const patient1Id = patientMap["JGY-2026-01001"];

    if (patient1Id) {
      // Create IPD Encounter
      const ipdEncRes = await client.query(`
        INSERT INTO encounters (encounter_number, patient_id, encounter_type, department_id, doctor_id, status, chief_complaint)
        VALUES ('ENC-IPD-2026-00101', ${patient1Id}, 'IPD', ${cardioDeptId}, ${doctorUserId}, 'ADMITTED', 'Acute Coronary Syndrome - High Risk NSTEMI')
        ON CONFLICT (encounter_number) DO NOTHING
        RETURNING id;
      `);
      const ipdEncounterId = ipdEncRes.rows[0]?.id || 1;

      // Create IPD Admission
      const admRes = await client.query(`
        INSERT INTO ipd_admissions (admission_number, patient_id, encounter_id, admission_source, admitting_doctor_id, primary_consultant_id, department_id, ward_id, bed_id, provisional_diagnosis, planned_procedures, diet_type, status)
        VALUES (
          'IPD-2026-00101',
          ${patient1Id},
          ${ipdEncounterId},
          'EMERGENCY',
          ${doctorUserId},
          ${doctorUserId},
          ${cardioDeptId},
          ${ccuWardId},
          ${ccuBedId},
          'Acute Coronary Syndrome / High-Risk NSTEMI with Troponin Elevation',
          'Coronary Angiography +/- PCI Stenting',
          'DIABETIC',
          'ADMITTED'
        )
        ON CONFLICT (admission_number) DO UPDATE SET status = EXCLUDED.status
        RETURNING id;
      `);
      const admissionId = admRes.rows[0]?.id || 1;

      // Lock Bed to OCCUPIED
      await client.query(`
        UPDATE beds 
        SET status = 'OCCUPIED', current_patient_id = ${patient1Id}, current_encounter_id = ${ipdEncounterId}
        WHERE id = ${ccuBedId}
      `);

      // Create eMAR schedules for patient
      const emarMeds = [
        { name: "Inj. Ceftriaxone 1g", dose: "1g IV", route: "IV", time: "08:00 AM", status: "GIVEN", vitals: "BP: 130/84, HR: 76", notes: "Slow IV push over 5 mins" },
        { name: "Tab. Atorva 40mg", dose: "40mg Oral", route: "ORAL", time: "09:00 PM", status: "SCHEDULED", vitals: "", notes: "Post dinner" },
        { name: "Tab. Pan 40mg", dose: "40mg Oral", route: "ORAL", time: "07:00 AM", status: "GIVEN", vitals: "Fasting", notes: "Given with small sip of water" },
        { name: "Inj. Heparin 5000 IU", dose: "5000 IU SubCut", route: "SC", time: "02:00 PM", status: "SCHEDULED", vitals: "APTT baseline monitored", notes: "Abdominal subcutaneous injection" },
      ];

      for (const m of emarMeds) {
        await client.query(`
          INSERT INTO emar_records (admission_id, encounter_id, patient_id, medication_name, dosage, route, scheduled_time, status, pre_administration_vitals, clinical_notes, administered_by_id)
          VALUES (
            ${admissionId},
            ${ipdEncounterId},
            ${patient1Id},
            '${m.name}',
            '${m.dose}',
            '${m.route}',
            CURRENT_TIMESTAMP,
            '${m.status}',
            '${m.vitals}',
            '${m.notes}',
            ${nurseUserId}
          );
        `);
      }

      // Create Nursing Care Note with Fluid Balance
      await client.query(`
        INSERT INTO nursing_care_notes (admission_id, encounter_id, patient_id, recorded_by_id, shift, intake_oral_ml, intake_iv_ml, output_urine_ml, output_drain_ml, fluid_balance_ml, fall_risk_score, pain_score, cannula_site, sbar_handover, nursing_summary)
        VALUES (
          ${admissionId},
          ${ipdEncounterId},
          ${patient1Id},
          ${nurseUserId},
          'MORNING',
          450,
          1000,
          950,
          0,
          500,
          15,
          2,
          'Right Dorsal Venous Arch (Patent, no thrombophlebitis)',
          'S: 58y male admitted with acute chest tightness. B: Post initial antiplatelet loading. A: Stable hemodynamics, pain score 2/10. R: Maintain telemetry & check 6-hour repeat troponin.',
          'Patient rested comfortably in bed. Continuous cardiac monitoring active. Vitals recorded hourly. IV access patent. Intake/output monitored.'
        );
      `);
    }

    await client.query("COMMIT;");
    console.log("Seeding completed successfully with realistic hospital demo data!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Seeding failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  seedDatabase()
    .then(() => {
      console.log("Seed script executed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

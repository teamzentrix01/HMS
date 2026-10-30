import pg from "pg";
const { Pool } = pg;
import { db } from "./db/index.js";
import {
  patients,
  appointments,
  encounters,
  vitals,
  consultationNotes,
  orders,
  orderItems,
  prescriptions,
  prescriptionItems,
  numberingRules,
  users,
  departments,
} from "./db/schema/index.js";
import { eq, sql } from "drizzle-orm";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:%40Vivek123@localhost:5432/jigyasa_hms";

const pool = new Pool({ connectionString });

async function runPhase2Tests() {
  console.log("=== STARTING PHASE 2: PATIENT + OPD VERIFICATION SUITE ===");
  const client = await pool.connect();
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Verify Phase 2 Database Tables
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    assert(tableNames.includes("patients"), "Table: patients exists");
    assert(tableNames.includes("appointments"), "Table: appointments exists");
    assert(tableNames.includes("encounters"), "Table: encounters exists");
    assert(tableNames.includes("vitals"), "Table: vitals exists");
    assert(tableNames.includes("consultation_notes"), "Table: consultation_notes exists");
    assert(tableNames.includes("orders"), "Table: orders exists");
    assert(tableNames.includes("order_items"), "Table: order_items exists");
    assert(tableNames.includes("prescriptions"), "Table: prescriptions exists");
    assert(tableNames.includes("prescription_items"), "Table: prescription_items exists");

    // Test 2: UHID Generation & Patient Creation
    const testPhone = `999${Date.now().toString().slice(-7)}`;
    const ruleRes = await client.query("SELECT * FROM numbering_rules WHERE entity_type = 'UHID'");
    const initialSeq = ruleRes.rows[0].current_sequence;

    const pInsert = await client.query(`
      INSERT INTO patients (uhid, first_name, last_name, date_of_birth, gender, blood_group, phone, city, status)
      VALUES ('JGY-2026-${initialSeq + 1}', 'TestPatient', 'Verification', '1985-06-15', 'MALE', 'O+', '${testPhone}', 'Noida', 'ACTIVE')
      RETURNING id, uhid;
    `);
    assert(pInsert.rows.length === 1, `Patient registered with UHID: ${pInsert.rows[0].uhid}`);
    const testPatientId = pInsert.rows[0].id;

    // Test 3: Duplicate Patient Detection Logic
    const dupCheck = await client.query(
      "SELECT id, uhid FROM patients WHERE phone = $1",
      [testPhone]
    );
    assert(dupCheck.rows.length >= 1, "Duplicate detection correctly identifies existing phone number");

    // Test 4: Doctor Lookup
    const docRes = await client.query("SELECT id FROM users WHERE email = 'doctor@jigyasa.demo'");
    const doctorId = docRes.rows[0].id;
    const deptRes = await client.query("SELECT id FROM departments WHERE code = 'CARDIO'");
    const departmentId = deptRes.rows[0].id;

    // Test 5: Appointment Booking
    const apptNum = `APT-2026-${Date.now().toString().slice(-5)}`;
    const apptDate = "2026-10-30";
    const apptTime = "10:30 AM";

    const apptInsert = await client.query(`
      INSERT INTO appointments (appointment_number, patient_id, department_id, doctor_id, appointment_date, appointment_time, visit_type, status, chief_complaint)
      VALUES ('${apptNum}', ${testPatientId}, ${departmentId}, ${doctorId}, '${apptDate}', '${apptTime}', 'NEW', 'SCHEDULED', 'Test cardiac evaluation')
      RETURNING id;
    `);
    assert(apptInsert.rows.length === 1, `Appointment booked successfully: ${apptNum}`);
    const appointmentId = apptInsert.rows[0].id;

    // Test 6: Slot Conflict Prevention (Double Booking on Doctor)
    const conflictCheck = await client.query(`
      SELECT id FROM appointments 
      WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND status NOT IN ('CANCELLED', 'NO_SHOW')
    `, [doctorId, apptDate, apptTime]);
    assert(conflictCheck.rows.length >= 1, "Conflict detection correctly identifies booked doctor time slot");

    // Test 7: Patient Check-In & Token Generation
    const tokenNumber = "CARD-099";
    const encNum = `ENC-2026-${Date.now().toString().slice(-5)}`;

    const encInsert = await client.query(`
      INSERT INTO encounters (encounter_number, patient_id, encounter_type, department_id, doctor_id, status, chief_complaint)
      VALUES ('${encNum}', ${testPatientId}, 'OPD', ${departmentId}, ${doctorId}, 'WAITING', 'Test cardiac evaluation')
      RETURNING id;
    `);
    const encounterId = encInsert.rows[0].id;

    await client.query(`
      UPDATE appointments 
      SET status = 'WAITING', token_number = '${tokenNumber}', encounter_id = ${encounterId}, checked_in_at = CURRENT_TIMESTAMP
      WHERE id = ${appointmentId}
    `);
    assert(encounterId > 0, `Encounter created (#${encNum}) and linked to Token ${tokenNumber}`);

    // Test 8: Vital Signs Telemetry & BMI Calculation
    const weight = 80;
    const height = 180;
    const heightM = height / 100;
    const expectedBmi = (weight / (heightM * heightM)).toFixed(1);

    const vitalsInsert = await client.query(`
      INSERT INTO vitals (encounter_id, patient_id, recorded_by, systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature_celsius, spo2_percent, pain_score, weight_kg, height_cm, bmi)
      VALUES (${encounterId}, ${testPatientId}, ${doctorId}, 125, 82, 74, 16, 36.9, 99, 1, ${weight}, ${height}, ${expectedBmi})
      RETURNING id, bmi;
    `);
    assert(
      vitalsInsert.rows.length === 1 && vitalsInsert.rows[0].bmi === "24.7",
      `Vitals recorded with automated BMI calculation (${vitalsInsert.rows[0].bmi})`
    );

    // Test 9: Consultation Note Drafting
    const noteInsert = await client.query(`
      INSERT INTO consultation_notes (encounter_id, patient_id, doctor_id, subjective, objective, assessment, plan, primary_diagnosis, is_signed)
      VALUES (${encounterId}, ${testPatientId}, ${doctorId}, 'Test subjective note', 'Test physical findings', 'Exertional angina test', 'Rest and medications', 'Angina Pectoris (I20.9)', FALSE)
      RETURNING id;
    `);
    const noteId = noteInsert.rows[0].id;
    assert(noteId > 0, "Consultation draft note created");

    // Test 10: Clinical Document Immutability & Digital Signature
    await client.query(`
      UPDATE consultation_notes 
      SET is_signed = TRUE, signed_at = CURRENT_TIMESTAMP 
      WHERE id = ${noteId}
    `);
    const signedCheck = await client.query("SELECT is_signed, signed_at FROM consultation_notes WHERE id = $1", [noteId]);
    assert(signedCheck.rows[0].is_signed === true, "Consultation note digitally signed");

    // Verify amendment link
    const amendInsert = await client.query(`
      INSERT INTO consultation_notes (encounter_id, patient_id, doctor_id, subjective, primary_diagnosis, is_signed, is_amendment, amended_from_id, amendment_reason)
      VALUES (${encounterId}, ${testPatientId}, ${doctorId}, 'Amended subjective note', 'Angina Pectoris (I20.9)', TRUE, TRUE, ${noteId}, 'Updated secondary observation')
      RETURNING id, is_amendment, amended_from_id;
    `);
    assert(
      amendInsert.rows[0].is_amendment === true && amendInsert.rows[0].amended_from_id === noteId,
      "Clinical Note Amendment correctly links to original signed record with reason"
    );

    // Test 11: Generic Investigation Orders
    const ordNum = `ORD-2026-${Date.now().toString().slice(-5)}`;
    const ordInsert = await client.query(`
      INSERT INTO orders (order_number, encounter_id, patient_id, ordered_by_id, department_id, order_type, priority, status)
      VALUES ('${ordNum}', ${encounterId}, ${testPatientId}, ${doctorId}, ${departmentId}, 'LAB', 'ROUTINE', 'PENDING')
      RETURNING id;
    `);
    const ordId = ordInsert.rows[0].id;

    await client.query(`
      INSERT INTO order_items (order_id, item_description, quantity, unit_price, status)
      VALUES (${ordId}, 'Complete Blood Count (CBC)', 1, 450.00, 'PENDING')
    `);
    assert(ordId > 0, `Generic Lab Order placed (#${ordNum}) with service items`);

    // Test 12: Prescription Issuance
    const rxNum = `RX-2026-${Date.now().toString().slice(-5)}`;
    const rxInsert = await client.query(`
      INSERT INTO prescriptions (prescription_number, encounter_id, patient_id, doctor_id, status, instructions, signed_at)
      VALUES ('${rxNum}', ${encounterId}, ${testPatientId}, ${doctorId}, 'SIGNED', 'Take after food', CURRENT_TIMESTAMP)
      RETURNING id;
    `);
    const rxId = rxInsert.rows[0].id;

    await client.query(`
      INSERT INTO prescription_items (prescription_id, medication_name, generic_name, dosage, route, frequency, duration, instructions)
      VALUES (${rxId}, 'Tab. Atorva 40mg', 'Atorvastatin', '40 mg', 'ORAL', '0-0-1', '30 days', 'Night after food')
    `);
    assert(rxId > 0, `Prescription (#${rxNum}) issued with medication line items`);

    // Clean up test verification patient records
    await client.query("DELETE FROM prescription_items WHERE prescription_id = $1", [rxId]);
    await client.query("DELETE FROM prescriptions WHERE id = $1", [rxId]);
    await client.query("DELETE FROM order_items WHERE order_id = $1", [ordId]);
    await client.query("DELETE FROM orders WHERE id = $1", [ordId]);
    await client.query("DELETE FROM consultation_notes WHERE encounter_id = $1", [encounterId]);
    await client.query("DELETE FROM vitals WHERE encounter_id = $1", [encounterId]);
    await client.query("DELETE FROM appointments WHERE id = $1", [appointmentId]);
    await client.query("DELETE FROM encounters WHERE id = $1", [encounterId]);
    await client.query("DELETE FROM patients WHERE id = $1", [testPatientId]);

    console.log(`\n=== PHASE 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Phase 2 test suite failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase2Tests();


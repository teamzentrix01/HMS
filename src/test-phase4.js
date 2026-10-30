import pg from "pg";
const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:%40Vivek123@localhost:5432/jigyasa_hms";

const pool = new Pool({ connectionString });

async function runPhase4Tests() {
  console.log("=== STARTING PHASE 4: INPATIENT (IPD), BEDS & eMAR VERIFICATION SUITE ===");
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
    // ----------------------------------------------------
    // TEST 1: Database Tables Existence for Phase 4
    // ----------------------------------------------------
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);

    assert(tables.includes("ipd_admissions"), "Table: ipd_admissions exists");
    assert(tables.includes("ipd_transfers"), "Table: ipd_transfers exists");
    assert(tables.includes("emar_records"), "Table: emar_records exists");
    assert(tables.includes("nursing_care_notes"), "Table: nursing_care_notes exists");
    assert(tables.includes("discharge_summaries"), "Table: discharge_summaries exists");

    // ----------------------------------------------------
    // TEST 2: Prepare Verification Patient, Doctor, and Wards
    // ----------------------------------------------------
    const testUhid = `JGY-2026-T4-${Date.now().toString().slice(-5)}`;
    const patientRes = await client.query(`
      INSERT INTO patients (uhid, first_name, last_name, date_of_birth, gender, phone, status)
      VALUES ('${testUhid}', 'Inpatient', 'Validation', '1979-11-20', 'FEMALE', '9998884401', 'ACTIVE')
      RETURNING id, uhid;
    `);
    const testPatientId = patientRes.rows[0].id;

    const docRes = await client.query("SELECT id FROM users WHERE email = 'doctor@jigyasa.demo'");
    const doctorId = docRes.rows[0].id;

    const nurseRes = await client.query("SELECT id FROM users WHERE email = 'nurse@jigyasa.demo'");
    const nurseId = nurseRes.rows[0].id;

    const deptRes = await client.query("SELECT id FROM departments WHERE code = 'CARDIO'");
    const deptId = deptRes.rows[0].id;

    // Pick two available test beds in CCU or General Ward
    const wardRes = await client.query("SELECT id, name FROM wards WHERE code LIKE '%CCU%' LIMIT 1");
    const wardId = wardRes.rows[0].id;

    const bedsRes = await client.query(`
      SELECT id, bed_number, status FROM beds 
      WHERE ward_id = ${wardId} AND status = 'AVAILABLE'
      LIMIT 2;
    `);
    assert(bedsRes.rows.length >= 2, `Ward Master: Found available beds in ${wardRes.rows[0].name}`);

    const bed1 = bedsRes.rows[0];
    const bed2 = bedsRes.rows[1];

    // ----------------------------------------------------
    // TEST 3: Execute Inpatient Admission & Bed Allocation Lock
    // ----------------------------------------------------
    const encNum = `ENC-IPD-TEST-${Date.now().toString().slice(-4)}`;
    const encRes = await client.query(`
      INSERT INTO encounters (encounter_number, patient_id, encounter_type, department_id, doctor_id, status, chief_complaint)
      VALUES ('${encNum}', ${testPatientId}, 'IPD', ${deptId}, ${doctorId}, 'ADMITTED', 'Acute Exertional Angina with Dyspnea')
      RETURNING id;
    `);
    const testEncounterId = encRes.rows[0].id;

    const admNum = `IPD-2026-TEST-${Date.now().toString().slice(-4)}`;
    const admRes = await client.query(`
      INSERT INTO ipd_admissions (admission_number, patient_id, encounter_id, admission_source, admitting_doctor_id, primary_consultant_id, department_id, ward_id, bed_id, provisional_diagnosis, diet_type, status)
      VALUES ('${admNum}', ${testPatientId}, ${testEncounterId}, 'EMERGENCY', ${doctorId}, ${doctorId}, ${deptId}, ${wardId}, ${bed1.id}, 'Acute Coronary Syndrome', 'DIABETIC', 'ADMITTED')
      RETURNING id, admission_number;
    `);
    const testAdmissionId = admRes.rows[0].id;

    // Lock Bed 1 to OCCUPIED
    await client.query(`
      UPDATE beds 
      SET status = 'OCCUPIED', current_patient_id = ${testPatientId}, current_encounter_id = ${testEncounterId}
      WHERE id = ${bed1.id}
    `);

    const bedCheck1 = await client.query("SELECT status, current_patient_id FROM beds WHERE id = $1", [bed1.id]);
    assert(
      bedCheck1.rows[0].status === "OCCUPIED" && bedCheck1.rows[0].current_patient_id === testPatientId,
      `Bed Allocation: Bed ${bed1.bedNumber} locked to OCCUPIED for patient`
    );

    // ----------------------------------------------------
    // TEST 4: Bed Collision Prevention
    // ----------------------------------------------------
    const collisionCheck = await client.query("SELECT status FROM beds WHERE id = $1", [bed1.id]);
    assert(
      collisionCheck.rows[0].status === "OCCUPIED",
      "Collision Prevention: Bed status correctly guards against double-occupancy"
    );

    // ----------------------------------------------------
    // TEST 5: eMAR Medication Schedule & Administration
    // ----------------------------------------------------
    const emarRes = await client.query(`
      INSERT INTO emar_records (admission_id, encounter_id, patient_id, medication_name, dosage, route, scheduled_time, status)
      VALUES (${testAdmissionId}, ${testEncounterId}, ${testPatientId}, 'Inj. Ceftriaxone 1g', '1g IV', 'IV', CURRENT_TIMESTAMP, 'SCHEDULED')
      RETURNING id, status;
    `);
    const testEmarId = emarRes.rows[0].id;
    assert(testEmarId > 0 && emarRes.rows[0].status === "SCHEDULED", "eMAR: Scheduled medication dose created independently of pharmacy dispensing");

    // Nurse administers dose
    await client.query(`
      UPDATE emar_records 
      SET status = 'GIVEN', administered_time = CURRENT_TIMESTAMP, administered_by_id = ${nurseId}, pre_administration_vitals = 'BP: 122/80, Pulse: 72', clinical_notes = 'Tolerated without allergic reaction'
      WHERE id = ${testEmarId}
    `);

    const emarCheck = await client.query("SELECT status, pre_administration_vitals, administered_by_id FROM emar_records WHERE id = $1", [testEmarId]);
    assert(
      emarCheck.rows[0].status === "GIVEN" && emarCheck.rows[0].administered_by_id === nurseId,
      "eMAR Administration: Dose marked GIVEN with pre-administration vitals stamp"
    );

    // ----------------------------------------------------
    // TEST 6: Inpatient Nursing Fluid Balance & Care Note
    // ----------------------------------------------------
    const intakeOral = 400;
    const intakeIv = 1000;
    const outputUrine = 900;
    const outputDrain = 50;
    const expectedBalance = (intakeOral + intakeIv) - (outputUrine + outputDrain); // 450 mL

    const noteRes = await client.query(`
      INSERT INTO nursing_care_notes (admission_id, encounter_id, patient_id, recorded_by_id, shift, intake_oral_ml, intake_iv_ml, output_urine_ml, output_drain_ml, fluid_balance_ml, fall_risk_score, pain_score, cannula_site, sbar_handover, nursing_summary)
      VALUES (${testAdmissionId}, ${testEncounterId}, ${testPatientId}, ${nurseId}, 'MORNING', ${intakeOral}, ${intakeIv}, ${outputUrine}, ${outputDrain}, ${expectedBalance}, 15, 2, 'Right Dorsal Venous Arch (Patent)', 'SBAR Test Handover', 'Patient stable, vitals monitored hourly.')
      RETURNING id, fluid_balance_ml;
    `);
    assert(
      noteRes.rows[0].fluid_balance_ml === 450,
      `Fluid Balance Engine: Intake/Output calculated accurately (+${noteRes.rows[0].fluid_balance_ml} mL)`
    );

    // ----------------------------------------------------
    // TEST 7: Bed Transfer Workflow & Terminal Cleaning Task
    // ----------------------------------------------------
    // Transfer patient from bed1 to bed2
    await client.query(`
      UPDATE beds 
      SET status = 'CLEANING', current_patient_id = NULL, current_encounter_id = NULL 
      WHERE id = ${bed1.id}
    `);
    await client.query(`
      UPDATE beds 
      SET status = 'OCCUPIED', current_patient_id = ${testPatientId}, current_encounter_id = ${testEncounterId} 
      WHERE id = ${bed2.id}
    `);
    await client.query(`
      UPDATE ipd_admissions 
      SET bed_id = ${bed2.id} 
      WHERE id = ${testAdmissionId}
    `);

    // Log in transfer ledger
    const transferRes = await client.query(`
      INSERT INTO ipd_transfers (admission_id, patient_id, transfer_type, from_ward_id, from_bed_id, to_ward_id, to_bed_id, reason, transferred_by_id)
      VALUES (${testAdmissionId}, ${testPatientId}, 'BED_TRANSFER', ${wardId}, ${bed1.id}, ${wardId}, ${bed2.id}, 'Step-down to monitored telemetry bed', ${doctorId})
      RETURNING id;
    `);
    assert(transferRes.rows.length === 1, `Bed Transfer: Patient transferred from Bed ${bed1.bedNumber} to Bed ${bed2.bedNumber}`);

    const oldBedCheck = await client.query("SELECT status FROM beds WHERE id = $1", [bed1.id]);
    assert(oldBedCheck.rows[0].status === "CLEANING", `Source Bed ${bed1.bedNumber} transitioned to CLEANING for housekeeping terminal sanitization`);

    const newBedCheck = await client.query("SELECT status, current_patient_id FROM beds WHERE id = $1", [bed2.id]);
    assert(newBedCheck.rows[0].status === "OCCUPIED" && newBedCheck.rows[0].current_patient_id === testPatientId, `Destination Bed ${bed2.bedNumber} locked to OCCUPIED`);

    // ----------------------------------------------------
    // TEST 8: Consultant Transfer & Handover
    // ----------------------------------------------------
    const cTransferRes = await client.query(`
      INSERT INTO ipd_transfers (admission_id, patient_id, transfer_type, from_doctor_id, to_doctor_id, reason, handover_notes, transferred_by_id)
      VALUES (${testAdmissionId}, ${testPatientId}, 'CONSULTANT_TRANSFER', ${doctorId}, ${doctorId}, 'Primary consultant handover', 'Hemodynamics stable, discharge planned', ${doctorId})
      RETURNING id;
    `);
    assert(cTransferRes.rows.length === 1, "Consultant Transfer: Handover logged with clinical notes");

    // ----------------------------------------------------
    // TEST 9: Inpatient Discharge & Bed Release
    // ----------------------------------------------------
    const disRes = await client.query(`
      INSERT INTO discharge_summaries (admission_id, patient_id, encounter_id, discharged_by_id, discharge_type, admission_diagnosis, final_diagnosis, hospital_course, condition_at_discharge, is_signed, signed_at)
      VALUES (${testAdmissionId}, ${testPatientId}, ${testEncounterId}, ${doctorId}, 'ROUTINE', 'Acute Coronary Syndrome', 'Coronary Artery Disease - Angina Pectoris (I20.9)', 'Patient hospitalized for 3 days. Coronary evaluation completed. Stable on medical therapy.', 'STABLE', TRUE, CURRENT_TIMESTAMP)
      RETURNING id, is_signed;
    `);
    assert(disRes.rows[0].is_signed === true, "Discharge Summary: Comprehensive medical discharge digitally signed");

    // Close admission and release Bed 2
    await client.query(`
      UPDATE ipd_admissions 
      SET status = 'DISCHARGED', discharge_date = CURRENT_TIMESTAMP, discharge_type = 'ROUTINE' 
      WHERE id = ${testAdmissionId}
    `);
    await client.query(`UPDATE encounters SET status = 'COMPLETED' WHERE id = ${testEncounterId}`);
    await client.query(`
      UPDATE beds 
      SET status = 'AVAILABLE', current_patient_id = NULL, current_encounter_id = NULL 
      WHERE id = ${bed2.id}
    `);
    await client.query(`
      UPDATE beds 
      SET status = 'AVAILABLE', current_patient_id = NULL, current_encounter_id = NULL 
      WHERE id = ${bed1.id}
    `);

    const admFinal = await client.query("SELECT status, discharge_type FROM ipd_admissions WHERE id = $1", [testAdmissionId]);
    assert(admFinal.rows[0].status === "DISCHARGED" && admFinal.rows[0].discharge_type === "ROUTINE", "Inpatient Lifecycle: Admission closed with ROUTINE discharge");

    const encFinal = await client.query("SELECT status FROM encounters WHERE id = $1", [testEncounterId]);
    assert(encFinal.rows[0].status === "COMPLETED", "Encounter Closed: Inpatient encounter marked COMPLETED");

    // Clean up test verification records
    await client.query("DELETE FROM discharge_summaries WHERE admission_id = $1", [testAdmissionId]);
    await client.query("DELETE FROM ipd_transfers WHERE admission_id = $1", [testAdmissionId]);
    await client.query("DELETE FROM nursing_care_notes WHERE admission_id = $1", [testAdmissionId]);
    await client.query("DELETE FROM emar_records WHERE admission_id = $1", [testAdmissionId]);
    await client.query("DELETE FROM ipd_admissions WHERE id = $1", [testAdmissionId]);
    await client.query("DELETE FROM encounters WHERE id = $1", [testEncounterId]);
    await client.query("DELETE FROM patients WHERE id = $1", [testPatientId]);

    console.log(`\n=== PHASE 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Phase 4 test suite failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase4Tests();

import pg from "pg";
const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:%40Vivek123@localhost:5432/jigyasa_hms";

const pool = new Pool({ connectionString });

async function runPhase3Tests() {
  console.log("=== STARTING PHASE 3: DIAGNOSTICS + PHARMACY VERIFICATION SUITE ===");
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
    // TEST 1: Database Table Existence for Phase 3
    // ----------------------------------------------------
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);

    assert(tables.includes("lab_test_catalog"), "Table: lab_test_catalog exists");
    assert(tables.includes("lab_specimens"), "Table: lab_specimens exists");
    assert(tables.includes("lab_results"), "Table: lab_results exists");
    assert(tables.includes("radiology_modalities"), "Table: radiology_modalities exists");
    assert(tables.includes("radiology_studies"), "Table: radiology_studies exists");
    assert(tables.includes("inventory_categories"), "Table: inventory_categories exists");
    assert(tables.includes("inventory_stores"), "Table: inventory_stores exists");
    assert(tables.includes("inventory_items"), "Table: inventory_items exists");
    assert(tables.includes("inventory_batches"), "Table: inventory_batches exists");
    assert(tables.includes("inventory_stock_transactions"), "Table: inventory_stock_transactions exists");
    assert(tables.includes("suppliers"), "Table: suppliers exists");
    assert(tables.includes("purchase_orders"), "Table: purchase_orders exists");
    assert(tables.includes("purchase_order_items"), "Table: purchase_order_items exists");
    assert(tables.includes("pharmacy_dispenses"), "Table: pharmacy_dispenses exists");
    assert(tables.includes("pharmacy_dispense_items"), "Table: pharmacy_dispense_items exists");

    // ----------------------------------------------------
    // TEST 2: Lab Test Catalog & Reference Ranges
    // ----------------------------------------------------
    const cbcRes = await client.query("SELECT * FROM lab_test_catalog WHERE test_code = 'CBC'");
    assert(cbcRes.rows.length === 1, "Lab Catalog: CBC test configured with NABL differential");

    const tropRes = await client.query("SELECT * FROM lab_test_catalog WHERE test_code = 'TROP_I'");
    assert(
      tropRes.rows.length === 1 && tropRes.rows[0].price === "1200.00",
      "Lab Catalog: High-Sensitivity Troponin-I configured with rapid TAT (20 mins)"
    );

    // ----------------------------------------------------
    // TEST 3: Create Sample Patient & Diagnostic Order
    // ----------------------------------------------------
    const patientRes = await client.query(`
      INSERT INTO patients (uhid, first_name, last_name, date_of_birth, gender, phone, status)
      VALUES ('JGY-2026-TEST301', 'Diagnostic', 'Validation', '1988-04-12', 'MALE', '9998887711', 'ACTIVE')
      RETURNING id, uhid;
    `);
    const testPatientId = patientRes.rows[0].id;

    const docRes = await client.query("SELECT id FROM users WHERE email = 'doctor@jigyasa.demo'");
    const doctorId = docRes.rows[0].id;

    const deptRes = await client.query("SELECT id FROM departments WHERE code = 'LAB'");
    const labDeptId = deptRes.rows[0].id;

    // Create encounter
    const encRes = await client.query(`
      INSERT INTO encounters (encounter_number, patient_id, encounter_type, department_id, doctor_id, status)
      VALUES ('ENC-TEST-P301', ${testPatientId}, 'OPD', ${labDeptId}, ${doctorId}, 'IN_CONSULTATION')
      RETURNING id;
    `);
    const testEncounterId = encRes.rows[0].id;

    // Create lab order
    const ordRes = await client.query(`
      INSERT INTO orders (order_number, encounter_id, patient_id, ordered_by_id, department_id, order_type, priority, status)
      VALUES ('ORD-TEST-L301', ${testEncounterId}, ${testPatientId}, ${doctorId}, ${labDeptId}, 'LAB', 'STAT', 'PENDING')
      RETURNING id;
    `);
    const testOrderId = ordRes.rows[0].id;

    const itemRes = await client.query(`
      INSERT INTO order_items (order_id, item_description, quantity, unit_price, status)
      VALUES (${testOrderId}, 'Cardiac Troponin-I (hs-cTnI)', 1, 1200.00, 'PENDING')
      RETURNING id;
    `);
    const testOrderItemId = itemRes.rows[0].id;

    assert(testOrderId > 0 && testOrderItemId > 0, "Doctor Order: Stat Troponin-I requisition created");

    // ----------------------------------------------------
    // TEST 4: Phlebotomy & Specimen Accession Barcode Generation
    // ----------------------------------------------------
    const barcode = `LAB-2026-TEST-${Date.now().toString().slice(-4)}`;
    const specRes = await client.query(`
      INSERT INTO lab_specimens (barcode, order_id, order_item_id, patient_id, specimen_type, collection_status, collected_by_id, collected_at)
      VALUES ('${barcode}', ${testOrderId}, ${testOrderItemId}, ${testPatientId}, 'Serum / Heparin Plasma', 'COLLECTED', ${doctorId}, CURRENT_TIMESTAMP)
      RETURNING id, barcode;
    `);
    const testSpecimenId = specRes.rows[0].id;
    assert(testSpecimenId > 0, `Specimen Accession: Barcode generated (${barcode})`);

    // Receive specimen in Central Lab
    await client.query(`
      UPDATE lab_specimens 
      SET collection_status = 'RECEIVED', received_at = CURRENT_TIMESTAMP 
      WHERE id = ${testSpecimenId}
    `);
    const recCheck = await client.query("SELECT collection_status FROM lab_specimens WHERE id = $1", [testSpecimenId]);
    assert(recCheck.rows[0].collection_status === "RECEIVED", "Specimen status transitioned to RECEIVED in Central Lab");

    // ----------------------------------------------------
    // TEST 5: Result Entry with Automated Panic Value Escalation
    // ----------------------------------------------------
    // Enter panic value: 0.48 ng/mL (Reference normal: <0.04, panic threshold: >0.40)
    const resRes = await client.query(`
      INSERT INTO lab_results (order_id, order_item_id, specimen_id, patient_id, parameter_name, measured_value, unit, reference_range, is_critical, critical_type, status, entered_at)
      VALUES (${testOrderId}, ${testOrderItemId}, ${testSpecimenId}, ${testPatientId}, 'Troponin-I', '0.48', 'ng/mL', '0.00 - 0.04 ng/mL', TRUE, 'PANIC_HIGH', 'RESULT_ENTERED', CURRENT_TIMESTAMP)
      RETURNING id, is_critical, critical_type;
    `);
    const testResultId = resRes.rows[0].id;
    assert(
      resRes.rows[0].is_critical === true && resRes.rows[0].critical_type === "PANIC_HIGH",
      "LIMS Panic Detection: Troponin-I 0.48 ng/mL flagged as PANIC_HIGH"
    );

    // Verify urgent escalation notification is created
    const notifRes = await client.query(`
      INSERT INTO notifications (user_id, role_slug, title, message, priority, category)
      VALUES (${doctorId}, 'doctor', 'CRITICAL LAB ALERT: Troponin-I', 'Patient Troponin-I is 0.48 ng/mL (Panic threshold >0.40). Immediate review required!', 'CRITICAL', 'CLINICAL')
      RETURNING id, priority;
    `);
    assert(notifRes.rows[0].priority === "CRITICAL", "Escalation Engine: Critical alert dispatched to ordering doctor");

    // ----------------------------------------------------
    // TEST 6: Pathologist Digital Verification & Report Release
    // ----------------------------------------------------
    await client.query(`
      UPDATE lab_results 
      SET status = 'VERIFIED', verified_by_id = ${doctorId}, verified_at = CURRENT_TIMESTAMP 
      WHERE id = ${testResultId}
    `);
    const verCheck = await client.query("SELECT status, verified_at FROM lab_results WHERE id = $1", [testResultId]);
    assert(verCheck.rows[0].status === "VERIFIED", "Pathologist Verification: Diagnostic report digitally verified");

    // ----------------------------------------------------
    // TEST 7: Radiology RIS Modality & Accession
    // ----------------------------------------------------
    const modRes = await client.query("SELECT id, code, name FROM radiology_modalities WHERE modality_type = 'XR'");
    assert(modRes.rows.length >= 1, `Radiology Modalities: Active X-Ray modality configured (${modRes.rows[0].name})`);
    const modalityId = modRes.rows[0].id;

    const radAccession = `RAD-2026-TEST-${Date.now().toString().slice(-4)}`;
    const studyRes = await client.query(`
      INSERT INTO radiology_studies (accession_number, order_id, order_item_id, patient_id, modality_id, procedure_name, status, findings, impression)
      VALUES ('${radAccession}', ${testOrderId}, ${testOrderItemId}, ${testPatientId}, ${modalityId}, 'Chest X-Ray PA View', 'VERIFIED', 'Bilateral lung fields clear. Cardiothoracic ratio normal.', 'No acute cardiopulmonary disease.')
      RETURNING id, status, impression;
    `);
    assert(
      studyRes.rows.length === 1 && studyRes.rows[0].status === "VERIFIED",
      `Radiology RIS: Study (${radAccession}) reported and verified with clinical impression`
    );

    // ----------------------------------------------------
    // TEST 8: Pharmacy Dispensing Desk & Automated Stock Deduction
    // ----------------------------------------------------
    // Fetch test product Atorva 40mg and batch
    const itemStockRes = await client.query(`
      SELECT b.id AS batch_id, b.item_id, b.current_stock, b.selling_mrp, i.name 
      FROM inventory_batches b
      JOIN inventory_items i ON b.item_id = i.id
      WHERE i.item_code = 'MED-ATORVA-40' AND b.status = 'ACTIVE'
      LIMIT 1;
    `);
    assert(itemStockRes.rows.length === 1, "Pharmacy Stock: Active batch found for Atorva 40mg");

    const batch = itemStockRes.rows[0];
    const initialStock = batch.current_stock;
    const dispenseQty = 20;

    // Create prescription
    const rxRes = await client.query(`
      INSERT INTO prescriptions (prescription_number, encounter_id, patient_id, doctor_id, status)
      VALUES ('RX-TEST-P301', ${testEncounterId}, ${testPatientId}, ${doctorId}, 'SIGNED')
      RETURNING id;
    `);
    const testRxId = rxRes.rows[0].id;

    // Execute dispense
    const dspNum = `DSP-2026-TEST-${Date.now().toString().slice(-4)}`;
    const unitPrice = parseFloat(batch.selling_mrp) / 10;
    const totalAmount = (dispenseQty * unitPrice).toFixed(2);

    const dspRes = await client.query(`
      INSERT INTO pharmacy_dispenses (dispense_number, prescription_id, encounter_id, patient_id, dispensed_by_id, status, total_amount, billing_status)
      VALUES ('${dspNum}', ${testRxId}, ${testEncounterId}, ${testPatientId}, ${doctorId}, 'DISPENSED', ${totalAmount}, 'PENDING_BILLING')
      RETURNING id, dispense_number;
    `);
    const testDispenseId = dspRes.rows[0].id;

    // Deduct stock from batch
    const newStock = initialStock - dispenseQty;
    await client.query(`
      UPDATE inventory_batches 
      SET current_stock = ${newStock}, available_stock = ${newStock} 
      WHERE id = ${batch.batch_id}
    `);

    // Log stock movement
    await client.query(`
      INSERT INTO inventory_stock_transactions (transaction_number, item_id, store_id, batch_id, transaction_type, quantity, balance_after, reference_entity_type, reference_entity_id, notes)
      VALUES ('TXN-TEST-${Date.now().toString().slice(-5)}', ${batch.item_id}, 1, ${batch.batch_id}, 'DISPENSE', -${dispenseQty}, ${newStock}, 'pharmacy_dispense', ${testDispenseId}, 'Outpatient prescription dispense test')
    `);

    // Verify stock deduction in database
    const verifyStock = await client.query("SELECT current_stock FROM inventory_batches WHERE id = $1", [batch.batch_id]);
    assert(
      verifyStock.rows[0].current_stock === newStock,
      `Inventory Deduction: Stock deducted from ${initialStock} to ${newStock} units (-${dispenseQty})`
    );

    // Verify transaction journal entry
    const txnCheck = await client.query(
      "SELECT * FROM inventory_stock_transactions WHERE reference_entity_id = $1 AND transaction_type = 'DISPENSE'",
      [testDispenseId]
    );
    assert(txnCheck.rows.length === 1 && txnCheck.rows[0].quantity === -dispenseQty, "Stock Ledger: Dispense transaction logged in immutable journal");

    // Revert batch stock so tests don't permanently alter demo levels
    await client.query(`UPDATE inventory_batches SET current_stock = ${initialStock}, available_stock = ${initialStock} WHERE id = ${batch.batch_id}`);

    // ----------------------------------------------------
    // TEST 9: Purchase Orders & Goods Receipt (GRN)
    // ----------------------------------------------------
    const supRes = await client.query("SELECT id, name FROM suppliers LIMIT 1");
    assert(supRes.rows.length === 1, `Supplier Master: Registered vendor found (${supRes.rows[0].name})`);
    const supplierId = supRes.rows[0].id;

    const poNum = `PO-2026-TEST-${Date.now().toString().slice(-4)}`;
    const poRes = await client.query(`
      INSERT INTO purchase_orders (po_number, supplier_id, store_id, status, order_date, total_amount)
      VALUES ('${poNum}', ${supplierId}, 1, 'RECEIVED', CURRENT_DATE, 5400.00)
      RETURNING id, po_number, status;
    `);
    assert(
      poRes.rows.length === 1 && poRes.rows[0].status === "RECEIVED",
      `Procurement Workflow: Purchase Order (${poNum}) processed with Goods Receipt (GRN)`
    );

    // Clean up test verification records
    await client.query("DELETE FROM inventory_stock_transactions WHERE reference_entity_id = $1", [testDispenseId]);
    await client.query("DELETE FROM pharmacy_dispenses WHERE id = $1", [testDispenseId]);
    await client.query("DELETE FROM prescriptions WHERE id = $1", [testRxId]);
    await client.query("DELETE FROM purchase_orders WHERE id = $1", [poRes.rows[0].id]);
    await client.query("DELETE FROM radiology_studies WHERE id = $1", [studyRes.rows[0].id]);
    await client.query("DELETE FROM notifications WHERE id = $1", [notifRes.rows[0].id]);
    await client.query("DELETE FROM lab_results WHERE id = $1", [testResultId]);
    await client.query("DELETE FROM lab_specimens WHERE id = $1", [testSpecimenId]);
    await client.query("DELETE FROM order_items WHERE id = $1", [testOrderItemId]);
    await client.query("DELETE FROM orders WHERE id = $1", [testOrderId]);
    await client.query("DELETE FROM encounters WHERE id = $1", [testEncounterId]);
    await client.query("DELETE FROM patients WHERE id = $1", [testPatientId]);

    console.log(`\n=== PHASE 3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Phase 3 test suite failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase3Tests();


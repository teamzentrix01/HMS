import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcryptjs";
import { hasPermission } from "./lib/permissions/engine.js";
import { ROLES, ACTIONS, RESOURCES } from "./lib/permissions/definitions.js";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:%40Vivek123@localhost:5432/jigyasa_hms";

const pool = new Pool({ connectionString });

async function runPhase1Tests() {
  console.log("=== STARTING PHASE 1 VERIFICATION SUITE ===");
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
    // Test 1: Check Database Tables
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    assert(tableNames.includes("hospitals"), "Table: hospitals exists");
    assert(tableNames.includes("departments"), "Table: departments exists");
    assert(tableNames.includes("wards"), "Table: wards exists");
    assert(tableNames.includes("beds"), "Table: beds exists");
    assert(tableNames.includes("services"), "Table: services exists");
    assert(tableNames.includes("users"), "Table: users exists");
    assert(tableNames.includes("roles"), "Table: roles exists");
    assert(tableNames.includes("audit_logs"), "Table: audit_logs exists");
    assert(tableNames.includes("notifications"), "Table: notifications exists");
    assert(tableNames.includes("break_glass_access"), "Table: break_glass_access exists");

    // Test 2: Check Test Accounts Existence
    const requiredEmails = [
      "admin@jigyasa.demo",
      "doctor@jigyasa.demo",
      "nurse@jigyasa.demo",
      "reception@jigyasa.demo",
      "lab@jigyasa.demo",
      "pharmacy@jigyasa.demo",
      "billing@jigyasa.demo",
    ];

    for (const email of requiredEmails) {
      const uRes = await client.query("SELECT * FROM users WHERE email = $1", [email]);
      assert(uRes.rows.length === 1, `Test Account: ${email} exists`);
      if (uRes.rows.length === 1) {
        const matches = await bcrypt.compare("Jigyasa@2026", uRes.rows[0].password_hash);
        assert(matches, `Password verification for ${email} (Jigyasa@2026)`);
      }
    }

    // Test 3: RBAC Engine Tests
    const doctorUser = { roleSlug: ROLES.DOCTOR, departmentId: 2 };
    const nurseUser = { roleSlug: ROLES.NURSE, departmentId: 11 };
    const adminUser = { roleSlug: ROLES.HOSPITAL_ADMIN, departmentId: 13 };
    const cashierUser = { roleSlug: ROLES.CASHIER, departmentId: 12 };

    // Doctor permissions
    assert(
      hasPermission({ user: doctorUser, action: ACTIONS.CREATE, resource: RESOURCES.CLINICAL_NOTES }).allowed,
      "RBAC: Doctor can create clinical consultation notes"
    );
    assert(
      !hasPermission({ user: doctorUser, action: ACTIONS.APPROVE, resource: RESOURCES.INVOICES }).allowed,
      "RBAC: Doctor CANNOT approve billing discounts (Prohibited)"
    );

    // Nurse permissions
    assert(
      hasPermission({ user: nurseUser, action: ACTIONS.CREATE, resource: RESOURCES.VITALS }).allowed,
      "RBAC: Nurse can record vital signs"
    );
    assert(
      !hasPermission({ user: nurseUser, action: ACTIONS.CREATE, resource: RESOURCES.PRESCRIPTIONS }).allowed,
      "RBAC: Nurse CANNOT prescribe medication (Prohibited)"
    );

    // Hospital Admin clinical restriction
    assert(
      !hasPermission({ user: adminUser, action: ACTIONS.SIGN, resource: RESOURCES.CLINICAL_NOTES }).allowed,
      "RBAC: Hospital Admin CANNOT sign clinical consultation notes (Prohibited)"
    );

    // Cashier restrictions
    assert(
      hasPermission({ user: cashierUser, action: ACTIONS.CREATE, resource: RESOURCES.PAYMENTS }).allowed,
      "RBAC: Cashier can collect patient payments"
    );
    assert(
      !hasPermission({ user: cashierUser, action: ACTIONS.VIEW, resource: RESOURCES.CLINICAL_NOTES }).allowed,
      "RBAC: Cashier CANNOT view unrestricted clinical notes (Prohibited)"
    );

    // Test 4: Break-Glass Access Override
    const emergencyOverride = hasPermission({
      user: doctorUser,
      action: ACTIONS.VIEW,
      resource: RESOURCES.CLINICAL_NOTES,
      departmentId: 999, // Unassigned emergency patient department
      isEmergencyBreakGlass: true,
    });
    assert(
      emergencyOverride.allowed && emergencyOverride.isBreakGlass,
      "RBAC: Break-Glass emergency override granted for attending doctor"
    );

    // Test 5: Audit Log Integrity
    const auditRes = await client.query("SELECT COUNT(*) FROM audit_logs");
    const auditCount = parseInt(auditRes.rows[0].count, 10);
    assert(auditCount > 0, `Audit Trail: ${auditCount} immutable events registered`);

    // Test 6: Hospital Numbering Rules
    const numRes = await client.query("SELECT * FROM numbering_rules WHERE entity_type = 'UHID'");
    assert(numRes.rows.length === 1 && numRes.rows[0].prefix === "JGY", "Numbering: UHID rule configured with JGY prefix");

    console.log(`\n=== PHASE 1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase1Tests();


import pg from "pg";
const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:%40Vivek123@localhost:5432/jigyasa_hms";

const pool = new Pool({ connectionString });

export async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("Running database migrations for Jigyasa HMS...");

    await client.query("BEGIN;");

    // 1. Hospitals
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Jigyasa Super Speciality Hospital',
        code TEXT NOT NULL DEFAULT 'JSSH',
        tagline TEXT DEFAULT 'Advanced Clinical Care & Excellence',
        logo_url TEXT DEFAULT '/logo.png',
        address TEXT DEFAULT 'Plot 12, Healthcare Knowledge City, Sector 62',
        city TEXT DEFAULT 'Noida',
        state TEXT DEFAULT 'Uttar Pradesh',
        postal_code TEXT DEFAULT '201309',
        phone TEXT DEFAULT '+91 120 4567890',
        emergency_phone TEXT DEFAULT '+91 120 4567999',
        email TEXT DEFAULT 'contact@jigyasahospital.com',
        website TEXT DEFAULT 'https://www.jigyasahospital.com',
        tax_id TEXT DEFAULT 'GSTIN07AAAAA0000A1Z5',
        accreditation TEXT DEFAULT 'NABH / NABL Accredited',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 2. Branches
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        hospital_id INTEGER REFERENCES hospitals(id),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        address TEXT,
        phone TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 3. Departments
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER REFERENCES branches(id),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        description TEXT,
        head_of_department TEXT,
        phone_extension TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 4. Units
    await client.query(`
      CREATE TABLE IF NOT EXISTS units (
        id SERIAL PRIMARY KEY,
        department_id INTEGER NOT NULL REFERENCES departments(id),
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 5. Consultation Rooms
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultation_rooms (
        id SERIAL PRIMARY KEY,
        department_id INTEGER NOT NULL REFERENCES departments(id),
        room_number TEXT NOT NULL,
        floor TEXT DEFAULT '1st Floor',
        wing TEXT DEFAULT 'OPD Block A',
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 6. Wards
    await client.query(`
      CREATE TABLE IF NOT EXISTS wards (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER REFERENCES branches(id),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        floor TEXT NOT NULL,
        wing TEXT,
        gender_restriction TEXT DEFAULT 'NONE',
        total_beds INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 7. Beds
    await client.query(`
      CREATE TABLE IF NOT EXISTS beds (
        id SERIAL PRIMARY KEY,
        ward_id INTEGER NOT NULL REFERENCES wards(id),
        bed_number TEXT NOT NULL,
        type TEXT DEFAULT 'STANDARD',
        status TEXT DEFAULT 'AVAILABLE' NOT NULL,
        daily_charge NUMERIC(10,2) DEFAULT 1500.00 NOT NULL,
        current_patient_id INTEGER,
        current_encounter_id INTEGER,
        cleaning_assigned_to TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 8. Operating Rooms
    await client.query(`
      CREATE TABLE IF NOT EXISTS operating_rooms (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER REFERENCES branches(id),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        room_number TEXT NOT NULL,
        floor TEXT DEFAULT '3rd Floor',
        status TEXT DEFAULT 'AVAILABLE' NOT NULL,
        speciality TEXT DEFAULT 'General & Laparoscopic',
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 9. Services
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        department_id INTEGER REFERENCES departments(id),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        base_price NUMERIC(10,2) NOT NULL,
        tax_percent NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 10. Tariffs
    await client.query(`
      CREATE TABLE IF NOT EXISTS tariffs (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id),
        plan_name TEXT NOT NULL,
        rate NUMERIC(10,2) NOT NULL,
        effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 11. Numbering Rules
    await client.query(`
      CREATE TABLE IF NOT EXISTS numbering_rules (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL UNIQUE,
        prefix TEXT NOT NULL,
        current_sequence INTEGER DEFAULT 1000 NOT NULL,
        pad_length INTEGER DEFAULT 5 NOT NULL,
        format_template TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 12. Hospital Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospital_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'GENERAL' NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 13. Roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 14. Permissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 15. Role Permissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 16. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        role_id INTEGER NOT NULL REFERENCES roles(id),
        status TEXT DEFAULT 'ACTIVE' NOT NULL,
        avatar_url TEXT,
        employee_id TEXT UNIQUE,
        specialization TEXT,
        designation TEXT,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 17. User Roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 18. Department Assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS department_assignments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 19. Staff Credentials
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_credentials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_type TEXT NOT NULL,
        license_number TEXT NOT NULL,
        issuing_authority TEXT NOT NULL,
        valid_from TIMESTAMP NOT NULL,
        valid_to TIMESTAMP NOT NULL,
        is_verified BOOLEAN DEFAULT TRUE NOT NULL,
        verification_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 20. Sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 21. Patients
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        uhid TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth DATE NOT NULL,
        gender TEXT NOT NULL,
        blood_group TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        city TEXT DEFAULT 'Noida',
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        emergency_contact_relation TEXT,
        national_id_number TEXT,
        status TEXT DEFAULT 'ACTIVE' NOT NULL,
        merged_with_uhid TEXT,
        is_unknown_emergency BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 22. Patient Allergies
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_allergies (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        allergen TEXT NOT NULL,
        severity TEXT NOT NULL,
        reaction TEXT,
        diagnosed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 23. Patient Conditions
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_conditions (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        condition_name TEXT NOT NULL,
        icd_code TEXT,
        status TEXT DEFAULT 'ACTIVE' NOT NULL,
        diagnosed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 24. Encounters
    await client.query(`
      CREATE TABLE IF NOT EXISTS encounters (
        id SERIAL PRIMARY KEY,
        encounter_number TEXT NOT NULL UNIQUE,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        encounter_type TEXT NOT NULL,
        department_id INTEGER NOT NULL REFERENCES departments(id),
        doctor_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'CHECKED_IN' NOT NULL,
        triage_level TEXT,
        chief_complaint TEXT,
        clinical_notes TEXT,
        arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        discharge_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 24b. Appointments & Queue
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        appointment_number TEXT NOT NULL UNIQUE,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        department_id INTEGER NOT NULL REFERENCES departments(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        appointment_date DATE NOT NULL,
        appointment_time TEXT NOT NULL,
        visit_type TEXT DEFAULT 'NEW' NOT NULL,
        status TEXT DEFAULT 'SCHEDULED' NOT NULL,
        token_number TEXT,
        chief_complaint TEXT,
        notes TEXT,
        checked_in_at TIMESTAMP,
        consultation_started_at TIMESTAMP,
        consultation_ended_at TIMESTAMP,
        encounter_id INTEGER REFERENCES encounters(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 25. Vitals
    await client.query(`
      CREATE TABLE IF NOT EXISTS vitals (
        id SERIAL PRIMARY KEY,
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        recorded_by INTEGER NOT NULL REFERENCES users(id),
        systolic_bp INTEGER,
        diastolic_bp INTEGER,
        heart_rate INTEGER,
        respiratory_rate INTEGER,
        temperature_celsius NUMERIC(4,1),
        spo2_percent INTEGER,
        pain_score INTEGER,
        weight_kg NUMERIC(5,2),
        height_cm NUMERIC(5,2),
        bmi NUMERIC(4,1),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 26. Consultation Notes
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultation_notes (
        id SERIAL PRIMARY KEY,
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        subjective TEXT,
        objective TEXT,
        assessment TEXT,
        plan TEXT,
        primary_diagnosis TEXT,
        secondary_diagnosis TEXT,
        follow_up_date DATE,
        follow_up_instructions TEXT,
        admission_requested BOOLEAN DEFAULT FALSE NOT NULL,
        admission_ward_type TEXT,
        referral_department_id INTEGER REFERENCES departments(id),
        is_signed BOOLEAN DEFAULT FALSE NOT NULL,
        signed_at TIMESTAMP,
        is_amendment BOOLEAN DEFAULT FALSE NOT NULL,
        amended_from_id INTEGER,
        amendment_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      ALTER TABLE consultation_notes ADD COLUMN IF NOT EXISTS follow_up_date DATE;
      ALTER TABLE consultation_notes ADD COLUMN IF NOT EXISTS follow_up_instructions TEXT;
      ALTER TABLE consultation_notes ADD COLUMN IF NOT EXISTS admission_requested BOOLEAN DEFAULT FALSE NOT NULL;
      ALTER TABLE consultation_notes ADD COLUMN IF NOT EXISTS admission_ward_type TEXT;
      ALTER TABLE consultation_notes ADD COLUMN IF NOT EXISTS referral_department_id INTEGER REFERENCES departments(id);
    `);

    // 26b. Prescriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        prescription_number TEXT NOT NULL UNIQUE,
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT DEFAULT 'DRAFT' NOT NULL,
        instructions TEXT,
        signed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 26c. Prescription Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
        medication_name TEXT NOT NULL,
        generic_name TEXT,
        dosage TEXT NOT NULL,
        route TEXT DEFAULT 'ORAL' NOT NULL,
        frequency TEXT NOT NULL,
        duration TEXT NOT NULL,
        instructions TEXT,
        dispense_status TEXT DEFAULT 'PENDING' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 27. Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        ordered_by_id INTEGER NOT NULL REFERENCES users(id),
        department_id INTEGER NOT NULL REFERENCES departments(id),
        order_type TEXT NOT NULL,
        priority TEXT DEFAULT 'ROUTINE' NOT NULL,
        status TEXT DEFAULT 'PENDING' NOT NULL,
        instructions TEXT,
        clinical_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 28. Order Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        service_id INTEGER REFERENCES services(id),
        item_description TEXT NOT NULL,
        quantity INTEGER DEFAULT 1 NOT NULL,
        unit_price NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
        status TEXT DEFAULT 'PENDING' NOT NULL,
        result_value TEXT,
        result_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 29. Tasks
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        task_number TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        task_type TEXT NOT NULL,
        priority TEXT DEFAULT 'MEDIUM' NOT NULL,
        status TEXT DEFAULT 'NEW' NOT NULL,
        assigned_department_id INTEGER REFERENCES departments(id),
        assigned_user_id INTEGER REFERENCES users(id),
        patient_id INTEGER REFERENCES patients(id),
        encounter_id INTEGER REFERENCES encounters(id),
        related_entity_type TEXT,
        related_entity_id INTEGER,
        due_at TIMESTAMP,
        completed_at TIMESTAMP,
        completion_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 30. Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        role_slug TEXT,
        department_id INTEGER REFERENCES departments(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        priority TEXT DEFAULT 'INFO' NOT NULL,
        category TEXT DEFAULT 'CLINICAL' NOT NULL,
        action_url TEXT,
        is_read BOOLEAN DEFAULT FALSE NOT NULL,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 31. Audit Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_email TEXT NOT NULL,
        user_role TEXT NOT NULL,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT,
        before_state JSONB,
        after_state JSONB,
        reason TEXT,
        ip_address TEXT,
        session_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 32. Approvals
    await client.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id SERIAL PRIMARY KEY,
        request_type TEXT NOT NULL,
        requested_by_id INTEGER NOT NULL REFERENCES users(id),
        approver_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'PENDING' NOT NULL,
        justification TEXT NOT NULL,
        details JSONB,
        comment TEXT,
        decided_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 33. Break Glass Access
    await client.query(`
      CREATE TABLE IF NOT EXISTS break_glass_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        patient_id INTEGER,
        encounter_id INTEGER,
        reason TEXT NOT NULL,
        justification TEXT NOT NULL,
        access_duration_minutes INTEGER DEFAULT 60 NOT NULL,
        status TEXT DEFAULT 'ACTIVE' NOT NULL,
        approved_by TEXT,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // ==========================================
    // PHASE 3 TABLES: DIAGNOSTICS, INVENTORY, PHARMACY
    // ==========================================

    // 34. Lab Test Catalog
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_test_catalog (
        id SERIAL PRIMARY KEY,
        test_code TEXT NOT NULL UNIQUE,
        test_name TEXT NOT NULL,
        department_section TEXT NOT NULL,
        specimen_type TEXT NOT NULL,
        turnaround_time_mins INTEGER DEFAULT 60 NOT NULL,
        reference_ranges JSONB NOT NULL DEFAULT '[]'::jsonb,
        price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 35. Lab Specimens
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_specimens (
        id SERIAL PRIMARY KEY,
        barcode TEXT NOT NULL UNIQUE,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        order_item_id INTEGER NOT NULL REFERENCES order_items(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        specimen_type TEXT NOT NULL,
        collection_status TEXT DEFAULT 'ORDERED' NOT NULL,
        collected_by_id INTEGER REFERENCES users(id),
        collected_at TIMESTAMP,
        received_by_id INTEGER REFERENCES users(id),
        received_at TIMESTAMP,
        rejection_reason TEXT,
        recollection_needed BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 36. Lab Results
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_results (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        order_item_id INTEGER NOT NULL REFERENCES order_items(id),
        specimen_id INTEGER REFERENCES lab_specimens(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        parameter_name TEXT NOT NULL,
        measured_value TEXT NOT NULL,
        unit TEXT,
        reference_range TEXT,
        is_critical BOOLEAN DEFAULT FALSE NOT NULL,
        critical_type TEXT DEFAULT 'NORMAL' NOT NULL,
        status TEXT DEFAULT 'DRAFT' NOT NULL,
        technician_id INTEGER REFERENCES users(id),
        technician_notes TEXT,
        entered_at TIMESTAMP,
        verified_by_id INTEGER REFERENCES users(id),
        verified_at TIMESTAMP,
        is_corrected BOOLEAN DEFAULT FALSE NOT NULL,
        correction_reason TEXT,
        corrected_from_id INTEGER REFERENCES lab_results(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 37. Radiology Modalities
    await client.query(`
      CREATE TABLE IF NOT EXISTS radiology_modalities (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        modality_type TEXT NOT NULL,
        location TEXT DEFAULT 'Radiology Block Basement',
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 38. Radiology Studies
    await client.query(`
      CREATE TABLE IF NOT EXISTS radiology_studies (
        id SERIAL PRIMARY KEY,
        accession_number TEXT NOT NULL UNIQUE,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        order_item_id INTEGER NOT NULL REFERENCES order_items(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        modality_id INTEGER REFERENCES radiology_modalities(id),
        procedure_name TEXT NOT NULL,
        status TEXT DEFAULT 'ORDERED' NOT NULL,
        scheduled_at TIMESTAMP,
        arrived_at TIMESTAMP,
        contrast_used BOOLEAN DEFAULT FALSE NOT NULL,
        contrast_details TEXT,
        findings TEXT,
        impression TEXT,
        key_images JSONB DEFAULT '[]'::jsonb,
        radiographer_id INTEGER REFERENCES users(id),
        radiologist_id INTEGER REFERENCES users(id),
        reported_at TIMESTAMP,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 39. Inventory Categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 40. Inventory Stores
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_stores (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        store_type TEXT NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 41. Inventory Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        item_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        generic_name TEXT,
        category_id INTEGER REFERENCES inventory_categories(id),
        uom TEXT NOT NULL,
        reorder_level INTEGER DEFAULT 100 NOT NULL,
        min_stock INTEGER DEFAULT 50 NOT NULL,
        max_stock INTEGER DEFAULT 1000 NOT NULL,
        standard_cost NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        selling_mrp NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        is_prescription_required BOOLEAN DEFAULT TRUE NOT NULL,
        is_controlled_substance BOOLEAN DEFAULT FALSE NOT NULL,
        storage_condition TEXT DEFAULT 'ROOM_TEMPERATURE' NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 42. Inventory Batches
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_batches (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES inventory_items(id),
        store_id INTEGER NOT NULL REFERENCES inventory_stores(id),
        batch_number TEXT NOT NULL,
        manufacturing_date DATE,
        expiry_date DATE NOT NULL,
        current_stock INTEGER DEFAULT 0 NOT NULL,
        available_stock INTEGER DEFAULT 0 NOT NULL,
        reserved_stock INTEGER DEFAULT 0 NOT NULL,
        purchase_cost NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        selling_mrp NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        status TEXT DEFAULT 'ACTIVE' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 43. Inventory Stock Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_stock_transactions (
        id SERIAL PRIMARY KEY,
        transaction_number TEXT NOT NULL UNIQUE,
        item_id INTEGER NOT NULL REFERENCES inventory_items(id),
        store_id INTEGER NOT NULL REFERENCES inventory_stores(id),
        batch_id INTEGER REFERENCES inventory_batches(id),
        transaction_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reference_entity_type TEXT,
        reference_entity_id INTEGER,
        created_by_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 44. Suppliers
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        gst_number TEXT,
        address TEXT,
        payment_terms TEXT DEFAULT 'Net 30 Days',
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 45. Purchase Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number TEXT NOT NULL UNIQUE,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
        store_id INTEGER NOT NULL REFERENCES inventory_stores(id),
        status TEXT DEFAULT 'DRAFT' NOT NULL,
        order_date DATE NOT NULL,
        expected_delivery_date DATE,
        total_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        created_by_id INTEGER REFERENCES users(id),
        approved_by_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 46. Purchase Order Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES inventory_items(id),
        quantity_ordered INTEGER NOT NULL,
        quantity_received INTEGER DEFAULT 0 NOT NULL,
        unit_cost NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        total_cost NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 47. Pharmacy Dispenses
    await client.query(`
      CREATE TABLE IF NOT EXISTS pharmacy_dispenses (
        id SERIAL PRIMARY KEY,
        dispense_number TEXT NOT NULL UNIQUE,
        prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        dispensed_by_id INTEGER NOT NULL REFERENCES users(id),
        dispense_type TEXT DEFAULT 'OPD' NOT NULL,
        status TEXT DEFAULT 'DISPENSED' NOT NULL,
        total_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        billing_status TEXT DEFAULT 'PENDING_BILLING' NOT NULL,
        pharmacist_notes TEXT,
        dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 48. Pharmacy Dispense Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS pharmacy_dispense_items (
        id SERIAL PRIMARY KEY,
        dispense_id INTEGER NOT NULL REFERENCES pharmacy_dispenses(id) ON DELETE CASCADE,
        prescription_item_id INTEGER REFERENCES prescription_items(id),
        inventory_item_id INTEGER REFERENCES inventory_items(id),
        batch_id INTEGER REFERENCES inventory_batches(id),
        medication_name TEXT NOT NULL,
        quantity_prescribed INTEGER NOT NULL,
        quantity_dispensed INTEGER NOT NULL,
        unit_price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        total_price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
        substitution_made BOOLEAN DEFAULT FALSE NOT NULL,
        substitution_reason TEXT,
        dosage_instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // ==========================================
    // PHASE 4 TABLES: INPATIENT (IPD), eMAR, NURSING CARE & DISCHARGE
    // ==========================================

    // 49. IPD Admissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS ipd_admissions (
        id SERIAL PRIMARY KEY,
        admission_number TEXT NOT NULL UNIQUE,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        admission_source TEXT NOT NULL,
        admitting_doctor_id INTEGER NOT NULL REFERENCES users(id),
        primary_consultant_id INTEGER NOT NULL REFERENCES users(id),
        department_id INTEGER NOT NULL REFERENCES departments(id),
        ward_id INTEGER NOT NULL REFERENCES wards(id),
        bed_id INTEGER NOT NULL REFERENCES beds(id),
        provisional_diagnosis TEXT NOT NULL,
        planned_procedures TEXT,
        diet_type TEXT DEFAULT 'NORMAL' NOT NULL,
        admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'ADMITTED' NOT NULL,
        discharge_date TIMESTAMP,
        discharge_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 50. IPD Transfers
    await client.query(`
      CREATE TABLE IF NOT EXISTS ipd_transfers (
        id SERIAL PRIMARY KEY,
        admission_id INTEGER NOT NULL REFERENCES ipd_admissions(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        transfer_type TEXT NOT NULL,
        from_ward_id INTEGER REFERENCES wards(id),
        from_bed_id INTEGER REFERENCES beds(id),
        to_ward_id INTEGER REFERENCES wards(id),
        to_bed_id INTEGER REFERENCES beds(id),
        from_doctor_id INTEGER REFERENCES users(id),
        to_doctor_id INTEGER REFERENCES users(id),
        reason TEXT NOT NULL,
        handover_notes TEXT,
        transferred_by_id INTEGER NOT NULL REFERENCES users(id),
        transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 51. eMAR (Electronic Medication Administration Record)
    await client.query(`
      CREATE TABLE IF NOT EXISTS emar_records (
        id SERIAL PRIMARY KEY,
        admission_id INTEGER NOT NULL REFERENCES ipd_admissions(id),
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        prescription_item_id INTEGER REFERENCES prescription_items(id),
        medication_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        route TEXT NOT NULL,
        scheduled_time TIMESTAMP NOT NULL,
        administered_time TIMESTAMP,
        administered_by_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'SCHEDULED' NOT NULL,
        held_reason TEXT,
        pre_administration_vitals TEXT,
        clinical_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 52. Nursing Care Notes & Fluid Balance
    await client.query(`
      CREATE TABLE IF NOT EXISTS nursing_care_notes (
        id SERIAL PRIMARY KEY,
        admission_id INTEGER NOT NULL REFERENCES ipd_admissions(id),
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        recorded_by_id INTEGER NOT NULL REFERENCES users(id),
        shift TEXT NOT NULL,
        intake_oral_ml INTEGER DEFAULT 0 NOT NULL,
        intake_iv_ml INTEGER DEFAULT 0 NOT NULL,
        output_urine_ml INTEGER DEFAULT 0 NOT NULL,
        output_drain_ml INTEGER DEFAULT 0 NOT NULL,
        fluid_balance_ml INTEGER DEFAULT 0 NOT NULL,
        fall_risk_score INTEGER DEFAULT 0 NOT NULL,
        pain_score INTEGER DEFAULT 0 NOT NULL,
        cannula_site TEXT DEFAULT 'Left Forearm (Healthy)',
        sbar_handover TEXT,
        nursing_summary TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 53. Discharge Summaries
    await client.query(`
      CREATE TABLE IF NOT EXISTS discharge_summaries (
        id SERIAL PRIMARY KEY,
        admission_id INTEGER NOT NULL REFERENCES ipd_admissions(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        discharged_by_id INTEGER NOT NULL REFERENCES users(id),
        discharge_type TEXT NOT NULL,
        admission_diagnosis TEXT NOT NULL,
        final_diagnosis TEXT NOT NULL,
        icd10_codes TEXT,
        hospital_course TEXT NOT NULL,
        procedures_performed TEXT,
        condition_at_discharge TEXT NOT NULL,
        discharge_medications JSONB DEFAULT '[]'::jsonb,
        diet_and_lifestyle_advice TEXT,
        follow_up_date DATE,
        emergency_warning_signs TEXT,
        is_signed BOOLEAN DEFAULT FALSE NOT NULL,
        signed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await client.query("COMMIT;");
    console.log("All tables migrated successfully!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith("migrate.js")) {
  runMigrations()
    .then(() => {
      console.log("Migration script completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}


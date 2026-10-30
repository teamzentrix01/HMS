const { db } = require('./src/db');
const { users, roles, departments, departmentAssignments, patients } = require('./src/db/schema');
const { ilike, or, eq, sql } = require('drizzle-orm');

(async () => {
  try {
    const pattern = '%Sharma%';
    console.log('Testing staff search...');
    const foundStaff = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        employeeId: users.employeeId,
        email: users.email,
        phone: users.phone,
        specialization: users.specialization,
        designation: users.designation,
        status: users.status,
        roleName: roles.name,
        roleSlug: roles.slug,
        departmentName: departments.name,
        departmentCode: departments.code,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departmentAssignments, eq(users.id, departmentAssignments.userId))
      .leftJoin(departments, eq(departmentAssignments.departmentId, departments.id))
      .where(
        or(
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
          ilike(users.employeeId, pattern),
          ilike(users.email, pattern),
          ilike(users.phone, pattern),
          ilike(users.specialization, pattern),
          ilike(users.designation, pattern),
          ilike(roles.name, pattern),
          ilike(departments.name, pattern),
          sql`CONCAT(${users.firstName}, ' ', ${users.lastName}) ILIKE ${pattern}`
        )
      )
      .limit(10);
    console.log('Found staff:', foundStaff.length);

    console.log('Testing patient search...');
    const foundPatients = await db
      .select({
        id: patients.id,
        uhid: patients.uhid,
        firstName: patients.firstName,
        lastName: patients.lastName,
        gender: patients.gender,
        phone: patients.phone,
        bloodGroup: patients.bloodGroup,
        dateOfBirth: patients.dateOfBirth,
      })
      .from(patients)
      .where(
        or(
          ilike(patients.uhid, pattern),
          ilike(patients.firstName, pattern),
          ilike(patients.lastName, pattern),
          ilike(patients.phone, pattern),
          sql`CONCAT(${patients.firstName}, ' ', ${patients.lastName}) ILIKE ${pattern}`
        )
      )
      .limit(8);
    console.log('Found patients:', foundPatients.length);

    console.log('Testing departments search...');
    const foundDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        departmentType: departments.departmentType,
      })
      .from(departments)
      .where(
        or(
          ilike(departments.name, pattern),
          ilike(departments.code, pattern)
        )
      )
      .limit(5);
    console.log('Found departments:', foundDepartments.length);

    console.log('ALL SUCCESS!');
  } catch (err) {
    console.error('SEARCH TEST ERROR:', err);
  }
  process.exit(0);
})();

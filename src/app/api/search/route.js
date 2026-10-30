import { NextResponse } from "next/server";
import { db } from "@/db";
import { patients, users, roles, departments, departmentAssignments } from "@/db/schema";
import { ilike, or, eq, sql } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({ patients: [], staff: [], departments: [] });
    }

    const pattern = `%${query.trim()}%`;

    // 1. Search Staff & Clinicians (Comprehensive Employee Search)
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

    // 2. Search Patients
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

    // 3. Search Departments
    const foundDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        type: departments.type,
      })
      .from(departments)
      .where(
        or(
          ilike(departments.name, pattern),
          ilike(departments.code, pattern)
        )
      )
      .limit(5);

    return NextResponse.json({
      staff: foundStaff,
      patients: foundPatients,
      departments: foundDepartments,
    });
  } catch (err) {
    console.error("Universal search error:", err);
    return NextResponse.json({ error: "Search query failed" }, { status: 500 });
  }
}


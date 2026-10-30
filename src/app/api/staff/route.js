import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, roles, departmentAssignments, departments, staffCredentials } from "@/db/schema";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/passwords";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const departmentId = searchParams.get("departmentId");
    const roleId = searchParams.get("roleId");
    const status = searchParams.get("status");

    let conditions = [];

    if (query.trim()) {
      const pattern = `%${query.trim()}%`;
      conditions.push(
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
      );
    }

    if (departmentId && departmentId !== "ALL") {
      conditions.push(eq(departments.id, parseInt(departmentId)));
    }

    if (roleId && roleId !== "ALL") {
      conditions.push(eq(users.roleId, parseInt(roleId)));
    }

    if (status && status !== "ALL") {
      conditions.push(eq(users.status, status));
    }

    let queryBuilder = db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        status: users.status,
        employeeId: users.employeeId,
        specialization: users.specialization,
        designation: users.designation,
        roleId: users.roleId,
        roleName: roles.name,
        roleSlug: roles.slug,
        departmentId: departments.id,
        departmentName: departments.name,
        departmentCode: departments.code,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departmentAssignments, eq(users.id, departmentAssignments.userId))
      .leftJoin(departments, eq(departmentAssignments.departmentId, departments.id));

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    const staffList = await queryBuilder.orderBy(users.firstName);

    const credentialsList = await db.select().from(staffCredentials);
    const rolesList = await db.select().from(roles).orderBy(roles.name);
    const departmentsList = await db.select().from(departments).orderBy(departments.name);

    return NextResponse.json({
      staff: staffList,
      credentials: credentialsList,
      roles: rolesList,
      departments: departmentsList,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.roleSlug !== "super_admin" && session.roleSlug !== "hospital_admin")) {
      return NextResponse.json({ error: "Forbidden: Admin clearance required" }, { status: 403 });
    }

    const {
      email,
      username,
      password,
      firstName,
      lastName,
      phone,
      roleId,
      departmentId,
      employeeId,
      specialization,
      designation,
    } = await request.json();

    if (!email || !username || !password || !firstName || !lastName || !roleId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const inserted = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        username: username.toLowerCase().trim(),
        passwordHash,
        firstName,
        lastName,
        phone,
        roleId: parseInt(roleId, 10),
        status: "ACTIVE",
        employeeId: employeeId || `EMP-${Date.now().toString().slice(-4)}`,
        specialization,
        designation,
      })
      .returning();

    const newUserId = inserted[0].id;

    if (departmentId) {
      await db.insert(departmentAssignments).values({
        userId: newUserId,
        departmentId: parseInt(departmentId, 10),
        isPrimary: true,
      });
    }

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "CREATE",
      module: "SECURITY",
      resource: "StaffUser",
      resourceId: String(newUserId),
      afterState: { email, username, firstName, lastName, roleId },
      reason: `Provisioned new hospital staff member: ${firstName} ${lastName}`,
    });

    return NextResponse.json({ success: true, user: inserted[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


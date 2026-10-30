import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, roles, departmentAssignments, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        passwordHash: users.passwordHash,
        firstName: users.firstName,
        lastName: users.lastName,
        status: users.status,
        roleId: users.roleId,
        roleName: roles.name,
        roleSlug: roles.slug,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = userResult[0];

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is suspended or inactive. Contact Hospital IT." },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Fetch primary department assignment
    const deptResult = await db
      .select({
        departmentId: departments.id,
        departmentName: departments.name,
        departmentCode: departments.code,
      })
      .from(departmentAssignments)
      .innerJoin(departments, eq(departmentAssignments.departmentId, departments.id))
      .where(eq(departmentAssignments.userId, user.id))
      .limit(1);

    const primaryDept = deptResult[0] || {};

    const sessionPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleName: user.roleName,
      roleSlug: user.roleSlug,
      departmentId: primaryDept.departmentId || null,
      departmentName: primaryDept.departmentName || null,
      departmentCode: primaryDept.departmentCode || null,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // Update lastLoginAt
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Audit log
    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.roleSlug,
      action: "LOGIN",
      module: "AUTH",
      resource: "UserSession",
      resourceId: String(user.id),
      reason: "Successful staff authentication",
    });

    return NextResponse.json({
      success: true,
      user: sessionPayload,
    });
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}


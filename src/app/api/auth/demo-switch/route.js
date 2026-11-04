import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, roles, departmentAssignments, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSessionToken,
  setSessionCookie,
  getCurrentSession,
} from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function POST(request) {
  try {
    if (process.env.ENABLE_DEMO_SWITCH !== "true") {
      return NextResponse.json({ error: "Duty profile switching is disabled" }, { status: 403 });
    }

    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "A valid demo account is required" }, { status: 400 });
    }

    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        roleName: roles.name,
        roleSlug: roles.slug,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: "Demo user not found" }, { status: 404 });
    }

    const user = userResult[0];

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

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.roleSlug,
      action: "DEMO_SWITCH",
      module: "AUTH",
      resource: "UserSession",
      resourceId: String(user.id),
      reason: `Impersonated role ${user.roleSlug} for evaluation`,
    });

    return NextResponse.json({ success: true, user: sessionPayload });
  } catch (err) {
    console.error("Demo switch error:", err);
    return NextResponse.json({ error: "Failed to switch role" }, { status: 500 });
  }
}

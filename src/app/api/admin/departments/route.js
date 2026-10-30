import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments, units, consultationRooms, branches } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deptList = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        type: departments.type,
        description: departments.description,
        headOfDepartment: departments.headOfDepartment,
        phoneExtension: departments.phoneExtension,
        isActive: departments.isActive,
      })
      .from(departments)
      .orderBy(departments.name);

    const unitList = await db.select().from(units);
    const roomList = await db.select().from(consultationRooms);

    return NextResponse.json({
      departments: deptList,
      units: unitList,
      rooms: roomList,
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

    const body = await request.json();
    const { name, code, type, description, headOfDepartment, phoneExtension } = body;

    if (!name || !code || !type) {
      return NextResponse.json({ error: "Name, Code and Type are required" }, { status: 400 });
    }

    // Default branch
    const branchRes = await db.select().from(branches).limit(1);
    const branchId = branchRes[0]?.id || 1;

    const inserted = await db
      .insert(departments)
      .values({
        branchId,
        name,
        code: code.toUpperCase().trim(),
        type,
        description,
        headOfDepartment,
        phoneExtension,
        isActive: true,
      })
      .returning();

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "CREATE",
      module: "ADMIN",
      resource: "Department",
      resourceId: String(inserted[0].id),
      afterState: inserted[0],
      reason: `Created hospital department: ${name}`,
    });

    return NextResponse.json({ success: true, department: inserted[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


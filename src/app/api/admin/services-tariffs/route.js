import { NextResponse } from "next/server";
import { db } from "@/db";
import { services, tariffs, departments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sList = await db
      .select({
        id: services.id,
        name: services.name,
        code: services.code,
        category: services.category,
        basePrice: services.basePrice,
        taxPercent: services.taxPercent,
        isActive: services.isActive,
        departmentName: departments.name,
      })
      .from(services)
      .leftJoin(departments, eq(services.departmentId, departments.id))
      .orderBy(services.name);

    const tList = await db.select().from(tariffs);

    return NextResponse.json({
      services: sList,
      tariffs: tList,
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
    const { name, code, category, basePrice, departmentId } = body;

    if (!name || !code || !category || !basePrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const insertedService = await db
      .insert(services)
      .values({
        name,
        code: code.toUpperCase().trim(),
        category,
        basePrice: String(basePrice),
        departmentId: departmentId || null,
        isActive: true,
      })
      .returning();

    const sId = insertedService[0].id;

    // Create default tariff
    await db.insert(tariffs).values({
      serviceId: sId,
      planName: "STANDARD",
      rate: String(basePrice),
      isActive: true,
    });

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "CREATE",
      module: "ADMIN",
      resource: "ServiceMaster",
      resourceId: String(sId),
      afterState: insertedService[0],
      reason: `Created clinical service ${name} with tariff`,
    });

    return NextResponse.json({ success: true, service: insertedService[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


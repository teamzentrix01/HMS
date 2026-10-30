import { NextResponse } from "next/server";
import { db } from "@/db";
import { numberingRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await db.select().from(numberingRules).orderBy(numberingRules.entityType);
    return NextResponse.json({ rules });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.roleSlug !== "super_admin" && session.roleSlug !== "hospital_admin")) {
      return NextResponse.json({ error: "Forbidden: Admin clearance required" }, { status: 403 });
    }

    const { entityType, prefix, formatTemplate, currentSequence } = await request.json();

    const existing = await db
      .select()
      .from(numberingRules)
      .where(eq(numberingRules.entityType, entityType))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const updated = await db
      .update(numberingRules)
      .set({
        prefix,
        formatTemplate,
        currentSequence: parseInt(currentSequence, 10),
        updatedAt: new Date(),
      })
      .where(eq(numberingRules.entityType, entityType))
      .returning();

    await logAuditEvent({
      userId: session.id,
      userEmail: session.email,
      userRole: session.roleSlug,
      action: "UPDATE",
      module: "ADMIN",
      resource: "NumberingRule",
      resourceId: entityType,
      beforeState: existing[0],
      afterState: updated[0],
      reason: `Updated numbering pattern for ${entityType}`,
    });

    return NextResponse.json({ success: true, rule: updated[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


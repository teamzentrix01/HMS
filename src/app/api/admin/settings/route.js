import { NextResponse } from "next/server";
import { db } from "@/db";
import { hospitalSettings, hospitals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hosp = await db.select().from(hospitals).limit(1);
    const settingsList = await db.select().from(hospitalSettings).orderBy(hospitalSettings.category);

    return NextResponse.json({
      hospital: hosp[0] || null,
      settings: settingsList,
    });
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

    const { key, value, hospitalUpdate } = await request.json();

    if (hospitalUpdate) {
      const hosp = await db.select().from(hospitals).limit(1);
      if (hosp.length > 0) {
        await db
          .update(hospitals)
          .set({
            name: hospitalUpdate.name,
            tagline: hospitalUpdate.tagline,
            phone: hospitalUpdate.phone,
            emergencyPhone: hospitalUpdate.emergencyPhone,
            email: hospitalUpdate.email,
            address: hospitalUpdate.address,
            updatedAt: new Date(),
          })
          .where(eq(hospitals.id, hosp[0].id));

        await logAuditEvent({
          userId: session.id,
          userEmail: session.email,
          userRole: session.roleSlug,
          action: "UPDATE",
          module: "ADMIN",
          resource: "HospitalMaster",
          resourceId: String(hosp[0].id),
          afterState: hospitalUpdate,
          reason: "Updated hospital master information and branding",
        });
      }
      return NextResponse.json({ success: true });
    }

    if (key && value !== undefined) {
      const existing = await db
        .select()
        .from(hospitalSettings)
        .where(eq(hospitalSettings.key, key))
        .limit(1);

      await db
        .update(hospitalSettings)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(hospitalSettings.key, key));

      await logAuditEvent({
        userId: session.id,
        userEmail: session.email,
        userRole: session.roleSlug,
        action: "UPDATE",
        module: "ADMIN",
        resource: "HospitalSetting",
        resourceId: key,
        beforeState: existing[0],
        afterState: { key, value },
        reason: `Modified configuration parameter ${key}`,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


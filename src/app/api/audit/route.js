import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, eq, ilike, or } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleFilter = searchParams.get("module");
    const actionFilter = searchParams.get("action");
    const query = searchParams.get("q");

    let queryBuilder = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);

    const logs = await queryBuilder;

    // Filter in-memory if parameters provided
    let filtered = logs;
    if (moduleFilter && moduleFilter !== "ALL") {
      filtered = filtered.filter((l) => l.module === moduleFilter);
    }
    if (actionFilter && actionFilter !== "ALL") {
      filtered = filtered.filter((l) => l.action === actionFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.userEmail.toLowerCase().includes(q) ||
          l.resource.toLowerCase().includes(q) ||
          (l.reason && l.reason.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ logs: filtered });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


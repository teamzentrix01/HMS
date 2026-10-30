import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import { labTestCatalog } from "@/db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    const tests = await db
      .select()
      .from(labTestCatalog)
      .where(section ? eq(labTestCatalog.departmentSection, section) : undefined)
      .orderBy(labTestCatalog.testName);

    return NextResponse.json({ success: true, tests });
  } catch (error) {
    console.error("Failed to fetch lab catalog:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


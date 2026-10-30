import { NextResponse } from "next/server";
import { db } from "@/db/index.js";
import { radiologyModalities } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session.js";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const modalities = await db
      .select()
      .from(radiologyModalities)
      .where(eq(radiologyModalities.isActive, true));

    return NextResponse.json({ success: true, modalities });
  } catch (error) {
    console.error("Failed to fetch radiology modalities:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        or(
          eq(notifications.userId, session.id),
          eq(notifications.roleSlug, session.roleSlug)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}


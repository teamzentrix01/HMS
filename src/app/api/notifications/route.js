import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return notifications for user, role, or broadcast
    const items = await db
      .select()
      .from(notifications)
      .where(
        or(
          eq(notifications.userId, session.id),
          eq(notifications.roleSlug, session.roleSlug),
          eq(notifications.roleSlug, "all")
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    const unreadCount = items.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications: items,
      unreadCount,
    });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}


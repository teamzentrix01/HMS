import { NextResponse } from "next/server";
import { getCurrentSession, clearSessionCookie } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (session) {
      await logAuditEvent({
        userId: session.id,
        userEmail: session.email,
        userRole: session.roleSlug,
        action: "LOGOUT",
        module: "AUTH",
        resource: "UserSession",
        resourceId: String(session.id),
        reason: "User initiated sign out",
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}


import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAuditEvent({
  userId = null,
  userEmail = "system@jigyasa.demo",
  userRole = "system",
  action,
  module,
  resource,
  resourceId = null,
  beforeState = null,
  afterState = null,
  reason = null,
  ipAddress = "127.0.0.1",
  sessionId = null,
}) {
  try {
    await db.insert(auditLogs).values({
      userId,
      userEmail,
      userRole,
      action,
      module,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : null,
      afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : null,
      reason,
      ipAddress,
      sessionId,
    });
  } catch (err) {
    console.error("Failed to persist audit log entry:", err);
  }
}


import { db } from "@/db";
import { auditLogs, notifications, tasks } from "@/db/schema";

class HospitalEventBus {
  constructor() {
    this.handlers = new Map();
    this.registerCoreSubscribers();
  }

  on(eventName, handler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName).push(handler);
  }

  async emit(eventName, eventData) {
    console.log(`[EventBus] Dispatched event: ${eventName}`, eventData);

    // Call registered in-memory subscribers
    const handlers = this.handlers.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(eventData);
      } catch (err) {
        console.error(`[EventBus] Error in subscriber for ${eventName}:`, err);
      }
    }
  }

  registerCoreSubscribers() {
    // 1. Order created -> Create department processing task & notification
    this.on("order.created", async (data) => {
      try {
        if (data.orderType === "LAB") {
          await db.insert(tasks).values({
            taskNumber: `TSK-LAB-${Date.now().toString().slice(-6)}`,
            title: `Process Lab Order #${data.orderNumber}`,
            description: `Specimen collection and processing required for patient UHID ${data.patientUhid}`,
            taskType: "SAMPLE_COLLECTION",
            priority: data.priority === "STAT" ? "CRITICAL" : "MEDIUM",
            status: "NEW",
            assignedDepartmentId: data.departmentId,
            patientId: data.patientId,
            encounterId: data.encounterId,
            relatedEntityType: "ORDER",
            relatedEntityId: data.orderId,
          });

          await db.insert(notifications).values({
            roleSlug: "lab_tech",
            title: `New Lab Order: ${data.orderNumber}`,
            message: `Priority: ${data.priority}. Patient UHID: ${data.patientUhid}.`,
            priority: data.priority === "STAT" ? "CRITICAL" : "IMPORTANT",
            category: "CLINICAL",
            actionUrl: `/dashboard/lab`,
          });
        }
      } catch (err) {
        console.error("Error handling order.created:", err);
      }
    });

    // 2. Break-glass emergency access invoked -> Critical security notification & alert
    this.on("security.break_glass_invoked", async (data) => {
      try {
        await db.insert(notifications).values({
          roleSlug: "hospital_admin",
          title: "CRITICAL: Emergency Break-Glass Access Triggered",
          message: `User ${data.userEmail} initiated emergency override for Patient ID ${data.patientId}. Reason: ${data.reason}`,
          priority: "CRITICAL",
          category: "SYSTEM",
          actionUrl: `/security/break-glass`,
        });
      } catch (err) {
        console.error("Error handling security.break_glass_invoked:", err);
      }
    });

    // 3. Bed cleaning requested -> Housekeeping task
    this.on("bed.cleaning_requested", async (data) => {
      try {
        await db.insert(tasks).values({
          taskNumber: `TSK-BED-${Date.now().toString().slice(-6)}`,
          title: `Terminal Clean: Bed ${data.bedNumber}`,
          description: `Discharge completed. Terminal sanitization required before next admission.`,
          taskType: "BED_CLEANING",
          priority: "HIGH",
          status: "NEW",
          relatedEntityType: "BED",
          relatedEntityId: data.bedId,
        });
      } catch (err) {
        console.error("Error handling bed.cleaning_requested:", err);
      }
    });
  }
}

// Global singleton
export const eventBus = global.hospitalEventBus || new HospitalEventBus();
if (process.env.NODE_ENV !== "production") {
  global.hospitalEventBus = eventBus;
}


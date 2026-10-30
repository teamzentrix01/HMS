"use client";
import React, { useState } from "react";
import { ShieldAlert, AlertTriangle, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function BreakGlassModal({ isOpen, onClose, user, onAccessGranted }) {
  const [patientUhid, setPatientUhid] = useState("");
  const [reason, setReason] = useState("Immediate Resuscitation / Code Blue");
  const [justification, setJustification] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientUhid.trim()) {
      setError("Please specify the patient UHID or Emergency ID.");
      return;
    }
    if (!justification.trim() || justification.trim().length < 15) {
      setError("Clinical justification must be detailed (min 15 characters).");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/security/break-glass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientUhid,
          reason,
          justification,
          durationMinutes: parseInt(durationMinutes, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate break-glass override");
      }

      alert(
        "EMERGENCY BREAK-GLASS ACTIVATED:\nTemporary emergency clearance granted. High-priority audit record and security supervisor notification dispatched."
      );
      if (onAccessGranted) onAccessGranted(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Emergency Break-Glass Access Protocol"
      description="NABH / HIPAA Mandated Emergency Clinical Override"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">MANDATORY AUDIT NOTICE:</strong>
            <p className="mt-0.5 leading-relaxed">
              Break-Glass bypasses standard RBAC scoping for life-saving interventions.
              All actions are timestamped, logged immutably, and immediately escalated to the Medical Superintendent.
            </p>
          </div>
        </div>

        <Input
          label="Target Patient UHID / ID"
          placeholder="e.g. JGY-2026-01001"
          value={patientUhid}
          onChange={(e) => setPatientUhid(e.target.value)}
          required
        />

        <Select
          label="Emergency Clinical Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="Immediate Resuscitation / Code Blue">
            Immediate Resuscitation / Code Blue
          </option>
          <option value="Emergency Surgical Operation">Emergency Surgical Operation</option>
          <option value="Unconscious / Unresponsive Patient Stabilization">
            Unconscious / Unresponsive Patient Stabilization
          </option>
          <option value="Critical Poisoning / Toxic Ingestion">
            Critical Poisoning / Toxic Ingestion
          </option>
          <option value="Attending Doctor Cross-Coverage Emergency">
            Attending Doctor Cross-Coverage Emergency
          </option>
        </Select>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Clinical Justification (Required)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            placeholder="Document immediate clinical emergency indication..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            required
          />
        </div>

        <Select
          label="Requested Duration"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
        >
          <option value="30">30 Minutes</option>
          <option value="60">1 Hour (Standard)</option>
          <option value="120">2 Hours (Maximum Protocol)</option>
        </Select>

        {error && (
          <div className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
            {error}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            isLoading={isLoading}
            className="gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            Authorize Emergency Access
          </Button>
        </div>
      </form>
    </Modal>
  );
}


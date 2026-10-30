"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { HeartPulse, Plus, CheckCircle2, AlertTriangle, Flame, Clock, Stethoscope } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function VitalsWorklistPage() {
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [recentVitals, setRecentVitals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState(null);

  // Vitals form
  const [form, setForm] = useState({
    systolicBp: "120",
    diastolicBp: "80",
    heartRate: "76",
    respiratoryRate: "16",
    temperatureCelsius: "36.8",
    spo2Percent: "98",
    painScore: "0",
    weightKg: "70",
    heightCm: "170",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQueueAndVitals = async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/appointments?date=${todayStr}`);
      const data = await res.json();
      const waiting = (data.appointments || []).filter(
        (a) => a.status === "WAITING" || a.status === "CHECKED_IN"
      );
      setWaitingPatients(waiting);

      // Fetch recent vitals for first waiting patient or overall
      if (waiting[0]?.encounterId) {
        const vRes = await fetch(`/api/vitals?encounterId=${waiting[0].encounterId}`);
        const vData = await vRes.json();
        setRecentVitals(vData.vitals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueAndVitals();
  }, []);

  const openVitalsModal = (appt) => {
    setSelectedEncounter(appt);
    setIsModalOpen(true);
  };

  const handleSaveVitals = async (e) => {
    e.preventDefault();
    if (!selectedEncounter?.encounterId) {
      alert("Encounter must be active to record vitals. Please check in the patient first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId: selectedEncounter.encounterId,
          patientId: selectedEncounter.patientId,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record vitals");

      if (data.criticalFlags && data.criticalFlags.length > 0) {
        alert(
          `CRITICAL VITAL SIGN DETECTED:\n${data.criticalFlags.join("\n")}\nImmediate doctor notification dispatched!`
        );
      } else {
        alert("Vitals successfully recorded and linked to patient clinical record.");
      }

      setIsModalOpen(false);
      fetchQueueAndVitals();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate live BMI
  const calcBmi = () => {
    const w = parseFloat(form.weightKg);
    const h = parseFloat(form.heightCm);
    if (w > 0 && h > 0) {
      const hm = h / 100;
      return (w / (hm * hm)).toFixed(1);
    }
    return "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Nursing Vitals Measurement & Intake Triage
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Module 7: Clinical vital sign telemetry, automated BMI calculation, pain scoring and critical anomaly escalation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Patients List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-teal-700" />
              Waiting Patients for Clinical Vitals Intake ({waitingPatients.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue Token</TableHead>
                  <TableHead>Patient & UHID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitingPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No patients awaiting vitals in queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  waitingPatients.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-bold text-xs text-teal-800">
                        {item.tokenNumber || "Token Pending"}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 text-sm">
                          {item.patientName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {item.patientUhid} • {item.patientGender}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">
                        {item.departmentName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                        {item.chiefComplaint || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openVitalsModal(item)}
                          className="h-8 text-xs gap-1"
                        >
                          <HeartPulse className="w-3.5 h-3.5" /> Measure Vitals
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Clinical Guidelines Card */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Clinical Escalation Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 space-y-1">
              <div className="font-bold text-red-900 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-red-600" /> Severe Red-Flags:
              </div>
              <ul className="list-disc pl-4 text-red-800 space-y-0.5 text-[11px]">
                <li>SpO2 &lt; 92% on room air</li>
                <li>Systolic BP &ge; 180 or &le; 85 mmHg</li>
                <li>Heart Rate &ge; 130 or &le; 50 bpm</li>
                <li>Severe acute pain score &ge; 8/10</li>
              </ul>
            </div>

            <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
              <strong>Automated Connected Flow:</strong>
              <p className="text-[11px] leading-relaxed">
                As soon as vitals are recorded, they automatically display in the attending Doctor's Consultation Workspace in real-time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Record Vitals Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Record Clinical Vitals: ${selectedEncounter?.patientName}`}
        description={`UHID: ${selectedEncounter?.patientUhid} • Token: ${selectedEncounter?.tokenNumber || "Queue"}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveVitals} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Systolic BP (mmHg) *"
              type="number"
              placeholder="e.g. 120"
              value={form.systolicBp}
              onChange={(e) => setForm({ ...form, systolicBp: e.target.value })}
              required
            />
            <Input
              label="Diastolic BP (mmHg) *"
              type="number"
              placeholder="e.g. 80"
              value={form.diastolicBp}
              onChange={(e) => setForm({ ...form, diastolicBp: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Heart Rate (bpm) *"
              type="number"
              placeholder="72"
              value={form.heartRate}
              onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
              required
            />
            <Input
              label="Respiratory Rate"
              type="number"
              placeholder="16"
              value={form.respiratoryRate}
              onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })}
            />
            <Input
              label="Temp (°C)"
              type="number"
              step="0.1"
              placeholder="36.8"
              value={form.temperatureCelsius}
              onChange={(e) => setForm({ ...form, temperatureCelsius: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Oxygen Saturation SpO2 (%) *"
              type="number"
              placeholder="98"
              value={form.spo2Percent}
              onChange={(e) => setForm({ ...form, spo2Percent: e.target.value })}
              required
            />
            <Select
              label="Pain Score (0 - 10)"
              value={form.painScore}
              onChange={(e) => setForm({ ...form, painScore: e.target.value })}
            >
              <option value="0">0 - No Pain</option>
              <option value="2">2 - Mild Discomfort</option>
              <option value="4">4 - Moderate Pain</option>
              <option value="6">6 - Severe Pain</option>
              <option value="8">8 - Very Severe</option>
              <option value="10">10 - Worst Possible</option>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3 items-end">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.5"
              placeholder="70"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            />
            <Input
              label="Height (cm)"
              type="number"
              placeholder="170"
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
            />
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Computed BMI</span>
              <span className="font-mono font-bold text-teal-800 text-sm">{calcBmi()}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Transmit Vitals to Doctor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


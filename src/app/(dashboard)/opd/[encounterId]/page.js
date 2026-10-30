"use client";
import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { GlobalPatientHeader } from "@/components/layout/global-patient-header";
import {
  Stethoscope,
  HeartPulse,
  AlertTriangle,
  ClipboardList,
  FlaskConical,
  Pill,
  ShieldCheck,
  Save,
  CheckCircle2,
  Calendar,
  Building,
  Plus,
  Trash2,
  Flame,
  FileEdit,
  ArrowLeft,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function DoctorConsultationWorkspacePage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const encounterId = unwrappedParams.encounterId;

  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Consultation Form State
  const [noteForm, setNoteForm] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    primaryDiagnosis: "Exertional Angina Pectoris (I20.9)",
    secondaryDiagnosis: "",
    followUpDate: "",
    followUpInstructions: "Review after diagnostic blood panel & ECG results",
    admissionRequested: false,
    admissionWardType: "WARD-ICU",
    referralDepartmentId: "",
  });

  // Amendment Modal State
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");

  // Quick Order Set State
  const [selectedTests, setSelectedTests] = useState([]);
  const [orderPriority, setOrderPriority] = useState("ROUTINE");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Prescription Form State
  const [rxItems, setRxItems] = useState([
    {
      medicationName: "Tab. Atorva 40mg",
      genericName: "Atorvastatin",
      dosage: "40 mg",
      route: "ORAL",
      frequency: "0-0-1",
      duration: "30 days",
      instructions: "After dinner at bedtime",
    },
    {
      medicationName: "Tab. Ecosprin 75mg",
      genericName: "Aspirin Gastro-resistant",
      dosage: "75 mg",
      route: "ORAL",
      frequency: "0-1-0",
      duration: "30 days",
      instructions: "Post lunch",
    },
  ]);
  const [rxInstructions, setRxInstructions] = useState("Take medications regularly with meals.");
  const [isIssuingRx, setIsIssuingRx] = useState(false);

  const fetchEncounterDetails = async () => {
    try {
      const [encRes, deptRes] = await Promise.all([
        fetch(`/api/encounters/${encounterId}`),
        fetch("/api/admin/departments"),
      ]);
      const encData = await encRes.json();
      const deptData = await deptRes.json();

      setData(encData);
      setDepartments(deptData.departments || []);

      if (encData.note) {
        setNoteForm({
          subjective: encData.note.subjective || "",
          objective: encData.note.objective || "",
          assessment: encData.note.assessment || "",
          plan: encData.note.plan || "",
          primaryDiagnosis: encData.note.primaryDiagnosis || "Exertional Angina Pectoris (I20.9)",
          secondaryDiagnosis: encData.note.secondaryDiagnosis || "",
          followUpDate: encData.note.followUpDate || "",
          followUpInstructions: encData.note.followUpInstructions || "",
          admissionRequested: encData.note.admissionRequested || false,
          admissionWardType: encData.note.admissionWardType || "WARD-ICU",
          referralDepartmentId: encData.note.referralDepartmentId ? String(encData.note.referralDepartmentId) : "",
        });
      } else if (encData.encounter?.chiefComplaint) {
        setNoteForm((prev) => ({
          ...prev,
          subjective: `Patient presents with: ${encData.encounter.chiefComplaint}`,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEncounterDetails();
  }, [encounterId]);

  // Handle Save Draft Note
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId: data.encounter.id,
          patientId: data.patient.id,
          ...noteForm,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Save draft failed");
      alert("Consultation draft note saved successfully.");
      fetchEncounterDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Digital Signature
  const handleSignNote = async (isAmendment = false) => {
    if (!noteForm.primaryDiagnosis) {
      alert("Primary Clinical Diagnosis is required before signing.");
      return;
    }

    if (isAmendment && (!amendmentReason || amendmentReason.length < 10)) {
      alert("A detailed clinical reason for amendment is required (min 10 characters).");
      return;
    }

    setIsSigning(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: data.note?.id,
          encounterId: data.encounter.id,
          patientId: data.patient.id,
          ...noteForm,
          isAmendment,
          amendmentReason: isAmendment ? amendmentReason : null,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Signing failed");

      setIsAmendModalOpen(false);
      setAmendmentReason("");
      alert(
        isAmendment
          ? "Consultation amendment note digitally signed and appended to immutable health record."
          : "Consultation note digitally signed! Encounter marked completed."
      );
      fetchEncounterDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSigning(false);
    }
  };

  // Quick Order Set Placement
  const standardTestList = [
    { name: "Complete Blood Count (CBC) with ESR", price: 450, type: "LAB" },
    { name: "Comprehensive Metabolic Panel (CMP)", price: 1200, type: "LAB" },
    { name: "Lipid Profile Full Panel", price: 850, type: "LAB" },
    { name: "Cardiac Troponin-I Quantitative", price: 1400, type: "LAB" },
    { name: "12-Lead Electrocardiogram (ECG)", price: 600, type: "INVESTIGATION" },
    { name: "Digital Chest X-Ray PA View", price: 750, type: "RADIOLOGY" },
    { name: "2D Echocardiography with Color Doppler", price: 2800, type: "INVESTIGATION" },
  ];

  const toggleTest = (test) => {
    if (selectedTests.some((t) => t.name === test.name)) {
      setSelectedTests(selectedTests.filter((t) => t.name !== test.name));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const handlePlaceOrders = async () => {
    if (selectedTests.length === 0) {
      alert("Select at least one test from the order sets.");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const items = selectedTests.map((t) => ({
        itemDescription: t.name,
        quantity: 1,
        unitPrice: t.price,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId: data.encounter.id,
          patientId: data.patient.id,
          orderType: "LAB",
          priority: orderPriority,
          instructions: `Standard clinical diagnostic order set requested by attending clinician. Priority: ${orderPriority}`,
          items,
        }),
      });

      if (!res.ok) throw new Error("Failed to place orders");
      alert(`Diagnostic orders successfully dispatched to Laboratory & Radiology!`);
      setSelectedTests([]);
      fetchEncounterDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Quick Prescription Handlers
  const addRxItem = () => {
    setRxItems([
      ...rxItems,
      {
        medicationName: "",
        genericName: "",
        dosage: "",
        route: "ORAL",
        frequency: "1-0-1",
        duration: "5 days",
        instructions: "After meals",
      },
    ]);
  };

  const removeRxItem = (idx) => {
    setRxItems(rxItems.filter((_, i) => i !== idx));
  };

  const handleIssuePrescription = async () => {
    const validItems = rxItems.filter((item) => item.medicationName.trim());
    if (validItems.length === 0) {
      alert("Add at least one valid medication name.");
      return;
    }

    setIsIssuingRx(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId: data.encounter.id,
          patientId: data.patient.id,
          instructions: rxInstructions,
          items: validItems,
        }),
      });
      if (!res.ok) throw new Error("Failed to issue prescription");
      alert("Prescription issued and routed to Central Hospital Pharmacy worklist!");
      fetchEncounterDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsIssuingRx(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading Doctor Consultation Workspace...</div>;
  }

  if (!data?.encounter) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-sm font-bold text-slate-800">Encounter Record Not Found</h2>
        <Link href="/opd" className="text-xs text-teal-700 underline mt-2 block">
          Return to OPD Queue
        </Link>
      </div>
    );
  }

  const { encounter, patient, allergies, conditions, vitals, note, orders, prescriptions } = data;
  const latestVitals = vitals[0] || null;
  const isSigned = note?.isSigned;

  return (
    <div className="space-y-4">
      {/* Return to queue button & status bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/opd"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to OPD Queue
        </Link>

        <div className="flex items-center gap-2">
          {isSigned ? (
            <Badge variant="teal" className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Consultation Signed & Sealed
            </Badge>
          ) : (
            <Badge variant="warning">Draft In Progress</Badge>
          )}
          <Badge variant="default" className="font-mono text-[11px]">
            {encounter.encounterNumber}
          </Badge>
        </div>
      </div>

      {/* Mandatory Global Patient Header (Section 10) */}
      <div className="rounded-xl overflow-hidden shadow-sm">
        <GlobalPatientHeader patient={patient} encounter={encounter} />
      </div>

      {/* 3-Column Clinical Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Patient Summary (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Vitals Card */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-teal-700" />
                  Latest Vitals
                </CardTitle>
                <Link
                  href={`/vitals?encounterId=${encounter.id}&patientId=${patient.id}`}
                  className="text-[11px] text-teal-700 hover:underline font-semibold"
                >
                  + Record
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-xs">
              {latestVitals ? (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Blood Pressure:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {latestVitals.systolicBp}/{latestVitals.diastolicBp} mmHg
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Heart Rate:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {latestVitals.heartRate} bpm
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Oxygen Saturation:</span>
                    <span className={`font-mono font-bold ${latestVitals.spo2Percent < 92 ? "text-red-600" : "text-emerald-700"}`}>
                      {latestVitals.spo2Percent}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Body Temp:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {latestVitals.temperatureCelsius || "36.8"} °C
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Weight & BMI:</span>
                    <span className="font-mono text-slate-900">
                      {latestVitals.weightKg ? `${latestVitals.weightKg} kg` : "-"} {latestVitals.bmi ? `(${latestVitals.bmi})` : ""}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-3 text-center text-slate-400">
                  <span>No vitals recorded yet.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Allergies Warning Alert */}
          <Card className="border-amber-200">
            <CardHeader className="py-3 px-4 bg-amber-50/60">
              <CardTitle className="text-xs text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Allergy Precautions ({allergies.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-3 space-y-1.5 text-xs">
              {allergies.length === 0 ? (
                <span className="text-slate-400">No known drug allergies.</span>
              ) : (
                allergies.map((al) => (
                  <div key={al.id} className="p-2 bg-amber-50 rounded border border-amber-200">
                    <div className="font-bold text-amber-900">{al.allergen}</div>
                    <div className="text-[11px] text-amber-800">{al.reaction}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chronic Problem List */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs">Active Problem List</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1 text-xs">
              {conditions.length === 0 ? (
                <span className="text-slate-400">No chronic problems logged.</span>
              ) : (
                conditions.map((cond) => (
                  <div key={cond.id} className="py-1 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{cond.conditionName}</span>
                    <Badge variant="default" className="text-[10px] font-mono">{cond.icdCode || "ICD-10"}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Full EHR Link */}
          <Link
            href={`/patients/${patient.id}`}
            target="_blank"
            className="block text-center py-2 px-3 bg-white hover:bg-slate-50 text-teal-800 rounded-xl text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
          >
            Open Complete Patient EHR ↗
          </Link>
        </div>

        {/* CENTER COLUMN: Consultation Notes Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-teal-700" />
                  Clinical Documentation Workspace
                </CardTitle>
                <CardDescription>SOAP Progress Note, ICD Diagnoses, Plan & Follow-up</CardDescription>
              </div>

              {/* Status Indicator */}
              {isSigned && (
                <Badge variant="teal" className="text-[10px]">
                  Immutable Signed
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {/* Primary Diagnosis */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Primary Clinical Diagnosis (ICD-10) *
                </label>
                <input
                  type="text"
                  disabled={isSigned}
                  placeholder="e.g. Exertional Angina Pectoris (I20.9)"
                  value={noteForm.primaryDiagnosis}
                  onChange={(e) => setNoteForm({ ...noteForm, primaryDiagnosis: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-teal-900 bg-teal-50/30 focus:border-teal-600 focus:outline-none"
                />
              </div>

              {/* Subjective: Chief Complaint & History */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Subjective: History of Present Illness (HPI)
                </label>
                <textarea
                  rows={2}
                  disabled={isSigned}
                  placeholder="Document patient narrative, symptom onset, quality, duration, aggravating/relieving factors..."
                  value={noteForm.subjective}
                  onChange={(e) => setNoteForm({ ...noteForm, subjective: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-teal-600 focus:outline-none"
                />
              </div>

              {/* Objective: Physical Exam */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Objective: Physical Examination & Clinical Findings
                </label>
                <textarea
                  rows={2}
                  disabled={isSigned}
                  placeholder="General condition, CVS (heart sounds, murmurs), RS (breath sounds), P/A, CNS findings..."
                  value={noteForm.objective}
                  onChange={(e) => setNoteForm({ ...noteForm, objective: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-teal-600 focus:outline-none"
                />
              </div>

              {/* Assessment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Assessment & Differential Considerations
                </label>
                <textarea
                  rows={2}
                  disabled={isSigned}
                  placeholder="Clinical synthesis, risk stratification, differential diagnoses considered..."
                  value={noteForm.assessment}
                  onChange={(e) => setNoteForm({ ...noteForm, assessment: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-teal-600 focus:outline-none"
                />
              </div>

              {/* Plan & Advice */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Treatment Plan & Patient Education
                </label>
                <textarea
                  rows={2}
                  disabled={isSigned}
                  placeholder="Lifestyle modification, dietary advice, warning red-flags for ER visit..."
                  value={noteForm.plan}
                  onChange={(e) => setNoteForm({ ...noteForm, plan: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-teal-600 focus:outline-none"
                />
              </div>

              {/* Follow-up & Referrals */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Follow-up Date</label>
                  <input
                    type="date"
                    disabled={isSigned}
                    value={noteForm.followUpDate}
                    onChange={(e) => setNoteForm({ ...noteForm, followUpDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Specialty Referral</label>
                  <select
                    disabled={isSigned}
                    value={noteForm.referralDepartmentId}
                    onChange={(e) => setNoteForm({ ...noteForm, referralDepartmentId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  >
                    <option value="">No Referral Needed</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admission Request Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-900">
                  <input
                    type="checkbox"
                    disabled={isSigned}
                    checked={noteForm.admissionRequested}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, admissionRequested: e.target.checked })
                    }
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span>Direct Hospital Inpatient Admission Request (IPD)</span>
                </label>

                {noteForm.admissionRequested && (
                  <div className="pl-6 pt-1">
                    <Select
                      label="Recommended Admission Ward Type"
                      disabled={isSigned}
                      value={noteForm.admissionWardType}
                      onChange={(e) => setNoteForm({ ...noteForm, admissionWardType: e.target.value })}
                    >
                      <option value="WARD-ICU">Intensive Care Unit (ICU)</option>
                      <option value="WARD-CCU">Coronary Care Unit (CCU)</option>
                      <option value="WARD-GM-M">General Medical Ward</option>
                      <option value="WARD-PVT">Private Suite</option>
                    </Select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                {!isSigned ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraft}
                      isLoading={isSaving}
                      className="gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Draft
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSignNote(false)}
                      isLoading={isSigning}
                      className="gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" /> Sign Consultation Note
                    </Button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Signed: {formatDateTime(note?.signedAt)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAmendModalOpen(true)}
                      className="gap-1 text-teal-800 border-teal-300 hover:bg-teal-50"
                    >
                      <FileEdit className="w-3.5 h-3.5" /> Amend Note
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Quick Order Sets & Prescriptions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Investigation Orders */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-purple-700" />
                  Investigation Order Sets ({orders.length} Placed)
                </CardTitle>
                <Select
                  value={orderPriority}
                  onChange={(e) => setOrderPriority(e.target.value)}
                  className="w-24 text-[11px] p-1"
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="STAT">STAT / Emergency</option>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2.5 text-xs">
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {standardTestList.map((test, i) => {
                  const isChecked = selectedTests.some((t) => t.name === test.name);
                  return (
                    <label
                      key={i}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                        isChecked
                          ? "bg-purple-50 border-purple-300 text-purple-950 font-semibold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTest(test)}
                          className="rounded text-purple-700"
                        />
                        <span className="text-xs">{test.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">₹{test.price}</span>
                    </label>
                  );
                })}
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={handlePlaceOrders}
                isLoading={isPlacingOrder}
                className="w-full text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Dispatch Selected Orders ({selectedTests.length})
              </Button>

              {/* Already Placed Orders */}
              {orders.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Active Diagnostic Orders
                  </span>
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-1.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-medium text-slate-800">{ord.orderNumber}</span>
                      <Badge variant="teal" className="text-[9px] py-0">{ord.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Prescription Builder */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-emerald-700" />
                  Electronic Prescription (Rx)
                </CardTitle>
                <button
                  type="button"
                  onClick={addRxItem}
                  className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Drug
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3 text-xs">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {rxItems.map((rx, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <input
                        type="text"
                        placeholder="Drug Brand / Molecule (e.g. Tab. Atorva)"
                        value={rx.medicationName}
                        onChange={(e) => {
                          const copy = [...rxItems];
                          copy[idx].medicationName = e.target.value;
                          setRxItems(copy);
                        }}
                        className="flex-1 rounded border border-slate-300 p-1.5 text-xs font-bold text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Dose"
                        value={rx.dosage}
                        onChange={(e) => {
                          const copy = [...rxItems];
                          copy[idx].dosage = e.target.value;
                          setRxItems(copy);
                        }}
                        className="w-16 rounded border border-slate-300 p-1.5 text-xs bg-white text-center font-mono"
                      />
                      {rxItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRxItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="Frequency (e.g. 1-0-1)"
                        value={rx.frequency}
                        onChange={(e) => {
                          const copy = [...rxItems];
                          copy[idx].frequency = e.target.value;
                          setRxItems(copy);
                        }}
                        className="rounded border border-slate-300 p-1 text-xs bg-white text-center font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g. 30 days)"
                        value={rx.duration}
                        onChange={(e) => {
                          const copy = [...rxItems];
                          copy[idx].duration = e.target.value;
                          setRxItems(copy);
                        }}
                        className="rounded border border-slate-300 p-1 text-xs bg-white text-center"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Timing (e.g. After dinner)"
                      value={rx.instructions}
                      onChange={(e) => {
                        const copy = [...rxItems];
                        copy[idx].instructions = e.target.value;
                        setRxItems(copy);
                      }}
                      className="w-full rounded border border-slate-300 p-1 text-[11px] bg-white text-slate-600"
                    />
                  </div>
                ))}
              </div>

              <Button
                size="sm"
                onClick={handleIssuePrescription}
                isLoading={isIssuingRx}
                className="w-full text-xs gap-1 bg-emerald-700 hover:bg-emerald-800 border-emerald-800"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Sign & Transmit Rx to Pharmacy
              </Button>

              {/* Already Issued Prescriptions */}
              {prescriptions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Issued Rx Records
                  </span>
                  {prescriptions.map((p) => (
                    <div
                      key={p.id}
                      className="p-1.5 rounded bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-bold text-emerald-900">{p.prescriptionNumber}</span>
                      <span className="text-emerald-700 font-medium">({p.items?.length || 0} drugs)</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Amendment Modal for Signed Notes */}
      <Modal
        isOpen={isAmendModalOpen}
        onClose={() => setIsAmendModalOpen(false)}
        title="Amend Digitally Signed Clinical Record"
        description="Statutory Medical Legal Compliance: Original note remains preserved in audit ledger"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-1">
            <strong>IMMUTABLE RECORD AMENDMENT PROTOCOL:</strong>
            <p>
              Under NABH and MCI documentation rules, signed medical notes cannot be overwritten.
              Your amendment will be linked with a timestamp and reason.
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Clinical Reason for Amendment *</label>
            <textarea
              rows={3}
              placeholder="e.g. Added revised Troponin-I and Echo findings following urgent cardiologist review..."
              value={amendmentReason}
              onChange={(e) => setAmendmentReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsAmendModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSignNote(true)}
              isLoading={isSigning}
            >
              Sign & Link Amendment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


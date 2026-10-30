"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BedDouble,
  Pill,
  HeartPulse,
  ArrowRightLeft,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  User,
  ShieldAlert,
  Droplet,
  Activity,
  AlertCircle,
  Check,
  Send,
  XCircle,
  Calendar,
  Layers,
  Printer,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function InpatientWorkspacePage() {
  const params = useParams();
  const admissionId = params?.id;
  const router = useRouter();

  const [admission, setAdmission] = useState(null);
  const [emarRecords, setEmarRecords] = useState([]);
  const [nursingNotes, setNursingNotes] = useState([]);
  const [dischargeSummary, setDischargeSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("emar"); // emar, nursing, discharge

  // Administer Dialog State
  const [administerModalOpen, setAdministerModalOpen] = useState(false);
  const [selectedEmar, setSelectedEmar] = useState(null);
  const [adminStatus, setAdminStatus] = useState("GIVEN");
  const [preVitals, setPreVitals] = useState("BP: 124/80, Pulse: 72");
  const [heldReason, setHeldReason] = useState("");
  const [nurseNotes, setNurseNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Nursing Shift Note State
  const [intakeOral, setIntakeOral] = useState(250);
  const [intakeIv, setIntakeIv] = useState(500);
  const [outputUrine, setOutputUrine] = useState(600);
  const [outputDrain, setOutputDrain] = useState(0);
  const [fallScore, setFallScore] = useState(15);
  const [painScore, setPainScore] = useState(2);
  const [sbar, setSbar] = useState("");
  const [nurseSummary, setNurseSummary] = useState("");

  useEffect(() => {
    if (admissionId) {
      loadInpatientData();
    }
  }, [admissionId]);

  const loadInpatientData = async () => {
    setIsLoading(true);
    try {
      const [admRes, emarRes, noteRes, disRes] = await Promise.all([
        fetch(`/api/ipd/admissions?status=ALL`),
        fetch(`/api/ipd/emar?admissionId=${admissionId}`),
        fetch(`/api/ipd/nursing-notes?admissionId=${admissionId}`),
        fetch(`/api/ipd/discharge?admissionId=${admissionId}`),
      ]);

      const admData = await admRes.json();
      const emarData = await emarRes.json();
      const noteData = await noteRes.json();
      const disData = await disRes.json();

      if (admData.success) {
        const current = admData.admissions.find((a) => String(a.id) === String(admissionId));
        setAdmission(current || null);
      }
      if (emarData.success) setEmarRecords(emarData.records || []);
      if (noteData.success) setNursingNotes(noteData.notes || []);
      if (disData.success) setDischargeSummary(disData.summary || null);
    } catch (err) {
      console.error("Failed to load inpatient file:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Administration Modal
  const openAdministerModal = (record) => {
    setSelectedEmar(record);
    setAdminStatus("GIVEN");
    setPreVitals(record.preAdministrationVitals || "BP: 120/80, Pulse: 74");
    setHeldReason("");
    setNurseNotes("");
    setAdministerModalOpen(true);
  };

  // Submit Medication Administration Event
  const handleAdministerSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ipd/emar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: selectedEmar.id,
          status: adminStatus,
          preAdministrationVitals: preVitals,
          heldReason: adminStatus === "HELD" ? heldReason : null,
          clinicalNotes: nurseNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`eMAR Signed: ${selectedEmar.medicationName} marked as ${adminStatus}!`);
        setAdministerModalOpen(false);
        loadInpatientData();
      } else {
        alert(data.error || "Failed to sign eMAR");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Shift Nursing Note & Fluid Balance
  const handleSaveNursingNote = async (e) => {
    e.preventDefault();
    if (!nurseSummary) {
      alert("Please enter nursing progress summary.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ipd/nursing-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionId: admission.id,
          encounterId: admission.encounterId,
          patientId: admission.patientId,
          shift: "MORNING",
          intakeOralMl: intakeOral,
          intakeIvMl: intakeIv,
          outputUrineMl: outputUrine,
          outputDrainMl: outputDrain,
          fallRiskScore: fallScore,
          painScore,
          sbarHandover: sbar,
          nursingSummary: nurseSummary,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Nursing care note saved! Net Fluid Balance: ${data.fluidBalanceMl > 0 ? "+" : ""}${data.fluidBalanceMl} mL`);
        setNurseSummary("");
        loadInpatientData();
      } else {
        alert(data.error || "Failed to save nursing note");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading inpatient workspace...</div>;
  }

  if (!admission) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Inpatient File Not Found</h2>
        <Link href="/ipd">
          <Button variant="outline">Back to Ward Board</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link href="/ipd" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700">
          <ChevronLeft className="w-4 h-4" />
          Back to Inpatient Census
        </Link>
      </div>

      {/* GLOBAL INPATIENT HEADER */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 flex flex-col items-center justify-center text-white font-bold shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-200">BED</span>
              <span className="text-xl font-black">{admission.bedNumber}</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">{admission.patientName}</h1>
                <span className="font-mono text-xs px-2 py-0.5 bg-slate-800 text-teal-300 rounded border border-slate-700">
                  {admission.patientUhid}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 bg-teal-950 text-teal-400 border border-teal-800 rounded">
                  {admission.admissionNumber}
                </span>
                <Badge variant={admission.status === "ADMITTED" ? "success" : "secondary"}>
                  {admission.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                <span>Ward: <strong>{admission.wardName}</strong></span>
                <span>• Attending: <strong>{admission.primaryConsultantName}</strong></span>
                <span>• Stay: <strong>{admission.daysOfStay} days</strong></span>
                <span>• Diet: <strong className="text-teal-300">{admission.dietType}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right text-xs">
              <div className="text-slate-400">Provisional Diagnosis:</div>
              <div className="font-semibold text-teal-300 max-w-xs truncate">
                {admission.provisionalDiagnosis}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("emar")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "emar"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Pill className="w-4 h-4" />
          eMAR (Medication Administration) ({emarRecords.length})
        </button>
        <button
          onClick={() => setActiveTab("nursing")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "nursing"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Droplet className="w-4 h-4" />
          Fluid Balance & Nursing Care ({nursingNotes.length})
        </button>
        <button
          onClick={() => setActiveTab("discharge")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "discharge"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          Discharge Summary
        </button>
      </div>

      {/* eMAR TAB */}
      {activeTab === "emar" && (
        <div className="space-y-4">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                <strong>eMAR Safety Verification Active:</strong> Prescription, pharmacy dispensing, and nursing administration are strictly decoupled. Record vitals prior to high-risk doses.
              </span>
            </div>
            <Button size="xs" variant="outline" onClick={loadInpatientData}>
              Refresh Doses
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Prescribed Inpatient Pharmacotherapy Schedule</h3>
              <span className="text-xs text-slate-500">Nurse Direct Administration Stamp</span>
            </div>

            <div className="divide-y divide-slate-100">
              {emarRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No scheduled medication doses on chart.</div>
              ) : (
                emarRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-teal-50 text-teal-800 font-bold mt-1">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{record.medicationName}</span>
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                            {record.dosage}
                          </span>
                          <Badge variant="outline">{record.route}</Badge>
                          <Badge
                            variant={
                              record.status === "GIVEN"
                                ? "success"
                                : record.status === "HELD"
                                ? "warning"
                                : record.status === "REFUSED"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {record.status}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-500 mt-1">
                          Scheduled: <strong>{new Date(record.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                          {record.administeredTime && (
                            <span> • Administered at {new Date(record.administeredTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} by <strong>{record.nurseName || "Attending Nurse"}</strong></span>
                          )}
                          {record.preAdministrationVitals && (
                            <span className="text-teal-800 font-medium ml-2">• Pre-vitals: [{record.preAdministrationVitals}]</span>
                          )}
                          {record.heldReason && (
                            <span className="text-amber-700 font-medium ml-2">• Held: {record.heldReason}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {record.status === "SCHEDULED" ? (
                        <Button
                          size="sm"
                          onClick={() => openAdministerModal(record)}
                          className="bg-teal-700 hover:bg-teal-800 text-white text-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Sign Administration
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => openAdministerModal(record)}
                          className="text-xs"
                        >
                          Update Status
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLUID BALANCE & NURSING CARE TAB */}
      {activeTab === "nursing" && (
        <div className="space-y-6">
          {/* New Shift Care Entry Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              Shift Nursing Documentation & Fluid Balance Entry
            </h3>

            <form onSubmit={handleSaveNursingNote} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Oral Intake (mL)</label>
                  <input
                    type="number"
                    value={intakeOral}
                    onChange={(e) => setIntakeOral(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IV Fluid Intake (mL)</label>
                  <input
                    type="number"
                    value={intakeIv}
                    onChange={(e) => setIntakeIv(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded text-sm font-semibold text-teal-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urine Output (mL)</label>
                  <input
                    type="number"
                    value={outputUrine}
                    onChange={(e) => setOutputUrine(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded text-sm font-semibold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Drain / Gastric (mL)</label>
                  <input
                    type="number"
                    value={outputDrain}
                    onChange={(e) => setOutputDrain(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded text-sm font-semibold text-amber-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between font-semibold">
                <span>Calculated Fluid Balance:</span>
                <span className={`text-sm font-mono font-bold ${intakeOral + intakeIv - outputUrine - outputDrain >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                  {intakeOral + intakeIv - outputUrine - outputDrain > 0 ? "+" : ""}
                  {intakeOral + intakeIv - outputUrine - outputDrain} mL
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pain Score (0 to 10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={painScore}
                    onChange={(e) => setPainScore(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Morse Fall Risk Score</label>
                  <input
                    type="number"
                    value={fallScore}
                    onChange={(e) => setFallScore(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  SBAR Shift Handover Note (Situation, Background, Assessment, Recommendation)
                </label>
                <textarea
                  rows={2}
                  placeholder="S: Patient stable. B: Post PCI. A: Telemetry sinus rhythm. R: Continue antiplatelet & vitals Q4H."
                  value={sbar}
                  onChange={(e) => setSbar(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Comprehensive Nursing Summary</label>
                <textarea
                  rows={2}
                  placeholder="Patient conscious, oriented, IV cannula patent, vitals stable throughout shift..."
                  value={nurseSummary}
                  onChange={(e) => setNurseSummary(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="bg-teal-700 hover:bg-teal-800 text-white">
                  {isSubmitting ? "Saving..." : "Save Shift Nursing Chart"}
                </Button>
              </div>
            </form>
          </div>

          {/* Historical Care Logs */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Inpatient Nursing Care History</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {nursingNotes.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No shift care notes logged yet.</div>
              ) : (
                nursingNotes.map((note) => (
                  <div key={note.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{note.shift} SHIFT</Badge>
                        <span className="font-bold text-slate-800">{note.nurseName}</span>
                        <span className="text-slate-400">({new Date(note.createdAt).toLocaleString()})</span>
                      </div>
                      <div className="font-mono font-bold text-teal-800">
                        Net Fluid Balance: {note.fluidBalanceMl > 0 ? "+" : ""}{note.fluidBalanceMl} mL
                      </div>
                    </div>

                    <p className="text-slate-700">{note.nursingSummary}</p>

                    {note.sbarHandover && (
                      <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-600">
                        <strong>SBAR:</strong> {note.sbarHandover}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* DISCHARGE SUMMARY TAB */}
      {activeTab === "discharge" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Official Clinical Discharge Summary</h2>
              <p className="text-xs text-slate-500">Statutory Inpatient Discharge Document</p>
            </div>
            {dischargeSummary && (
              <Badge variant="success" className="text-xs">
                Digitally Signed & Released
              </Badge>
            )}
          </div>

          {!dischargeSummary ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p>Patient is currently active in the inpatient ward. Discharge summary will be generated upon formal medical discharge.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Admission Diagnosis:</span>
                  <div className="font-semibold">{dischargeSummary.admissionDiagnosis}</div>
                </div>
                <div>
                  <span className="text-slate-500 block">Final Diagnosis:</span>
                  <div className="font-bold text-teal-900">{dischargeSummary.finalDiagnosis}</div>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[11px]">
                  Hospital Course & Clinical Summary:
                </span>
                <p className="p-3 bg-white rounded-lg border border-slate-200 leading-relaxed">
                  {dischargeSummary.hospitalCourse}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Condition at Discharge:</span>
                  <div className="font-bold text-emerald-700">{dischargeSummary.conditionAtDischarge}</div>
                </div>
                <div>
                  <span className="text-slate-500 block">Follow-up Consultation:</span>
                  <div className="font-semibold">{dischargeSummary.followUpDate || "1 Week"}</div>
                </div>
              </div>

              <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-800">
                <strong>Emergency Warning Signs:</strong> {dischargeSummary.emergencyWarningSigns}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMINISTER eMAR MODAL */}
      {administerModalOpen && selectedEmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Sign Medication Administration</h3>
                <p className="text-xs text-slate-500">
                  {selectedEmar.medicationName} ({selectedEmar.dosage} {selectedEmar.route})
                </p>
              </div>
              <button onClick={() => setAdministerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administration Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {["GIVEN", "HELD", "REFUSED"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAdminStatus(st)}
                      className={`p-2 rounded-lg border font-bold text-center ${
                        adminStatus === st
                          ? st === "GIVEN"
                            ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                            : st === "HELD"
                            ? "bg-amber-50 border-amber-600 text-amber-800"
                            : "bg-red-50 border-red-600 text-red-800"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pre-Administration Vitals</label>
                <input
                  type="text"
                  value={preVitals}
                  onChange={(e) => setPreVitals(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>

              {adminStatus === "HELD" && (
                <div>
                  <label className="block font-semibold text-amber-800 mb-1">Clinical Reason for Holding Dose</label>
                  <input
                    type="text"
                    placeholder="e.g. SBP < 100 mmHg, Patient fasting for endoscopy..."
                    value={heldReason}
                    onChange={(e) => setHeldReason(e.target.value)}
                    className="w-full p-2 border border-amber-300 rounded bg-amber-50"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nurse Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Patient tolerated dose well with water..."
                  value={nurseNotes}
                  onChange={(e) => setNurseNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setAdministerModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdministerSubmit} disabled={isSubmitting} className="bg-teal-700 hover:bg-teal-800 text-white">
                {isSubmitting ? "Signing..." : "Sign Administration Record"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


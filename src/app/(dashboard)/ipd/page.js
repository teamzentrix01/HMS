"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BedDouble,
  UserPlus,
  ArrowRightLeft,
  FileText,
  Clock,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  User,
  HeartPulse,
  Pill,
  XCircle,
  Plus,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function IpdManagementPage() {
  const [admissions, setAdmissions] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState("ALL");
  const [selectedDoctor, setSelectedDoctor] = useState("ALL");
  const [activeTab, setActiveTab] = useState("admitted"); // admitted, discharged

  // Admission Modal State
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    patientId: "",
    departmentId: "2", // Cardiology default
    admittingDoctorId: "",
    primaryConsultantId: "",
    wardId: "",
    bedId: "",
    admissionSource: "OPD_REFERRAL",
    provisionalDiagnosis: "",
    plannedProcedures: "",
    dietType: "NORMAL",
  });
  const [availableBeds, setAvailableBeds] = useState([]);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferType, setTransferType] = useState("BED_TRANSFER");
  const [toWardId, setToWardId] = useState("");
  const [toBedId, setToBedId] = useState("");
  const [toDoctorId, setToDoctorId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");

  // Discharge Modal State
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [dischargeType, setDischargeType] = useState("ROUTINE");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [hospitalCourse, setHospitalCourse] = useState("");
  const [conditionAtDischarge, setConditionAtDischarge] = useState("STABLE");
  const [followUpDate, setFollowUpDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [admRes, wardRes, bedRes, staffRes] = await Promise.all([
        fetch("/api/ipd/admissions?status=ALL"),
        fetch("/api/admin/wards-beds"),
        fetch("/api/admin/wards-beds?type=beds"),
        fetch("/api/staff"),
      ]);

      const admData = await admRes.json();
      const wardData = await wardRes.json();
      const staffData = await staffRes.json();

      if (admData.success) setAdmissions(admData.admissions || []);
      if (wardData.wards) {
        setWards(wardData.wards || []);
        // Extract all beds
        const allBeds = wardData.wards.flatMap((w) => w.beds || []);
        setBeds(allBeds);
      }
      if (staffData.staff) {
        const docs = staffData.staff.filter((s) => s.roleSlug?.includes("doctor"));
        setDoctors(docs);
      }
    } catch (err) {
      console.error("Failed to load IPD data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter beds when ward changes in Admit modal
  const handleWardChange = (wId) => {
    setAdmitForm((prev) => ({ ...prev, wardId: wId, bedId: "" }));
    const wardObj = wards.find((w) => w.id === parseInt(wId));
    const avail = (wardObj?.beds || []).filter((b) => b.status === "AVAILABLE");
    setAvailableBeds(avail);
  };

  // Submit Admission
  const handleAdmitSubmit = async () => {
    if (!admitForm.patientId || !admitForm.wardId || !admitForm.bedId || !admitForm.provisionalDiagnosis) {
      alert("Please fill all mandatory admission fields: Patient ID, Ward, Bed, and Diagnosis.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ipd/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admitForm),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Inpatient Admitted Successfully!\nAdmission #: ${data.admissionNumber}\nAllocated Bed: ${data.bedNumber}`);
        setAdmitModalOpen(false);
        fetchData();
      } else {
        alert(data.error || "Admission failed");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Transfer Modal
  const openTransferModal = (adm) => {
    setTransferTarget(adm);
    setTransferType("BED_TRANSFER");
    setToWardId(String(adm.wardId));
    setToBedId("");
    setToDoctorId(String(adm.primaryConsultantId));
    setTransferReason("");
    setHandoverNotes("");

    const wardObj = wards.find((w) => w.id === adm.wardId);
    setAvailableBeds((wardObj?.beds || []).filter((b) => b.status === "AVAILABLE"));
    setTransferModalOpen(true);
  };

  // Submit Transfer
  const handleTransferSubmit = async () => {
    if (!transferReason) {
      alert("Please provide a clinical reason for transfer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ipd/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionId: transferTarget.id,
          transferType,
          toWardId: toWardId ? parseInt(toWardId) : null,
          toBedId: toBedId ? parseInt(toBedId) : null,
          toDoctorId: toDoctorId ? parseInt(toDoctorId) : null,
          reason: transferReason,
          handoverNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Transfer executed successfully! Bed occupancy and handover updated.");
        setTransferModalOpen(false);
        fetchData();
      } else {
        alert(data.error || "Transfer failed");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Discharge Modal
  const openDischargeModal = (adm) => {
    setDischargeTarget(adm);
    setDischargeType("ROUTINE");
    setFinalDiagnosis(adm.provisionalDiagnosis);
    setHospitalCourse("Patient admitted and treated as per standard protocol. Hemodynamically stable. Discharged on oral medications.");
    setConditionAtDischarge("STABLE");
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setFollowUpDate(nextWeek.toISOString().split("T")[0]);
    setDischargeModalOpen(true);
  };

  // Submit Discharge
  const handleDischargeSubmit = async () => {
    if (!finalDiagnosis || !hospitalCourse) {
      alert("Please complete Final Diagnosis and Hospital Course.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ipd/discharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionId: dischargeTarget.id,
          dischargeType,
          finalDiagnosis,
          hospitalCourse,
          conditionAtDischarge,
          followUpDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setDischargeModalOpen(false);
        fetchData();
      } else {
        alert(data.error || "Discharge failed");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAdmissions = admissions.filter((adm) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      adm.patientName?.toLowerCase().includes(q) ||
      adm.patientUhid?.toLowerCase().includes(q) ||
      adm.admissionNumber?.toLowerCase().includes(q) ||
      adm.bedNumber?.toLowerCase().includes(q) ||
      adm.primaryConsultantName?.toLowerCase().includes(q) ||
      adm.admittingDoctorName?.toLowerCase().includes(q);

    const matchesWard = selectedWard === "ALL" || adm.wardId === parseInt(selectedWard);
    const matchesDoctor = selectedDoctor === "ALL" || String(adm.primaryConsultantId) === String(selectedDoctor);

    if (activeTab === "admitted") {
      return matchesSearch && matchesWard && matchesDoctor && adm.status === "ADMITTED";
    }
    return matchesSearch && matchesWard && matchesDoctor && adm.status !== "ADMITTED";
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 rounded-lg text-teal-800">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Inpatient Department & Ward Management (IPD)
              </h1>
              <p className="text-xs text-slate-500">
                Admission Desk • Live Bed Census • Inpatient Rounds • eMAR • Transfers & Discharge Summaries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAdmitModalOpen(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Admit Inpatient
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Ward Occupancy Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Active Inpatients</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {admissions.filter((a) => a.status === "ADMITTED").length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Beds Occupied</span>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {beds.filter((b) => b.status === "OCCUPIED").length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Beds Available</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {beds.filter((b) => b.status === "AVAILABLE").length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Beds In Cleaning</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {beds.filter((b) => b.status === "CLEANING").length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("admitted")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "admitted"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BedDouble className="w-4 h-4" />
          Active Inpatients ({admissions.filter((a) => a.status === "ADMITTED").length})
        </button>
        <button
          onClick={() => setActiveTab("discharged")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "discharged"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <LogOut className="w-4 h-4" />
          Discharged Patients ({admissions.filter((a) => a.status !== "ADMITTED").length})
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient Name, UHID, Doctor/Consultant, IPD #, or Bed Number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="ALL">All Attending Doctors ({doctors.length})</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.firstName} {d.lastName}
              </option>
            ))}
          </select>

          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="ALL">All Wards / ICUs</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inpatients List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading inpatient census...</div>
      ) : filteredAdmissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          No inpatient records found matching criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAdmissions.map((adm) => (
            <div
              key={adm.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 hover:border-teal-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex flex-col items-center justify-center text-teal-800 font-bold shrink-0">
                    <span className="text-[10px] font-mono leading-none">BED</span>
                    <span className="text-base font-black leading-tight">{adm.bedNumber}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">{adm.patientName}</span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {adm.patientUhid}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-md">
                        {adm.admissionNumber}
                      </span>
                      <Badge variant={adm.status === "ADMITTED" ? "success" : "secondary"}>
                        {adm.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {adm.wardName} ({adm.wardCode}) • Attending: <strong>{adm.primaryConsultantName || adm.admittingDoctorName}</strong> ({adm.departmentName}) • Length of Stay: <strong>{adm.daysOfStay} days</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/ipd/${adm.id}`}>
                    <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Inpatient Workspace
                    </Button>
                  </Link>

                  {adm.status === "ADMITTED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTransferModal(adm)}
                        className="text-xs flex items-center gap-1"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Transfer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDischargeModal(adm)}
                        className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Discharge
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Clinical Overview Bar */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block mb-0.5">Provisional Diagnosis:</span>
                  <span className="font-semibold text-slate-800">{adm.provisionalDiagnosis}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block mb-0.5">Planned Procedures / Management:</span>
                  <span className="font-semibold text-slate-800">{adm.plannedProcedures || "Standard Medical Management"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Diet Plan:</span>
                    <span className="font-semibold text-teal-800">{adm.dietType} DIET</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Source:</span>
                    <span className="font-mono text-slate-700">{adm.admissionSource}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADMIT INPATIENT MODAL */}
      {admitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">New Inpatient Admission Desk</h3>
                <p className="text-xs text-slate-500">Lock bed allocation and initiate inpatient clinical file</p>
              </div>
              <button onClick={() => setAdmitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient ID (Select Patient)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1 (Rajesh Sharma)"
                    value={admitForm.patientId}
                    onChange={(e) => setAdmitForm({ ...admitForm, patientId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Admission Source</label>
                  <select
                    value={admitForm.admissionSource}
                    onChange={(e) => setAdmitForm({ ...admitForm, admissionSource: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="OPD_REFERRAL">OPD Consultation Referral</option>
                    <option value="EMERGENCY">Emergency Department Transfer</option>
                    <option value="DIRECT_PLANNED">Direct Planned Admission</option>
                    <option value="EXTERNAL_TRANSFER">External Hospital Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Inpatient Ward / ICU</label>
                  <select
                    value={admitForm.wardId}
                    onChange={(e) => handleWardChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-semibold"
                  >
                    <option value="">-- Choose Ward --</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Available Bed</label>
                  <select
                    value={admitForm.bedId}
                    onChange={(e) => setAdmitForm({ ...admitForm, bedId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-semibold text-teal-800"
                    disabled={!admitForm.wardId}
                  >
                    <option value="">-- Choose Bed --</option>
                    {availableBeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        Bed {b.bedNumber} ({b.type} • ₹{b.dailyCharge}/day)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Provisional Admission Diagnosis</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Decompensated Heart Failure, Angina Pectoris..."
                  value={admitForm.provisionalDiagnosis}
                  onChange={(e) => setAdmitForm({ ...admitForm, provisionalDiagnosis: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Diet Prescription</label>
                  <select
                    value={admitForm.dietType}
                    onChange={(e) => setAdmitForm({ ...admitForm, dietType: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="NORMAL">Standard Normal Hospital Diet</option>
                    <option value="DIABETIC">Diabetic Low Glycemic Diet</option>
                    <option value="RENAL">Renal Low Potassium/Protein Diet</option>
                    <option value="LIQUID">Clear Liquids Only</option>
                    <option value="NPO">NPO (Nil Per Os - Fasting for Surgery)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Planned Procedures</label>
                  <input
                    type="text"
                    placeholder="e.g. Echocardiogram, Coronary Angiogram..."
                    value={admitForm.plannedProcedures}
                    onChange={(e) => setAdmitForm({ ...admitForm, plannedProcedures: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setAdmitModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdmitSubmit} disabled={isSubmitting} className="bg-teal-700 hover:bg-teal-800 text-white">
                {isSubmitting ? "Admitting..." : "Confirm Inpatient Admission"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {transferModalOpen && transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Execute Clinical Transfer</h3>
                <p className="text-xs text-slate-500">
                  {transferTarget.patientName} ({transferTarget.patientUhid}) • Current Bed: {transferTarget.bedNumber}
                </p>
              </div>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transfer Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferType("BED_TRANSFER")}
                    className={`p-2 rounded-lg border text-center font-semibold ${
                      transferType === "BED_TRANSFER" ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Bed / Ward Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferType("CONSULTANT_TRANSFER")}
                    className={`p-2 rounded-lg border text-center font-semibold ${
                      transferType === "CONSULTANT_TRANSFER" ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Consultant Handover
                  </button>
                </div>
              </div>

              {transferType === "BED_TRANSFER" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Ward</label>
                    <select
                      value={toWardId}
                      onChange={(e) => {
                        setToWardId(e.target.value);
                        const wardObj = wards.find((w) => w.id === parseInt(e.target.value));
                        setAvailableBeds((wardObj?.beds || []).filter((b) => b.status === "AVAILABLE"));
                      }}
                      className="w-full p-2 border border-slate-300 rounded bg-white"
                    >
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Bed</label>
                    <select
                      value={toBedId}
                      onChange={(e) => setToBedId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-teal-800"
                    >
                      <option value="">-- Select Bed --</option>
                      {availableBeds.map((b) => (
                        <option key={b.id} value={b.id}>
                          Bed {b.bedNumber} ({b.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {transferType === "CONSULTANT_TRANSFER" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiving Consultant Doctor</label>
                  <select
                    value={toDoctorId}
                    onChange={(e) => setToDoctorId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-semibold"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.firstName} {d.lastName} ({d.departmentName || "Clinician"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Justification & Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Clinical step-down from ICU to General Ward, Hemodynamically stable"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Handover Notes</label>
                <textarea
                  rows={2}
                  placeholder="SBAR Handover notes to receiving ward nursing..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleTransferSubmit} disabled={isSubmitting} className="bg-teal-700 hover:bg-teal-800 text-white">
                {isSubmitting ? "Transferring..." : "Execute Transfer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DISCHARGE MODAL */}
      {dischargeModalOpen && dischargeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Inpatient Discharge Summary</h3>
                <p className="text-xs text-slate-500">
                  {dischargeTarget.patientName} ({dischargeTarget.patientUhid}) • Bed: {dischargeTarget.bedNumber}
                </p>
              </div>
              <button onClick={() => setDischargeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discharge Type</label>
                  <select
                    value={dischargeType}
                    onChange={(e) => setDischargeType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="ROUTINE">Routine Planned Discharge</option>
                    <option value="LAMA">LAMA (Left Against Medical Advice)</option>
                    <option value="TRANSFER">Transfer Out to Higher Center</option>
                    <option value="DECEASED">Deceased (Clinical Death)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Condition at Discharge</label>
                  <select
                    value={conditionAtDischarge}
                    onChange={(e) => setConditionAtDischarge(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-teal-800"
                  >
                    <option value="STABLE">Stable & Hemodynamically Intact</option>
                    <option value="IMPROVED">Clinically Improved</option>
                    <option value="CRITICAL">Critical / Guarded Prognosis</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Final Discharge Diagnosis</label>
                <input
                  type="text"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital Course Summary</label>
                <textarea
                  rows={3}
                  value={hospitalCourse}
                  onChange={(e) => setHospitalCourse(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Follow-up Consultation Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setDischargeModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDischargeSubmit} disabled={isSubmitting} className="bg-red-700 hover:bg-red-800 text-white">
                {isSubmitting ? "Discharging..." : "Sign Summary & Release Bed"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


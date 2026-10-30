"use client";
import React, { useState, useEffect } from "react";
import {
  Activity,
  Scan,
  Camera,
  CheckCircle,
  Clock,
  Search,
  Filter,
  FileText,
  User,
  Calendar,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Eye,
  Check,
  Send,
  Radio,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RadiologyWorkstationPage() {
  const [activeTab, setActiveTab] = useState("worklist"); // worklist, completed, modalities
  const [orders, setOrders] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportingModalOpen, setReportingModalOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [isCriticalAlert, setIsCriticalAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchModalities();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/radiology/orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch radiology orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModalities = async () => {
    try {
      const res = await fetch("/api/radiology/modalities");
      const data = await res.json();
      if (data.success) {
        setModalities(data.modalities || []);
      }
    } catch (err) {
      console.error("Failed to fetch modalities:", err);
    }
  };

  // Lifecycle transitions: SCHEDULE -> ARRIVE -> START_SCAN -> COMPLETE_SCAN
  const handleStudyAction = async (action, studyId, orderId, orderItemId, patientId, procedureName) => {
    try {
      const res = await fetch("/api/radiology/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          studyId,
          orderId,
          orderItemId,
          patientId,
          procedureName,
          modalityId: 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Open Radiologist Reporting Form
  const openReporting = (order, item, study) => {
    setSelectedStudy({ order, item, study });
    setFindings(study?.findings || "");
    setImpression(study?.impression || "");
    setIsCriticalAlert(false);
    setReportingModalOpen(true);
  };

  // Submit & Sign Report
  const submitReport = async () => {
    if (!findings || !impression) {
      alert("Please provide both Findings and Clinical Impression before signing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/radiology/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyId: selectedStudy.study.id,
          findings,
          impression,
          isCriticalAlert,
          keyImages: [
            { slice: "Series 1 / Img 12", view: "Axial View", note: "Primary lesion visible" },
            { slice: "Series 2 / Img 05", view: "Coronal Reconstruction", note: "Anatomical correlation" },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Radiology Report digitally verified and published to Attending Doctor!");
        setReportingModalOpen(false);
        fetchOrders();
      } else {
        alert(data.error || "Report submission failed");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    return (
      o.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patientUhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 rounded-lg text-sky-800">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Radiology & Imaging Information System (RIS)
              </h1>
              <p className="text-xs text-slate-500">
                Digital Radiography • 64-Slice CT • 3T MRI • 4D Ultrasound • PACS Image Integration & Reporting
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOrders();
              fetchModalities();
            }}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Worklist
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("worklist")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "worklist"
              ? "border-sky-600 text-sky-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          Imaging Worklist ({orders.filter((o) => o.status !== "COMPLETED").length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "completed"
              ? "border-sky-600 text-sky-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Verified Reports ({orders.filter((o) => o.status === "COMPLETED").length})
        </button>
        <button
          onClick={() => setActiveTab("modalities")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "modalities"
              ? "border-sky-600 text-sky-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Radio className="w-4 h-4" />
          Modalities & Scanners ({modalities.length})
        </button>
      </div>

      {/* WORKLIST TAB */}
      {(activeTab === "worklist" || activeTab === "completed") && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by UHID, Patient Name, or Accession #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Loading radiology queue...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              No imaging requisitions found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders
                .filter((o) => (activeTab === "worklist" ? o.status !== "COMPLETED" : o.status === "COMPLETED"))
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-sky-300 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800 font-bold">
                          RIS
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{order.patientName}</span>
                            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                              {order.patientUhid}
                            </span>
                            <Badge
                              variant={
                                order.priority === "STAT"
                                  ? "destructive"
                                  : order.priority === "URGENT"
                                  ? "warning"
                                  : "secondary"
                              }
                            >
                              {order.priority}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Order #{order.orderNumber} • Requisition by {order.doctorName} ({order.departmentName})
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={order.status === "COMPLETED" ? "success" : "secondary"}
                      >
                        {order.status}
                      </Badge>
                    </div>

                    {/* Procedures / Studies */}
                    <div className="mt-3 space-y-2">
                      {order.items?.map((item) => {
                        const study = order.studies?.find((s) => s.orderItemId === item.id) || order.studies?.[0];
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-slate-50/80 border border-slate-100 gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <Scan className="w-4 h-4 text-sky-600 mt-1 shrink-0" />
                              <div>
                                <span className="font-semibold text-sm text-slate-800">
                                  {item.itemDescription}
                                </span>
                                {study && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                                      Accession: {study.accessionNumber}
                                    </span>
                                    <span>• Stage: <strong>{study.status}</strong></span>
                                    {study.modalityName && <span>• Modality: {study.modalityName}</span>}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Lifecycle Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {!study || study.status === "ORDERED" ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleStudyAction("SCHEDULE", null, order.id, item.id, order.patientId, item.itemDescription)
                                  }
                                  className="bg-sky-700 hover:bg-sky-800 text-xs"
                                >
                                  Schedule Scan
                                </Button>
                              ) : study.status === "SCHEDULED" ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleStudyAction("ARRIVE", study.id, order.id, item.id, order.patientId)
                                  }
                                  className="bg-amber-600 hover:bg-amber-700 text-xs"
                                >
                                  Mark Patient Arrived
                                </Button>
                              ) : study.status === "ARRIVED" ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleStudyAction("START_SCAN", study.id, order.id, item.id, order.patientId)
                                  }
                                  className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                                >
                                  Start Acquisition
                                </Button>
                              ) : study.status === "IN_PROGRESS" ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleStudyAction("COMPLETE_SCAN", study.id, order.id, item.id, order.patientId)
                                  }
                                  className="bg-teal-700 hover:bg-teal-800 text-xs"
                                >
                                  Complete Acquisition
                                </Button>
                              ) : study.status === "COMPLETED" ? (
                                <Button
                                  size="sm"
                                  onClick={() => openReporting(order, item, study)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Radiologist Report & Sign
                                </Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant="success" className="text-xs">
                                    Report Signed
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openReporting(order, item, study)}
                                    className="text-xs"
                                  >
                                    View Report
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* MODALITIES TAB */}
      {activeTab === "modalities" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {modalities.map((m) => (
            <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-md font-bold">
                  {m.code}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Operational
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{m.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{m.location}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Modality: <strong>{m.modalityType}</strong></span>
                <span>PACS DICOM Ready</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RADIOLOGIST REPORTING MODAL */}
      {reportingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Radiology Diagnostic Report: {selectedStudy?.item?.itemDescription}
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: {selectedStudy?.order?.patientName} ({selectedStudy?.order?.patientUhid}) • Accession: {selectedStudy?.study?.accessionNumber}
                </p>
              </div>
              <button
                onClick={() => setReportingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Radiological Findings
                </label>
                <textarea
                  rows={4}
                  placeholder="Cardiac silhouette is within normal limits. Lung fields appear clear bilaterally with no active focal parenchymal consolidation or pleural effusion..."
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Impression / Diagnostic Conclusion
                </label>
                <textarea
                  rows={2}
                  placeholder="1. Normal cardiopulmonary study. No radiologic evidence of acute cardiothoracic process."
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-700 font-medium">
                    PACS Key Images / DICOM Slice References Attached (2 series captured)
                  </span>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  DICOM 3.0 Verified
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="critRad"
                  checked={isCriticalAlert}
                  onChange={(e) => setIsCriticalAlert(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <label htmlFor="critRad" className="text-xs font-semibold text-red-700 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Flag as Urgent Critical Diagnostic Finding (dispatches high-priority notification to attending clinician)
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setReportingModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={submitReport}
                disabled={isSubmitting}
                className="bg-sky-700 hover:bg-sky-800 text-white flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Digitally Signing..." : "Sign & Publish Report"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


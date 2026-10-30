"use client";
import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  TestTube,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  FileText,
  User,
  Calendar,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  QrCode,
  XCircle,
  Check,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function LabWorkstationPage() {
  const [activeTab, setActiveTab] = useState("orders"); // orders, processing, verification, catalog
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [resultsForm, setResultsForm] = useState([]);
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchOrders();
    fetchCatalog();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/lab/orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch lab orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch("/api/lab/catalog");
      const data = await res.json();
      if (data.success) {
        setCatalog(data.tests || []);
      }
    } catch (err) {
      console.error("Failed to fetch catalog:", err);
    }
  };

  // Collect Sample Action
  const handleCollectSpecimen = async (order, item) => {
    try {
      const res = await fetch("/api/lab/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COLLECT",
          orderId: order.id,
          orderItemId: item.id,
          patientId: order.patientId,
          specimenType: item.itemDescription?.includes("Urine")
            ? "Clean Catch Urine"
            : "EDTA Whole Blood",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Specimen Collected! Barcode Accession Generated: ${data.specimen.barcode}`);
        fetchOrders();
      } else {
        alert(data.error || "Failed to collect specimen");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Receive Sample in Lab
  const handleReceiveSpecimen = async (specimenId, orderId) => {
    try {
      const res = await fetch("/api/lab/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECEIVE",
          orderId,
          specimenId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Specimen Marked as Received in Central Lab!");
        fetchOrders();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Reject Sample
  const handleRejectSpecimen = async (specimenId, orderId) => {
    const reason = prompt("Enter specimen rejection reason (e.g. Hemolyzed, Clotted, Insufficient):");
    if (!reason) return;

    try {
      const res = await fetch("/api/lab/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          orderId,
          specimenId,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Specimen rejected. Urgent recollection task dispatched to nursing.");
        fetchOrders();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Open Result Entry Modal
  const openResultEntry = (order, item, specimen) => {
    setSelectedOrder({ order, item, specimen });
    // Find matching catalog test
    let testCode = "CBC";
    if (item.itemDescription.toLowerCase().includes("troponin")) testCode = "TROP_I";
    else if (item.itemDescription.toLowerCase().includes("lipid")) testCode = "LIPID";
    else if (item.itemDescription.toLowerCase().includes("urine")) testCode = "URINE_RE";
    else if (item.itemDescription.toLowerCase().includes("metabolic") || item.itemDescription.toLowerCase().includes("kft")) testCode = "CMP_KFT";

    const cat = catalog.find((c) => c.testCode === testCode) || catalog[0];

    const initialParams = (cat?.referenceRanges || []).map((r) => ({
      parameterName: r.parameter,
      measuredValue: "",
      unit: r.unit,
      referenceRange: `${r.normalMin} - ${r.normalMax} ${r.unit}`,
      normalMin: r.normalMin,
      normalMax: r.normalMax,
      panicHigh: r.panicHigh,
      panicLow: r.panicLow,
    }));

    setResultsForm(initialParams);
    setTechnicianNotes("");
    setResultsModalOpen(true);
  };

  // Submit Entered Results
  const submitResults = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/lab/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.order.id,
          orderItemId: selectedOrder.item.id,
          specimenId: selectedOrder.specimen?.id,
          patientId: selectedOrder.order.patientId,
          parameters: resultsForm,
          technicianNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.hasPanicValue) {
          alert(`CRITICAL ALERT DISPATCHED!\nPanic thresholds detected:\n${data.panicDetails.join("\n")}\nAttending doctor and nursing team notified immediately!`);
        } else {
          alert("Test results entered successfully! Awaiting pathologist verification.");
        }
        setResultsModalOpen(false);
        fetchOrders();
      } else {
        alert(data.error || "Failed to enter results");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pathologist Verification Sign-off
  const handleVerifyReport = async (orderId, orderItemId) => {
    if (!confirm("Are you sure you want to verify and release this clinical diagnostic report?")) return;

    try {
      const res = await fetch("/api/lab/results", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, orderItemId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Report digitally verified and released to Attending Doctor & Patient Record!");
        fetchOrders();
      } else {
        alert(data.error || "Verification failed");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patientUhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && o.status === statusFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 rounded-lg text-teal-800">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Pathology & Clinical Laboratory (LIMS)
              </h1>
              <p className="text-xs text-slate-500">
                NABL Accredited Central Laboratory • Specimen Accession, Automated Differential & Panic Verification
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
              fetchCatalog();
            }}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "orders"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <TestTube className="w-4 h-4" />
          Active Lab Orders ({orders.filter((o) => o.status !== "COMPLETED").length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "completed"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Verified Reports ({orders.filter((o) => o.status === "COMPLETED").length})
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "catalog"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          Test Master & Reference Ranges ({catalog.length})
        </button>
      </div>

      {/* ORDERS / WORKLIST TAB */}
      {(activeTab === "orders" || activeTab === "completed") && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by UHID, Patient Name, or Order #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Collection</option>
                <option value="IN_PROGRESS">In Processing</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Loading lab queue...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              No laboratory requisitions found matching current criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders
                .filter((o) => (activeTab === "orders" ? o.status !== "COMPLETED" : o.status === "COMPLETED"))
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 hover:border-teal-300 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-bold">
                          LAB
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
                            Order #{order.orderNumber} • Ordered by {order.doctorName} ({order.departmentName}) •{" "}
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            order.status === "COMPLETED"
                              ? "success"
                              : order.status === "IN_PROGRESS"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Test Items */}
                    <div className="mt-3 space-y-2">
                      {order.items?.map((item) => {
                        const specimen = order.specimens?.find((s) => s.orderItemId === item.id) || order.specimens?.[0];
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-50/80 border border-slate-100 gap-3"
                          >
                            <div className="flex items-start gap-3">
                              <TestTube className="w-4 h-4 text-teal-600 mt-1 shrink-0" />
                              <div>
                                <span className="font-semibold text-sm text-slate-800">
                                  {item.itemDescription}
                                </span>
                                {specimen && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                                      Barcode: {specimen.barcode}
                                    </span>
                                    <span>• Status: <strong>{specimen.collectionStatus}</strong></span>
                                    {specimen.rejectionReason && (
                                      <span className="text-red-600 font-semibold">
                                        (Rejected: {specimen.rejectionReason})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons based on specimen lifecycle */}
                            <div className="flex items-center gap-2 shrink-0">
                              {!specimen || specimen.collectionStatus === "ORDERED" ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleCollectSpecimen(order, item)}
                                  className="bg-teal-700 hover:bg-teal-800 text-xs"
                                >
                                  Collect Sample
                                </Button>
                              ) : specimen.collectionStatus === "COLLECTED" ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleReceiveSpecimen(specimen.id, order.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                                  >
                                    Receive in Lab
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectSpecimen(specimen.id, order.id)}
                                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : specimen.collectionStatus === "RECEIVED" ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => openResultEntry(order, item, specimen)}
                                    className="bg-amber-600 hover:bg-amber-700 text-xs flex items-center gap-1"
                                  >
                                    Enter Results
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectSpecimen(specimen.id, order.id)}
                                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : item.status === "COMPLETED" && order.status !== "COMPLETED" ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleVerifyReport(order.id, item.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Verify & Release
                                </Button>
                              ) : (
                                <Badge variant="success" className="text-xs">
                                  Verified & Released
                                </Badge>
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

      {/* CATALOG TAB */}
      {activeTab === "catalog" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Standard Test Catalog & Clinical Panic Values</h3>
            <span className="text-xs text-slate-500">NABL Quality Compliant Reference Ranges</span>
          </div>
          <div className="divide-y divide-slate-100">
            {catalog.map((cat) => (
              <div key={cat.id} className="p-4 hover:bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{cat.testName}</span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded">
                      {cat.testCode}
                    </span>
                    <Badge variant="secondary">{cat.departmentSection}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    Specimen: <strong>{cat.specimenType}</strong> • Turnaround: <strong>{cat.turnaroundTimeMins} mins</strong> • Price: <strong>₹{cat.price}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {cat.referenceRanges?.map((r, i) => (
                    <div key={i} className="p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                      <div className="font-semibold text-slate-800">{r.parameter}</div>
                      <div className="text-slate-500">
                        Normal: {r.normalMin} - {r.normalMax} {r.unit}
                      </div>
                      {(r.panicLow !== undefined || r.panicHigh !== undefined) && (
                        <div className="text-[11px] text-red-600 font-medium">
                          Panic: &lt;{r.panicLow} or &gt;{r.panicHigh}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULT ENTRY MODAL */}
      {resultsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Diagnostic Result Entry: {selectedOrder?.item?.itemDescription}
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: {selectedOrder?.order?.patientName} ({selectedOrder?.order?.patientUhid}) • Barcode: {selectedOrder?.specimen?.barcode}
                </p>
              </div>
              <button
                onClick={() => setResultsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Panic value thresholds are actively monitored. Values exceeding panic limits trigger automatic urgent notifications to the attending doctor.
                </span>
              </div>

              <div className="space-y-3">
                {resultsForm.map((param, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-800">{param.parameterName}</div>
                      <div className="text-xs text-slate-500">
                        Normal: {param.referenceRange}
                        {(param.panicLow !== undefined || param.panicHigh !== undefined) && (
                          <span className="text-red-600 font-semibold ml-2">
                            [Panic: &lt;{param.panicLow} or &gt;{param.panicHigh}]
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Measured Value"
                        value={param.measuredValue}
                        onChange={(e) => {
                          const updated = [...resultsForm];
                          updated[index].measuredValue = e.target.value;
                          setResultsForm(updated);
                        }}
                        className="w-36 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                      />
                      <span className="text-xs font-mono text-slate-500">{param.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technician Observations / Pathologist Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Automated analyzer calibration verified. Sample intact..."
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setResultsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitResults}
                disabled={isSubmitting}
                className="bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Evaluating Results..." : "Submit & Evaluate Results"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


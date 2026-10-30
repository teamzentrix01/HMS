"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { BedDouble, CheckCircle2, Sparkles, AlertCircle, Wrench, Shield, User } from "lucide-react";

export default function WardsAndBedsPage() {
  const [data, setData] = useState({ wards: [], beds: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [activeBed, setActiveBed] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [cleaningStaff, setCleaningStaff] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBeds = async () => {
    try {
      const res = await fetch("/api/admin/wards-beds");
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, []);

  const handleUpdateBed = async (e) => {
    e.preventDefault();
    if (!activeBed || !newStatus) return;

    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/wards-beds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: activeBed.id,
          status: newStatus,
          cleaningAssignedTo: cleaningStaff,
        }),
      });
      if (res.ok) {
        setActiveBed(null);
        fetchBeds();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusConfig = {
    AVAILABLE: {
      color: "border-emerald-300 bg-emerald-50/60 text-emerald-950",
      badge: "success",
      label: "Available",
      dot: "bg-emerald-500",
    },
    OCCUPIED: {
      color: "border-amber-300 bg-amber-50/60 text-amber-950",
      badge: "warning",
      label: "Occupied",
      dot: "bg-amber-500",
    },
    CLEANING: {
      color: "border-orange-300 bg-orange-50/60 text-orange-950",
      badge: "warning",
      label: "Terminal Cleaning",
      dot: "bg-orange-500 animate-pulse",
    },
    RESERVED: {
      color: "border-sky-300 bg-sky-50/60 text-sky-950",
      badge: "info",
      label: "Reserved",
      dot: "bg-sky-500",
    },
    MAINTENANCE: {
      color: "border-red-300 bg-red-50/60 text-red-950",
      badge: "danger",
      label: "Maintenance",
      dot: "bg-red-500",
    },
    ISOLATION: {
      color: "border-purple-300 bg-purple-50/60 text-purple-950",
      badge: "purple",
      label: "Isolation",
      dot: "bg-purple-500",
    },
  };

  // Filter beds
  const filteredBeds = data.beds.filter((b) => {
    if (selectedWard !== "ALL" && b.wardId !== parseInt(selectedWard, 10)) return false;
    if (selectedStatus !== "ALL" && b.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Interactive Ward & Visual Bed Board
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time inpatient occupancy, terminal sanitization pipeline and bed turnover workflow
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">All Hospital Wards</option>
            {data.wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">All Bed States</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="CLEANING">Terminal Cleaning</option>
            <option value="RESERVED">Reserved</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Visual Bed Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {filteredBeds.map((bed) => {
          const cfg = statusConfig[bed.status] || statusConfig.AVAILABLE;
          return (
            <div
              key={bed.id}
              onClick={() => {
                setActiveBed(bed);
                setNewStatus(bed.status);
                setCleaningStaff(bed.cleaningAssignedTo || "");
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] flex flex-col justify-between ${cfg.color}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base tracking-tight text-slate-900 font-mono">
                    {bed.bedNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <Badge variant={cfg.badge} className="text-[10px] py-0 px-1.5">
                      {cfg.label}
                    </Badge>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Type: {bed.type} • ₹{bed.dailyCharge}/day
                </div>
              </div>

              {/* Patient / Occupancy Information */}
              <div className="mt-4 pt-3 border-t border-slate-200/60">
                {bed.status === "OCCUPIED" ? (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-700" />
                      {bed.patientName || "Rajesh Sharma"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      UHID: {bed.patientUhid || "JGY-2026-01001"}
                    </div>
                  </div>
                ) : bed.status === "CLEANING" ? (
                  <div className="text-xs text-orange-900 font-medium flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-spin" />
                    <span>Sanitization in progress</span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ready for Admission</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bed State Transition Modal */}
      <Modal
        isOpen={!!activeBed}
        onClose={() => setActiveBed(null)}
        title={`Bed Operations: ${activeBed?.bedNumber}`}
        description="Hospital Bed Turnover & Housekeeping Certification"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateBed} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-slate-800">
              Current State: {activeBed?.status}
            </div>
            <div className="text-slate-500">
              Bed Daily Rate: ₹{activeBed?.dailyCharge} • Type: {activeBed?.type}
            </div>
          </div>

          <Select
            label="Transition Bed State"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <option value="AVAILABLE">Available (Sanitized & Inspected)</option>
            <option value="OCCUPIED">Occupied (Patient Admitted)</option>
            <option value="CLEANING">Terminal Cleaning (Housekeeping Active)</option>
            <option value="RESERVED">Reserved (Scheduled Admission)</option>
            <option value="MAINTENANCE">Maintenance / Out of Order</option>
            <option value="ISOLATION">Isolation Room Protocol</option>
          </Select>

          {newStatus === "CLEANING" && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-xs text-orange-800 space-y-1">
              <strong>Terminal Disinfection Protocol:</strong>
              <p>Housekeeping task will be automatically dispatched to ward sanitation team.</p>
            </div>
          )}

          {newStatus === "AVAILABLE" && activeBed?.status === "CLEANING" && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800">
              <strong>Housekeeping Clearance:</strong>
              <p>Certifying terminal disinfection and readiness for immediate patient admission.</p>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setActiveBed(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isUpdating}>
              Confirm Transition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


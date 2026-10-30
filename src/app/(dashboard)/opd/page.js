"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Stethoscope,
  Clock,
  Ticket,
  HeartPulse,
  User,
  ArrowRight,
  Flame,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function DoctorOpdQueuePage() {
  const [encountersList, setEncountersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/appointments?date=" + new Date().toISOString().split("T")[0]);
      const data = await res.json();
      // Filter for active queue items
      const active = (data.appointments || []).filter(
        (a) => a.status === "WAITING" || a.status === "IN_CONSULTATION" || a.status === "SCHEDULED"
      );
      setEncountersList(active);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // 15s queue refresh
    return () => clearInterval(interval);
  }, []);

  const filteredEncounters = encountersList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const doc = (item.doctorName || "").toLowerCase();
    const pat = (item.patientName || "").toLowerCase();
    const uhid = (item.patientUhid || "").toLowerCase();
    const token = (item.tokenNumber || "").toLowerCase();
    const dept = (item.departmentName || "").toLowerCase();
    return doc.includes(q) || pat.includes(q) || uhid.includes(q) || token.includes(q) || dept.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Doctor OPD Consultation Workstation & Live Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Module 4 & 16: Active outpatient queue, intake triage, vitals verification and clinical workspace entry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="teal" className="font-mono text-xs px-2.5 py-1">
            {encountersList.filter((e) => e.status === "WAITING").length} Patients In Waiting
          </Badge>
        </div>
      </div>

      {/* OPD Queue Doctor & Patient Search Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Doctor (e.g. Sharma), Patient UHID, or Token #..."
                className="w-full h-9 rounded-lg border border-slate-300 pl-9 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
              <span>Showing <strong>{filteredEncounters.length}</strong> of <strong>{encountersList.length}</strong> in queue</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token #</TableHead>
                <TableHead>Patient & UHID</TableHead>
                <TableHead>Gender / Age</TableHead>
                <TableHead>Scheduled Slot</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Chief Complaint</TableHead>
                <TableHead>Queue State</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEncounters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    {searchQuery ? `No queue records match "${searchQuery}".` : "No waiting OPD patients in queue right now."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEncounters.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.tokenNumber ? (
                        <Badge variant="teal" className="font-mono text-xs font-bold py-1 px-2">
                          <Ticket className="w-3.5 h-3.5 mr-1 inline" /> {item.tokenNumber}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">Not Checked In</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-sm">
                        {item.patientName}
                      </div>
                      <div className="text-[11px] font-mono text-teal-800">
                        {item.patientUhid}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {item.patientGender}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-800">
                      {item.appointmentTime}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {item.departmentName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {item.chiefComplaint || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "IN_CONSULTATION"
                            ? "teal"
                            : item.status === "WAITING"
                            ? "warning"
                            : "default"
                        }
                      >
                        {item.status === "WAITING" ? "Waiting for Doctor" : item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.encounterId ? (
                        <Link
                          href={`/opd/${item.encounterId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          <Stethoscope className="w-3.5 h-3.5" /> Start Consult →
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Awaiting Check-in</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


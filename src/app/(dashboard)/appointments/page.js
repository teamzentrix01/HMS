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
import {
  Calendar,
  Clock,
  UserCheck,
  Stethoscope,
  Plus,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  X,
} from "lucide-react";

export default function AppointmentsQueuePage() {
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDoctor, setSelectedDoctor] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Booking Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    departmentId: "",
    doctorId: "",
    appointmentDate: new Date().toISOString().split("T")[0],
    appointmentTime: "10:00 AM",
    visitType: "NEW",
    chiefComplaint: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data = await res.json();
      setAppointmentsList(data.appointments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrerequisites = async () => {
    try {
      const [deptRes, staffRes, patientRes] = await Promise.all([
        fetch("/api/admin/departments"),
        fetch("/api/staff"),
        fetch("/api/patients"),
      ]);
      const deptData = await deptRes.json();
      const staffData = await staffRes.json();
      const patData = await patientRes.json();

      setDepartments(deptData.departments || []);
      const docList = (staffData.staff || []).filter(
        (s) => s.roleSlug === "doctor" || s.roleSlug === "resident_doctor"
      );
      setDoctors(docList);
      setPatients(patData.patients || []);

      if (deptData.departments?.[0] && !form.departmentId) {
        setForm((prev) => ({
          ...prev,
          departmentId: String(deptData.departments[0].id),
          doctorId: String(docList[0]?.id || ""),
          patientId: String(patData.patients?.[0]?.id || ""),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrerequisites();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, selectedStatus]);

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book appointment");
      }
      setIsModalOpen(false);
      alert(`Appointment scheduled successfully! Reference #${data.appointment.appointmentNumber}`);
      fetchAppointments();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async (apptId) => {
    setCheckingInId(apptId);
    try {
      const res = await fetch(`/api/appointments/${apptId}/check-in`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Check-in failed");
      }
      alert(`Patient checked in successfully!\nQueue Token Generated: ${data.tokenNumber}`);
      fetchAppointments();
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckingInId(null);
    }
  };

  const statusMap = {
    SCHEDULED: { label: "Scheduled", badge: "default" },
    CHECKED_IN: { label: "Checked In", badge: "info" },
    WAITING: { label: "Waiting in Queue", badge: "warning" },
    IN_CONSULTATION: { label: "In Consultation", badge: "teal" },
    COMPLETED: { label: "Completed", badge: "success" },
    CANCELLED: { label: "Cancelled", badge: "danger" },
  };

  const filteredAppointments = appointmentsList.filter((appt) => {
    if (selectedDoctor !== "ALL" && String(appt.doctorId) !== String(selectedDoctor)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const docName = (appt.doctorName || "").toLowerCase();
      const patName = (appt.patientName || "").toLowerCase();
      const patUhid = (appt.patientUhid || "").toLowerCase();
      const token = (appt.tokenNumber || "").toLowerCase();
      const dept = (appt.departmentName || "").toLowerCase();
      if (!docName.includes(q) && !patName.includes(q) && !patUhid.includes(q) && !token.includes(q) && !dept.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            OPD Appointments & Live Queue Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Module 3: Doctor scheduling, token ticketing, check-in turnover and consultation workflows
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Book OPD Slot
        </Button>
      </div>

      {/* Date, Doctor & Queue Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Doctor / Patient Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Doctor (e.g. Sharma), Patient UHID, or Token..."
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

            {/* 2. Doctor Filter Dropdown */}
            <div>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 bg-white"
              >
                <option value="ALL">All Attending Doctors ({doctors.length})</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName} ({d.specialization || d.departmentName || "Doctor"})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Schedule Date */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold font-mono text-slate-900"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="px-2.5 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-teal-700 font-bold cursor-pointer"
              >
                Today
              </button>
            </div>

            {/* 4. Queue Status */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 bg-white"
              >
                <option value="ALL">All Queue States</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="WAITING">Waiting in Queue</option>
                <option value="IN_CONSULTATION">In Consultation</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Showing <strong>{filteredAppointments.length}</strong> of <strong>{appointmentsList.length}</strong> appointments</span>
            {(searchQuery || selectedDoctor !== "ALL" || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDoctor("ALL");
                  setSelectedStatus("ALL");
                }}
                className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue Token</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Patient & UHID</TableHead>
                <TableHead>Department / Doctor</TableHead>
                <TableHead>Visit Type</TableHead>
                <TableHead>Chief Complaint</TableHead>
                <TableHead>Queue Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No OPD appointments match the selected filters or date ({selectedDate}).
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((appt) => {
                  const cfg = statusMap[appt.status] || statusMap.SCHEDULED;
                  return (
                    <TableRow key={appt.id}>
                      <TableCell>
                        {appt.tokenNumber ? (
                          <Badge variant="teal" className="font-mono text-xs font-bold py-1 px-2">
                            <Ticket className="w-3 h-3 mr-1 inline" /> {appt.tokenNumber}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">Not Checked In</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                        {appt.appointmentTime}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/patients/${appt.patientId}`}
                          className="font-bold text-slate-900 text-sm hover:underline block"
                        >
                          {appt.patientName}
                        </Link>
                        <div className="text-[11px] font-mono text-teal-800">
                          {appt.patientUhid} • {appt.patientPhone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800">
                          {appt.departmentName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Dr. {appt.doctorName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="text-[10px]">
                          {appt.visitType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                        {appt.chiefComplaint || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.badge}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {appt.status === "SCHEDULED" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleCheckIn(appt.id)}
                              isLoading={checkingInId === appt.id}
                              className="text-xs h-7 gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Check-In
                            </Button>
                          )}

                          {(appt.status === "WAITING" || appt.status === "IN_CONSULTATION") && (
                            <Link
                              href={`/opd/${appt.encounterId}`}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Stethoscope className="w-3.5 h-3.5" /> Consult →
                            </Link>
                          )}

                          {appt.status === "COMPLETED" && (
                            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule OPD Patient Consultation"
        description="Book appointment slot with attending hospital clinician"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleBookAppointment} className="space-y-4">
          <Select
            label="Patient *"
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            required
          >
            <option value="">Select Registered Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.uhid} - {p.phone})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Department *"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              required
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>

            <Select
              label="Consultant Doctor *"
              value={form.doctorId}
              onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              required
            >
              <option value="">Select Doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.firstName} {doc.lastName} ({doc.specialization || "Clinical"})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Date *"
              type="date"
              value={form.appointmentDate}
              onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
              required
            />
            <Select
              label="Time Slot *"
              value={form.appointmentTime}
              onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
            >
              <option value="09:00 AM">09:00 AM</option>
              <option value="09:30 AM">09:30 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="10:30 AM">10:30 AM</option>
              <option value="11:00 AM">11:00 AM</option>
              <option value="11:30 AM">11:30 AM</option>
              <option value="12:00 PM">12:00 PM</option>
              <option value="02:00 PM">02:00 PM</option>
              <option value="02:30 PM">02:30 PM</option>
              <option value="03:00 PM">03:00 PM</option>
              <option value="04:00 PM">04:00 PM</option>
            </Select>
            <Select
              label="Visit Type *"
              value={form.visitType}
              onChange={(e) => setForm({ ...form, visitType: e.target.value })}
            >
              <option value="NEW">New Consultation</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="REFERRAL">Referral</option>
              <option value="SECOND_OPINION">Second Opinion</option>
            </Select>
          </div>

          <Input
            label="Chief Complaint / Reason for Visit"
            placeholder="e.g. Chest tightness on exertion, routine cardiology follow-up"
            value={form.chiefComplaint}
            onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Confirm Appointment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


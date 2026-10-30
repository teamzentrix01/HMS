"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Users,
  Plus,
  ShieldCheck,
  Stethoscope,
  Mail,
  Phone,
  Search,
  Filter,
  X,
  HeartPulse,
  FlaskConical,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

function StaffDirectoryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [data, setData] = useState({ staff: [], credentials: [], roles: [], departments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "Jigyasa@2026",
    roleId: "",
    departmentId: "",
    phone: "",
    specialization: "",
    designation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff");
      const d = await res.json();
      setData(d);
      if (d.roles?.length > 0 && !form.roleId) {
        setForm((prev) => ({
          ...prev,
          roleId: String(d.roles[0].id),
          departmentId: d.departments?.[0]?.id ? String(d.departments[0].id) : "",
        }));
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Update searchQuery if query param changes
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Client-side instant filter over staff roster
  const filteredStaff = useMemo(() => {
    if (!data.staff) return [];

    return data.staff.filter((s) => {
      // 1. Text Search across name, employeeId, email, phone, specialization, designation, department
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const empId = (s.employeeId || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        const spec = (s.specialization || "").toLowerCase();
        const desig = (s.designation || "").toLowerCase();
        const dept = (s.departmentName || "").toLowerCase();
        const role = (s.roleName || "").toLowerCase();

        const matches =
          fullName.includes(q) ||
          empId.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          spec.includes(q) ||
          desig.includes(q) ||
          dept.includes(q) ||
          role.includes(q);

        if (!matches) return false;
      }

      // 2. Department filter
      if (selectedDepartment !== "ALL") {
        if (String(s.departmentId) !== String(selectedDepartment)) return false;
      }

      // 3. Role filter
      if (selectedRole !== "ALL") {
        if (String(s.roleId) !== String(selectedRole)) return false;
      }

      // 4. Status filter
      if (selectedStatus !== "ALL") {
        if (s.status !== selectedStatus) return false;
      }

      return true;
    });
  }, [data.staff, searchQuery, selectedDepartment, selectedRole, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const list = data.staff || [];
    const total = list.length;
    const doctors = list.filter((s) => s.roleSlug?.includes("doctor")).length;
    const nurses = list.filter((s) => s.roleSlug?.includes("nurse")).length;
    const diagnostics = list.filter(
      (s) => s.roleSlug?.includes("lab") || s.roleSlug?.includes("radiology") || s.roleSlug?.includes("pharmacy")
    ).length;

    return { total, doctors, nurses, diagnostics };
  }, [data.staff]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedDepartment("ALL");
    setSelectedRole("ALL");
    setSelectedStatus("ALL");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          username: "",
          password: "Jigyasa@2026",
          roleId: data.roles?.[0]?.id || "",
          departmentId: data.departments?.[0]?.id || "",
          phone: "",
          specialization: "",
          designation: "",
        });
        fetchStaff();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to create staff account");
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (slug = "") => {
    if (slug.includes("doctor")) return "teal";
    if (slug.includes("nurse")) return "info";
    if (slug.includes("admin")) return "purple";
    if (slug.includes("lab")) return "warning";
    if (slug.includes("pharmacy")) return "success";
    return "default";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Hospital Staff & Clinician Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search and manage credentialed doctors, nursing officers, technologists, pharmacists, and administrative staff
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" /> Provision New Staff Account
        </Button>
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-500 font-medium">Total Workforce</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-teal-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-teal-900">{stats.doctors}</div>
            <div className="text-xs text-teal-700 font-medium">Consultant Doctors</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-sky-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-sky-900">{stats.nurses}</div>
            <div className="text-xs text-sky-700 font-medium">Nursing Officers</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-900">{stats.diagnostics}</div>
            <div className="text-xs text-amber-700 font-medium">Lab & Pharmacy</div>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Bar */}
      <Card className="border border-slate-200/90 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* 1. Primary Text Search Input */}
            <div className="md:col-span-5 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by Name, Employee ID (EMP-...), email, phone, or specialization..."
                className="w-full h-10 rounded-xl border border-slate-300 py-2 pl-10 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 2. Department Dropdown Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 bg-white"
              >
                <option value="ALL">All Departments ({data.departments?.length || 0})</option>
                {data.departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Role Dropdown Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 bg-white"
              >
                <option value="ALL">All Roles ({data.roles?.length || 0})</option>
                {data.roles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Status Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Duty</option>
                <option value="INACTIVE">Inactive / On Leave</option>
              </select>
            </div>
          </div>

          {/* Active Filter Indicators & Count */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span>Showing <strong>{filteredStaff.length}</strong> of <strong>{data.staff?.length || 0}</strong> staff members</span>
              {(searchQuery || selectedDepartment !== "ALL" || selectedRole !== "ALL" || selectedStatus !== "ALL") && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                  Filters applied
                </span>
              )}
            </div>

            {(searchQuery || selectedDepartment !== "ALL" || selectedRole !== "ALL" || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear All Filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Staff Roster Table */}
      <Card className="border border-slate-200/90 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-72">Staff Member</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Role & Access</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Specialization / Designation</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Credential</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    Loading hospital workforce directory...
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Search className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        No employees found matching your search
                      </div>
                      <div className="text-xs text-slate-500 max-w-sm">
                        Try searching by first or last name, employee ID (e.g. EMP-DOC-101), department, or clear the filters.
                      </div>
                      <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2 text-xs">
                        Reset Search Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Staff Member */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-700 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                          {s.firstName?.[0] || "E"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {s.roleSlug?.includes("doctor") ? `Dr. ${s.firstName} ${s.lastName}` : `${s.firstName} ${s.lastName}`}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {s.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Employee ID */}
                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {s.employeeId || "-"}
                      </span>
                    </TableCell>

                    {/* Role & Access */}
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(s.roleSlug)}>
                        {s.roleName || s.roleSlug?.replace("_", " ")}
                      </Badge>
                    </TableCell>

                    {/* Assigned Department */}
                    <TableCell>
                      <div className="text-xs font-medium text-slate-800">
                        {s.departmentName || "General Workforce"}
                      </div>
                      {s.departmentCode && (
                        <div className="text-[10px] font-mono text-slate-400">
                          {s.departmentCode}
                        </div>
                      )}
                    </TableCell>

                    {/* Specialization / Designation */}
                    <TableCell>
                      <div className="text-xs text-slate-700 font-medium">
                        {s.specialization || s.designation || "-"}
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-slate-600">
                        {s.phone ? (
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{s.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Credential */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Council Verified
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={s.status === "ACTIVE" ? "success" : "default"}>
                        {s.status === "ACTIVE" ? "Active Duty" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Staff Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Hospital Staff Account"
        description="Register a new healthcare worker, assign clinical role, department clearance, and credential ID"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Rajesh"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Sharma"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hospital Email Address"
              type="email"
              placeholder="name@jigyasahospital.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Staff Username"
              placeholder="e.g. rsharma"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assigned Clinical / Admin Role"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            >
              {data.roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>

            <Select
              label="Primary Department"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              {data.departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Specialization"
              placeholder="e.g. Interventional Cardiology"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
            />
            <Input
              label="Designation / Title"
              placeholder="e.g. Senior Consultant"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Official Contact Phone"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Initial Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Provision Staff Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function StaffManagementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Staff Directory...</div>}>
      <StaffDirectoryContent />
    </Suspense>
  );
}

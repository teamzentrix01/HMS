"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Building2, Plus, Phone, CheckCircle2 } from "lucide-react";

export default function DepartmentsPage() {
  const [data, setData] = useState({ departments: [], units: [], rooms: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "CLINICAL",
    description: "",
    headOfDepartment: "",
    phoneExtension: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepts = async () => {
    try {
      const res = await fetch("/api/admin/departments");
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          name: "",
          code: "",
          type: "CLINICAL",
          description: "",
          headOfDepartment: "",
          phoneExtension: "",
        });
        fetchDepts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeVariants = {
    CLINICAL: "teal",
    DIAGNOSTIC: "purple",
    PHARMACY: "success",
    ADMINISTRATIVE: "default",
    SUPPORT: "info",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Departments, Units & Consultation Rooms
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinical specialties, diagnostic laboratories, inpatient wards, and administrative wings
          </p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Department
        </Button>
      </div>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Hospital Master Departments ({data.departments.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Head of Department (HOD)</TableHead>
                <TableHead>Extension</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-mono font-bold text-teal-800 text-xs">
                    {dept.code}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{dept.name}</div>
                    <div className="text-xs text-slate-500">{dept.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariants[dept.type] || "default"}>
                      {dept.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    {dept.headOfDepartment || "Not Assigned"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {dept.phoneExtension || "-"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Units and Consultation Rooms Mapping Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sub-Speciality Units ({data.units.length})</CardTitle>
            <CardDescription>Specialized intensive care and clinical subunits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.units.map((u) => (
              <div
                key={u.id}
                className="p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{u.name}</span>
                  <span className="font-mono text-teal-700 ml-2">({u.code})</span>
                </div>
                <Badge variant="teal">Operational</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OPD Consultation Rooms ({data.rooms.length})</CardTitle>
            <CardDescription>Physical outpatient examination chambers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.rooms.map((r) => (
              <div
                key={r.id}
                className="p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{r.roomNumber}</span>
                  <span className="text-slate-500 ml-2">
                    {r.floor} • {r.wing}
                  </span>
                </div>
                <Badge variant="default">Available</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Hospital Department"
        description="Register a new clinical, diagnostic or operational department"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Department Name"
            placeholder="e.g. Nephrology & Renal Care"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Code"
              placeholder="e.g. NEPH"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
            <Select
              label="Category"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="CLINICAL">Clinical</option>
              <option value="DIAGNOSTIC">Diagnostic</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="ADMINISTRATIVE">Administrative</option>
              <option value="SUPPORT">Support</option>
            </Select>
          </div>
          <Input
            label="Head of Department (HOD)"
            placeholder="e.g. Dr. Rajesh Gupta"
            value={form.headOfDepartment}
            onChange={(e) => setForm({ ...form, headOfDepartment: e.target.value })}
          />
          <Input
            label="Phone Extension"
            placeholder="e.g. 108"
            value={form.phoneExtension}
            onChange={(e) => setForm({ ...form, phoneExtension: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Scope of medical services offered"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


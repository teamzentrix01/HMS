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
  Users,
  UserPlus,
  Search,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  FileText,
  Phone,
  ArrowRight,
  Plus,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function PatientsDirectoryPage() {
  const [patientsList, setPatientsList] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "MALE",
    bloodGroup: "B+",
    phone: "",
    email: "",
    nationalIdNumber: "",
    address: "",
    city: "Noida",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Spouse",
    allergies: [{ allergen: "", severity: "MODERATE", reaction: "" }],
    conditions: [{ name: "", icdCode: "" }],
  });

  const fetchPatients = async (query = "") => {
    setIsLoading(true);
    try {
      const url = query ? `/api/patients?q=${encodeURIComponent(query)}` : "/api/patients";
      const res = await fetch(url);
      const data = await res.json();
      setPatientsList(data.patients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients(search);
  };

  // Real-time Duplicate Check when phone or name changes
  const checkDuplicates = async () => {
    if (!form.phone && (!form.firstName || !form.lastName)) return;
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth || "1990-01-01",
          gender: form.gender,
          nationalIdNumber: form.nationalIdNumber,
          checkDuplicatesOnly: true,
        }),
      });
      const data = await res.json();
      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicateWarning(data.duplicates);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePatient = async (e, forceCreate = false) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        allergies: form.allergies.filter((a) => a.allergen.trim()),
        conditions: form.conditions.filter((c) => c.name.trim()),
        forceCreate,
      };

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicateWarning) {
        setDuplicateWarning(data.duplicates);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to register patient");
      }

      alert(`Patient successfully registered!\nAssigned UHID: ${data.patient.uhid}`);
      setIsModalOpen(false);
      setDuplicateWarning(null);
      setForm({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "MALE",
        bloodGroup: "B+",
        phone: "",
        email: "",
        nationalIdNumber: "",
        address: "",
        city: "Noida",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelation: "Spouse",
        allergies: [{ allergen: "", severity: "MODERATE", reaction: "" }],
        conditions: [{ name: "", icdCode: "" }],
      });
      fetchPatients();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAllergyRow = () => {
    setForm({
      ...form,
      allergies: [...form.allergies, { allergen: "", severity: "MODERATE", reaction: "" }],
    });
  };

  const removeAllergyRow = (idx) => {
    setForm({
      ...form,
      allergies: form.allergies.filter((_, i) => i !== idx),
    });
  };

  const addConditionRow = () => {
    setForm({
      ...form,
      conditions: [...form.conditions, { name: "", icdCode: "" }],
    });
  };

  const removeConditionRow = (idx) => {
    setForm({
      ...form,
      conditions: form.conditions.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Master Patient Index (MPI) & Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Module 2: One Patient → One Medical Identity (UHID) → Longitudinal Lifetime Electronic Health Record
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5">
          <UserPlus className="w-4 h-4" /> Register New Patient
        </Button>
      </div>

      {/* Search Header */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search by UHID (e.g. JGY-2026-01001), patient name, mobile number, or Aadhaar ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" className="gap-1.5">
              <Search className="w-4 h-4" /> Search MPI
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UHID</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Gender / Age</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Emergency Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patientsList.map((p) => {
                const birthYear = p.dateOfBirth ? new Date(p.dateOfBirth).getFullYear() : null;
                const age = birthYear ? new Date().getFullYear() - birthYear : "-";

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold text-xs text-teal-800">
                      {p.uhid}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-sm">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.city || "Noida"} • Reg: {formatDate(p.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {p.gender} / {age} yrs
                    </TableCell>
                    <TableCell>
                      {p.bloodGroup ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          {p.bloodGroup}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      {p.phone}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {p.emergencyContactName ? (
                        <div>
                          <span className="font-medium">{p.emergencyContactName}</span>
                          <span className="text-slate-400 ml-1 font-mono">
                            ({p.emergencyContactRelation || "Kin"})
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/patients/${p.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-md border border-teal-200 transition-colors"
                        >
                          View EHR →
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Registration Modal with Duplicate Prevention */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Patient Registration & UHID Generation"
        description="Jigyasa Super Speciality Hospital Central Demographics Registry"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={(e) => handleCreatePatient(e, false)} className="space-y-4">
          {/* Duplicate Detection Warning Banner */}
          {duplicateWarning && duplicateWarning.length > 0 && (
            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>POTENTIAL DUPLICATE IDENTITY DETECTED</span>
              </div>
              <p>
                A patient with matching mobile number, name, or Aadhaar identity already exists in Jigyasa HMS.
                Hospital policy forbids creating duplicate patient records silently:
              </p>
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-amber-200">
                {duplicateWarning.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs font-medium">
                    <span>
                      {d.firstName} {d.lastName} (Phone: {d.phone})
                    </span>
                    <Link
                      href={`/patients/${d.id}`}
                      target="_blank"
                      className="font-mono text-teal-700 underline font-bold"
                    >
                      Use Existing: {d.uhid} ↗
                    </Link>
                  </div>
                ))}
              </div>
              <div className="pt-1 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel Registration
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="warning"
                  onClick={() => handleCreatePatient(null, true)}
                >
                  Confirm Verified Separate Identity
                </Button>
              </div>
            </div>
          )}

          {/* Demographics Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Basic Demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Input
                label="First Name *"
                placeholder="e.g. Ramesh"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                onBlur={checkDuplicates}
                required
              />
              <Input
                label="Last Name *"
                placeholder="e.g. Gupta"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                onBlur={checkDuplicates}
                required
              />
              <Input
                label="Date of Birth *"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                required
              />
              <Select
                label="Gender *"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
              <Select
                label="Blood Group"
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              >
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
                <option value="O+">O+</option>
                <option value="A-">A-</option>
                <option value="B-">B-</option>
                <option value="AB-">AB-</option>
                <option value="O-">O-</option>
              </Select>
              <Input
                label="Mobile Phone *"
                placeholder="10-digit mobile"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onBlur={checkDuplicates}
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="patient@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="National ID / Aadhaar Number"
                placeholder="12-digit Aadhaar / ID"
                value={form.nationalIdNumber}
                onChange={(e) => setForm({ ...form, nationalIdNumber: e.target.value })}
                onBlur={checkDuplicates}
              />
              <Input
                label="City / District"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <Input
              label="Full Residential Address"
              placeholder="House, Street, Sector, Landmark"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {/* Emergency Contact */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Emergency Contact & Next of Kin
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Contact Name"
                placeholder="Relative / Guardian Name"
                value={form.emergencyContactName}
                onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
              />
              <Input
                label="Contact Phone"
                placeholder="Emergency phone number"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
              />
              <Select
                label="Relationship"
                value={form.emergencyContactRelation}
                onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
              >
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Child">Child</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend / Colleague">Friend / Colleague</option>
              </Select>
            </div>
          </div>

          {/* Clinical Allergies */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Clinical Drug / Food Allergies
              </h4>
              <button
                type="button"
                onClick={addAllergyRow}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Allergy
              </button>
            </div>
            {form.allergies.map((al, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Allergen (e.g. Penicillin, Peanuts)"
                  value={al.allergen}
                  onChange={(e) => {
                    const copy = [...form.allergies];
                    copy[idx].allergen = e.target.value;
                    setForm({ ...form, allergies: copy });
                  }}
                  className="flex-1 rounded-lg border border-slate-300 p-2 text-xs"
                />
                <select
                  value={al.severity}
                  onChange={(e) => {
                    const copy = [...form.allergies];
                    copy[idx].severity = e.target.value;
                    setForm({ ...form, allergies: copy });
                  }}
                  className="w-36 rounded-lg border border-slate-300 p-2 text-xs"
                >
                  <option value="MILD">Mild</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="SEVERE">Severe</option>
                  <option value="LIFE_THREATENING">Life Threatening</option>
                </select>
                <input
                  type="text"
                  placeholder="Reaction (e.g. Urticaria)"
                  value={al.reaction}
                  onChange={(e) => {
                    const copy = [...form.allergies];
                    copy[idx].reaction = e.target.value;
                    setForm({ ...form, allergies: copy });
                  }}
                  className="flex-1 rounded-lg border border-slate-300 p-2 text-xs"
                />
                {form.allergies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAllergyRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Generate UHID & Save Patient
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


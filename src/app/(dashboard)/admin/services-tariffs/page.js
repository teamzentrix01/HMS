"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Layers, Plus, Search, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ServicesTariffsPage() {
  const [data, setData] = useState({ services: [], tariffs: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    category: "INVESTIGATION",
    basePrice: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/admin/services-tariffs");
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/services-tariffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setForm({ name: "", code: "", category: "INVESTIGATION", basePrice: "" });
        fetchServices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = data.services.filter((s) => {
    if (categoryFilter !== "ALL" && s.category !== categoryFilter) return false;
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !s.code.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Clinical Service Catalog & Tariff Master
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standard OPD fees, investigation rates, inpatient bed charges and multi-tier insurance tariffs
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Hospital Service
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search service name or tariff code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Categories</option>
          <option value="CONSULTATION">Consultation</option>
          <option value="INVESTIGATION">Laboratory & Diagnostics</option>
          <option value="PROCEDURE">Clinical Procedures</option>
          <option value="BED_CHARGE">Bed & Ward Tariffs</option>
        </select>
      </div>

      {/* Services Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Code</TableHead>
                <TableHead>Service Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Standard Tariff</TableHead>
                <TableHead className="text-right">Insurance / TPA Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((srv) => (
                <TableRow key={srv.id}>
                  <TableCell className="font-mono font-bold text-xs text-teal-800">
                    {srv.code}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {srv.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="teal">{srv.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {srv.departmentName || "General Services"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {formatCurrency(srv.basePrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-600">
                    {formatCurrency(Math.round(srv.basePrice * 0.9))}
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

      {/* Add Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Hospital Clinical Service"
        description="Configure new chargeable medical service and tariff plan"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Service Title"
            placeholder="e.g. 24-Hour Holter ECG Monitoring"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Service Code"
              placeholder="e.g. SRV-CARD-HOLT"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="CONSULTATION">Consultation</option>
              <option value="INVESTIGATION">Investigation</option>
              <option value="PROCEDURE">Procedure</option>
              <option value="BED_CHARGE">Bed Charge</option>
            </Select>
          </div>
          <Input
            label="Standard Tariff (₹ INR)"
            type="number"
            placeholder="e.g. 2200"
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
            required
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Register Service
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, FileText, Stethoscope, Building, ArrowRight, Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

export function GlobalSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStaff = (s) => {
    onClose();
    router.push(`/staff?q=${encodeURIComponent(s.employeeId || s.firstName)}`);
  };

  const handleSelectPatient = (p) => {
    onClose();
    router.push(`/patients/${p.id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Universal Hospital Registry Search"
      description="Instant lookup across all hospital employees, clinicians, patients (UHID), and departments"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-24 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            placeholder="Search employee (e.g. Dr. Sharma, EMP-001), patient UHID, or department..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          <button
            type="submit"
            className="absolute right-2 top-2 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </form>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto space-y-3 divide-y divide-slate-100 pr-1">
          {isLoading && (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span>Searching Jigyasa Hospital database...</span>
            </div>
          )}

          {results && (
            <>
              {/* Staff / Clinicians */}
              {results.staff?.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      Hospital Workforce & Clinicians ({results.staff.length})
                    </h4>
                    <span className="text-[11px] text-teal-700 font-medium">Click to view in Directory</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.staff.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectStaff(s)}
                        className="p-3 rounded-xl border border-slate-200/90 hover:bg-teal-50/50 hover:border-teal-300 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {s.firstName?.[0] || "E"}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-900 flex items-center gap-2">
                              {s.roleSlug?.includes("doctor") ? `Dr. ${s.firstName} ${s.lastName}` : `${s.firstName} ${s.lastName}`}
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {s.employeeId}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="text-teal-700 font-medium">{s.departmentName || "General Staff"}</span>
                              <span>•</span>
                              <span>{s.specialization || s.designation || s.roleName}</span>
                              {s.phone && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {s.phone}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="teal">{s.roleName || "Staff"}</Badge>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patients */}
              {results.patients?.length > 0 && (
                <div className="pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-600" />
                      Registered Patients ({results.patients.length})
                    </h4>
                    <span className="text-[11px] text-cyan-700 font-medium">Click to open EHR</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.patients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="p-3 rounded-xl border border-slate-200/90 hover:bg-cyan-50/50 hover:border-cyan-300 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {p.firstName?.[0] || "P"}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-cyan-900 flex items-center gap-2">
                              {p.firstName} {p.lastName}
                              <span className="font-mono text-xs text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {p.uhid}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{p.gender}</span>
                              <span>•</span>
                              <span>Blood: {p.bloodGroup || "N/A"}</span>
                              <span>•</span>
                              <span>Phone: {p.phone}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="cyan">Open Patient EHR</Badge>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-700 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Departments */}
              {results.departments?.length > 0 && (
                <div className="pt-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-purple-600" />
                    Departments & Clinical Units ({results.departments.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.departments.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          onClose();
                          router.push("/admin/departments");
                        }}
                        className="p-2.5 rounded-xl border border-slate-200/90 hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{d.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Code: {d.code} • {d.departmentType}</div>
                        </div>
                        <Badge variant="purple">Department</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.staff?.length === 0 && results.patients?.length === 0 && results.departments?.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500">
                  No matching hospital records found for "{query}". Try searching by employee name, employee ID, or UHID.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ShieldAlert,
  LogOut,
  ChevronDown,
  User,
  Building2,
  Stethoscope,
  Phone,
  ArrowRight,
  Loader2,
  Users,
  Shield,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlobalSearchModal } from "./global-search-modal";
import { BreakGlassModal } from "./break-glass-modal";
import { NotificationDropdown } from "./notification-dropdown";
import { useRouter } from "next/navigation";

export function Header({ user }) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBreakGlassOpen, setIsBreakGlassOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Live Inline Header Search
  const [headerQuery, setHeaderQuery] = useState("");
  const [liveResults, setLiveResults] = useState(null);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Keyboard shortcut '/' or 'Ctrl+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) || ((e.ctrlKey || e.metaKey) && e.key === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close live dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsLiveOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!headerQuery.trim()) {
      setLiveResults(null);
      setIsLiveOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLiveLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(headerQuery.trim())}`);
        const data = await res.json();
        setLiveResults(data);
        setIsLiveOpen(true);
      } catch (err) {
        console.error("Live search failed:", err);
      } finally {
        setIsLiveLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [headerQuery]);

  const handleSelectStaff = (s) => {
    setIsLiveOpen(false);
    setHeaderQuery("");
    router.push(`/staff?q=${encodeURIComponent(s.employeeId || s.firstName)}`);
  };

  const handleSelectPatient = (p) => {
    setIsLiveOpen(false);
    setHeaderQuery("");
    router.push(`/patients/${p.id}`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Staff Quick Switch (clean role switcher for testing)
  const staffSwitchAccounts = [
    { email: "admin@jigyasa.demo", role: "Hospital Admin", label: "Dr. Vikram Aditya (Admin)" },
    { email: "doctor@jigyasa.demo", role: "Consultant Doctor", label: "Dr. Arvind Sharma (Cardiology)" },
    { email: "nurse@jigyasa.demo", role: "Senior Nurse", label: "Pooja Nair (CCU Incharge)" },
    { email: "reception@jigyasa.demo", role: "Receptionist", label: "Sneha Patel (Front Desk)" },
    { email: "lab@jigyasa.demo", role: "Lab Technician", label: "Rahul Verma (Biochem LIMS)" },
    { email: "pharmacy@jigyasa.demo", role: "Pharmacist", label: "Amit Bansal (Pharmacy Incharge)" },
    { email: "billing@jigyasa.demo", role: "Cashier", label: "Deepak Kapoor (Accounts/Billing)" },
  ];

  const handleSwitchAccount = async (email) => {
    try {
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Left: Prominent Live Employee & Patient Search Bar */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              onFocus={() => {
                if (headerQuery.trim() && liveResults) setIsLiveOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setIsSearchOpen(true);
                }
              }}
              placeholder="Search employees, doctors (EMP ID/name), patients (UHID)..."
              className="w-full h-9.5 rounded-xl border border-slate-200 bg-slate-50/70 pl-9.5 pr-20 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

            <div className="absolute right-2 top-2 flex items-center gap-1">
              {isLiveLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin mr-1" />
              ) : null}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/70 rounded">
                /
              </kbd>
            </div>
          </div>

          {/* Live Floating Dropdown Search Results */}
          {isLiveOpen && liveResults && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-50 max-h-96 overflow-y-auto space-y-3">
              {/* Staff / Doctors */}
              {liveResults.staff?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-teal-800">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      Hospital Staff & Clinicians
                    </span>
                    <span className="text-[10px] text-slate-400">{liveResults.staff.length} matches</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {liveResults.staff.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectStaff(s)}
                        className="w-full text-left p-2 rounded-xl hover:bg-teal-50/60 border border-transparent hover:border-teal-200 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {s.firstName?.[0] || "E"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 group-hover:text-teal-900 truncate flex items-center gap-1.5">
                              {s.roleSlug?.includes("doctor") ? `Dr. ${s.firstName} ${s.lastName}` : `${s.firstName} ${s.lastName}`}
                              <span className="font-mono text-[10px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {s.employeeId}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {s.departmentName || "General Staff"} • {s.specialization || s.designation || s.roleName}
                            </div>
                          </div>
                        </div>
                        <Badge variant="teal" className="shrink-0 text-[10px]">
                          {s.roleName || "Staff"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Patients */}
              {liveResults.patients?.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-cyan-800">
                      <User className="w-3.5 h-3.5 text-cyan-600" />
                      Patients (UHID)
                    </span>
                    <span className="text-[10px] text-slate-400">{liveResults.patients.length} matches</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {liveResults.patients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPatient(p)}
                        className="w-full text-left p-2 rounded-xl hover:bg-cyan-50/60 border border-transparent hover:border-cyan-200 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {p.firstName?.[0] || "P"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 group-hover:text-cyan-900 truncate flex items-center gap-2">
                              {p.firstName} {p.lastName}
                              <span className="font-mono text-[10px] text-teal-700 font-semibold bg-teal-50 px-1 py-0.2 rounded">
                                {p.uhid}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {p.gender} • {p.phone}
                            </div>
                          </div>
                        </div>
                        <Badge variant="cyan" className="shrink-0 text-[10px]">
                          Open EHR
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {liveResults.staff?.length === 0 && liveResults.patients?.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-500">
                  No matching staff or patients found for "{headerQuery}".
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLiveOpen(false);
                    setIsSearchOpen(true);
                  }}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  Open Full Registry Search Modal <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Emergency Break-Glass, Notifications, Profile */}
        <div className="flex items-center gap-3">
          {/* Emergency Break-Glass Action */}
          <button
            onClick={() => setIsBreakGlassOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer"
            title="Emergency Break-Glass Override Protocol"
          >
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>Break-Glass</span>
          </button>

          {/* Notification Bell */}
          <NotificationDropdown user={user} />

          {/* User Profile & Role Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 pl-2 py-1 pr-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.firstName?.[0] || "U"}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.roleSlug?.includes("doctor") ? `Dr. ${user?.firstName} ${user?.lastName}` : `${user?.firstName} ${user?.lastName}`}
                </span>
                <span className="text-[10px] text-teal-700 font-medium">
                  {user?.departmentName || user?.roleName || "Jigyasa Staff"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200/90 z-50 p-2 text-xs space-y-1">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {user?.roleSlug?.includes("doctor") ? `Dr. ${user?.firstName} ${user?.lastName}` : `${user?.firstName} ${user?.lastName}`}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{user?.email}</div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Badge variant="teal">{user?.roleName || "Staff"}</Badge>
                      <span className="text-[10px] text-slate-500">{user?.departmentName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      router.push("/staff");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Staff & Employee Directory</span>
                  </button>

                  {/* Switch Staff Account (Clean internal helper) */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Duty Profile
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {staffSwitchAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            handleSwitchAccount(acc.email);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs hover:bg-slate-100 cursor-pointer ${
                            user?.email === acc.email
                              ? "bg-teal-50 text-teal-900 font-bold"
                              : "text-slate-600"
                          }`}
                        >
                          <div className="truncate">
                            <div className="truncate font-medium">{acc.label}</div>
                            <div className="text-[10px] text-slate-400 truncate">{acc.role}</div>
                          </div>
                          {user?.email === acc.email && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-700 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>Sign Out of Hospital Portal</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Full Modal Search */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <BreakGlassModal
        isOpen={isBreakGlassOpen}
        onClose={() => setIsBreakGlassOpen(false)}
        user={user}
      />
    </>
  );
}

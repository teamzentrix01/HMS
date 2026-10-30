"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Building2,
  Stethoscope,
  HeartPulse,
  CreditCard,
  Pill,
  FlaskConical,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showQuickFill, setShowQuickFill] = useState(false);

  const staffRoster = [
    {
      role: "Hospital Admin",
      email: "admin@jigyasa.demo",
      icon: Building2,
      desc: "Governance & Masters",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      role: "Consultant Doctor",
      email: "doctor@jigyasa.demo",
      icon: Stethoscope,
      desc: "OPD, Orders & Rounds",
      badge: "bg-teal-50 text-teal-700 border-teal-200",
    },
    {
      role: "Senior Nurse",
      email: "nurse@jigyasa.demo",
      icon: HeartPulse,
      desc: "Wards, eMAR & Vitals",
      badge: "bg-sky-50 text-sky-700 border-sky-200",
    },
    {
      role: "Receptionist",
      email: "reception@jigyasa.demo",
      icon: UserCheck,
      desc: "Registration & Token Queue",
      badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
    },
    {
      role: "Lab Technician",
      email: "lab@jigyasa.demo",
      icon: FlaskConical,
      desc: "Specimens & LIMS",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      role: "Pharmacist",
      email: "pharmacy@jigyasa.demo",
      icon: Pill,
      desc: "e-Rx Queue & Dispense",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      role: "Billing / Cashier",
      email: "billing@jigyasa.demo",
      icon: CreditCard,
      desc: "Invoices & Payments",
      badge: "bg-slate-50 text-slate-700 border-slate-200",
    },
  ];

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please enter your staff email/ID and password.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.ok
            ? "Invalid server response structure"
            : `Authentication service unavailable (${res.status})`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Check your credentials.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message || "An error occurred during sign in");
      setIsLoading(false);
    }
  };

  const applyQuickCredential = (accEmail) => {
    setEmail(accEmail);
    setPassword("Jigyasa@2026");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-teal-50/20 to-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-700 flex items-center justify-center text-white font-black text-3xl shadow-lg border-2 border-teal-600">
          J
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          JIGYASA SUPER SPECIALITY HOSPITAL
        </h1>
        <p className="mt-1 text-xs text-teal-800 font-semibold tracking-wider uppercase">
          Enterprise Hospital Information & Clinical Management System
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Sector 62, Institutional Area, Noida • 24x7 Multi-Speciality Care
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/90 sm:px-10">
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Staff Portal Sign In</h2>
              <p className="text-xs text-slate-500">Authorized medical and administrative personnel only</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Secure 256-bit SSL
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Email or Employee ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  placeholder="e.g. doctor@jigyasa.demo or EMP-DOC-101"
                  autoComplete="username"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-teal-700 hover:text-teal-800 cursor-pointer">
                  Forgot credentials?
                </span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                <span>Remember this workstation</span>
              </label>
              <span className="text-[11px] text-slate-400">NABH / HIPAA Standard</span>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex justify-center items-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Credentials & Department Clearance...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In to Hospital Portal <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Clean, Neat Collapsible Quick-Access Bar (For internal staff testing) */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowQuickFill(!showQuickFill)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-teal-800 font-medium py-1 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Hospital Staff Quick Roles (Internal Roster)
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showQuickFill ? "rotate-180" : ""
                }`}
              />
            </button>

            {showQuickFill && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                {staffRoster.map((acc) => {
                  const Icon = acc.icon;
                  const isSelected = email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => applyQuickCredential(acc.email)}
                      className={`text-left p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${acc.badge} ${
                        isSelected ? "ring-2 ring-teal-600 shadow-xs" : "hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px] truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{acc.role}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {acc.email}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compliance & Support Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-700" />
              <span>NABH • NABL • ISO 27001 Certified</span>
            </div>
            <span>Hospital IT Helpdesk: Ext 101</span>
          </div>
        </div>
      </div>
    </div>
  );
}

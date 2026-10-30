"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  BedDouble,
  Activity,
  Layers,
  FileText,
  ShieldAlert,
  Bell,
  Stethoscope,
  ClipboardList,
  Pill,
  CreditCard,
  FlaskConical,
  Hash,
  Calendar,
  HeartPulse,
  Scan,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar({ user }) {
  const pathname = usePathname();
  const role = user?.roleSlug || "hospital_admin";

  const getNavItems = () => {
    // 1. Super Admin & Hospital Admin
    if (role === "super_admin" || role === "hospital_admin") {
      return [
        {
          category: "Overview",
          items: [
            { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          ],
        },
        {
          category: "Patient & Clinical Operations",
          items: [
            { label: "Patient Directory", href: "/patients", icon: Users },
            { label: "Appointments & Queue", href: "/appointments", icon: Calendar },
            { label: "OPD Consultations", href: "/opd", icon: Stethoscope },
            { label: "Inpatient Care (IPD)", href: "/ipd", icon: BedDouble },
            { label: "Vitals Worklist", href: "/vitals", icon: HeartPulse },
          ],
        },
        {
          category: "Diagnostics & Pharmacy",
          items: [
            { label: "Laboratory (LIMS)", href: "/lab", icon: FlaskConical },
            { label: "Radiology (RIS)", href: "/radiology", icon: Scan },
            { label: "Pharmacy Dispense", href: "/pharmacy", icon: Pill },
            { label: "Store & Inventory", href: "/inventory", icon: Boxes },
          ],
        },
        {
          category: "Hospital Administration",
          items: [
            { label: "Hospital Settings", href: "/admin/settings", icon: Settings },
            { label: "Departments & Units", href: "/admin/departments", icon: Building2 },
            { label: "Wards & Bed Board", href: "/admin/wards-beds", icon: BedDouble },
            { label: "Operating Theatres", href: "/admin/operating-rooms", icon: Activity },
            { label: "Services & Tariffs", href: "/admin/services-tariffs", icon: Layers },
            { label: "Numbering Rules", href: "/admin/numbering", icon: Hash },
          ],
        },
        {
          category: "Workforce & Governance",
          items: [
            { label: "Staff & Credentials", href: "/staff", icon: Users },
            { label: "Security & Audit Logs", href: "/security/audit-logs", icon: FileText },
            { label: "Break-Glass Protocol", href: "/security/break-glass", icon: ShieldAlert },
          ],
        },
        {
          category: "Communications",
          items: [
            { label: "Notification Center", href: "/notifications", icon: Bell },
          ],
        },
      ];
    }

    // 2. Doctor (Consultant, Resident, Emergency)
    if (role === "doctor" || role === "resident_doctor" || role === "emergency_doctor") {
      return [
        {
          category: "Clinical Workspace",
          items: [
            { label: "Doctor Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "OPD Consultation Queue", href: "/opd", icon: Stethoscope },
            { label: "Inpatient Ward Rounds", href: "/ipd", icon: BedDouble },
            { label: "Patient Records", href: "/patients", icon: Users },
            { label: "Staff Directory", href: "/staff", icon: Users },
          ],
        },
        {
          category: "Diagnostic Results",
          items: [
            { label: "Lab Reports", href: "/lab", icon: FlaskConical },
            { label: "Radiology Imaging", href: "/radiology", icon: Scan },
            { label: "Pharmacy Formulary", href: "/pharmacy", icon: Pill },
          ],
        },
        {
          category: "Emergency & Safety",
          items: [
            { label: "Break-Glass Access", href: "/security/break-glass", icon: ShieldAlert },
            { label: "Clinical Alerts", href: "/notifications", icon: Bell },
          ],
        },
      ];
    }

    // 3. Nurse
    if (role === "nurse") {
      return [
        {
          category: "Nursing Operations",
          items: [
            { label: "Nursing Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "Inpatient Wards & eMAR", href: "/ipd", icon: BedDouble },
            { label: "Vitals & Care Worklist", href: "/vitals", icon: HeartPulse },
            { label: "Patient Directory", href: "/patients", icon: Users },
            { label: "Staff & Doctor Directory", href: "/staff", icon: Users },
            { label: "Lab Requisitions", href: "/lab", icon: FlaskConical },
            { label: "Pharmacy Supply", href: "/pharmacy", icon: Pill },
            { label: "Notifications & Tasks", href: "/notifications", icon: Bell },
          ],
        },
        {
          category: "Emergency",
          items: [
            { label: "Break-Glass Override", href: "/security/break-glass", icon: ShieldAlert },
          ],
        },
      ];
    }

    // 4. Receptionist
    if (role === "receptionist") {
      return [
        {
          category: "Front Desk & Queue",
          items: [
            { label: "Reception Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "Patient Directory", href: "/patients", icon: Users },
            { label: "Staff & Doctor Directory", href: "/staff", icon: Users },
            { label: "Appointments & Tokens", href: "/appointments", icon: Calendar },
            { label: "Bed Availability", href: "/admin/wards-beds", icon: BedDouble },
            { label: "Notifications", href: "/notifications", icon: Bell },
          ],
        },
      ];
    }

    // 5. Lab Technician / Pathologist
    if (role === "lab_tech" || role === "pathologist") {
      return [
        {
          category: "Diagnostics / LIMS",
          items: [
            { label: "Lab Workstation", href: "/lab", icon: FlaskConical },
            { label: "Patient Directory", href: "/patients", icon: Users },
            { label: "Diagnostic Services", href: "/admin/services-tariffs", icon: Layers },
            { label: "Critical Alerts", href: "/notifications", icon: Bell },
          ],
        },
      ];
    }

    // 6. Pharmacist
    if (role === "pharmacist") {
      return [
        {
          category: "Pharmacy Dispensing",
          items: [
            { label: "Dispensing Desk", href: "/pharmacy", icon: Pill },
            { label: "Inventory & Stock", href: "/inventory", icon: Boxes },
            { label: "Patient Records", href: "/patients", icon: Users },
            { label: "Medicines & Tariffs", href: "/admin/services-tariffs", icon: Layers },
            { label: "Stock Alerts", href: "/notifications", icon: Bell },
          ],
        },
      ];
    }

    // 7. Cashier / Billing Executive
    if (role === "cashier") {
      return [
        {
          category: "Patient Billing",
          items: [
            { label: "Billing Counter", href: "/dashboard", icon: LayoutDashboard },
            { label: "Patient Directory", href: "/patients", icon: Users },
            { label: "Services & Tariffs", href: "/admin/services-tariffs", icon: Layers },
            { label: "Financial Notifications", href: "/notifications", icon: Bell },
          ],
        },
      ];
    }

    return [
      {
        category: "Menu",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Notifications", href: "/notifications", icon: Bell },
        ],
      },
    ];
  };

  const navGroups = getNavItems();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3 bg-slate-950">
        <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-black text-lg tracking-wider shadow-md">
          J
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-wide text-white leading-tight">
            JIGYASA HMS
          </span>
          <span className="text-[10px] text-teal-400 font-medium tracking-wider uppercase">
            Super Speciality Hospital
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {group.category}
            </h4>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                      isActive
                        ? "bg-teal-700/80 text-white shadow-xs font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-teal-300" : "text-slate-400 group-hover:text-teal-400"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Facility Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-900 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate font-mono text-[11px]">System Online (PostgreSQL 18)</span>
        </div>
      </div>
    </aside>
  );
}

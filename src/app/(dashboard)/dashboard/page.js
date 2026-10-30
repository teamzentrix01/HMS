import { db } from "@/db";
import {
  patients,
  encounters,
  beds,
  wards,
  departments,
  users,
  roles,
  departmentAssignments,
  notifications,
  auditLogs,
  services,
} from "@/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import {
  Users,
  BedDouble,
  Activity,
  Calendar,
  CreditCard,
  FlaskConical,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Building2,
  Stethoscope,
  Search,
  Phone,
  Mail,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  // 1. Fetch live metrics
  const patientCountRes = await db.select({ val: count() }).from(patients);
  const totalPatients = patientCountRes[0]?.val || 0;

  const encounterList = await db.select().from(encounters);
  const opdCount = encounterList.filter((e) => e.encounterType === "OPD").length;
  const ipdCount = encounterList.filter((e) => e.encounterType === "IPD").length;
  const emgCount = encounterList.filter((e) => e.encounterType === "EMERGENCY").length;

  const bedList = await db.select().from(beds);
  const totalBeds = bedList.length;
  const occupiedBeds = bedList.filter((b) => b.status === "OCCUPIED").length;
  const availableBeds = bedList.filter((b) => b.status === "AVAILABLE").length;
  const cleaningBeds = bedList.filter((b) => b.status === "CLEANING").length;

  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const deptList = await db.select().from(departments);
  const staffList = await db.select().from(users);

  const staffWithRoles = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      employeeId: users.employeeId,
      specialization: users.specialization,
      designation: users.designation,
      phone: users.phone,
      email: users.email,
      roleName: roles.name,
      roleSlug: roles.slug,
      departmentName: departments.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(departmentAssignments, eq(users.id, departmentAssignments.userId))
    .leftJoin(departments, eq(departmentAssignments.departmentId, departments.id))
    .limit(6);

  // Recent notifications
  const recentAlerts = await db
    .select()
    .from(notifications)
    .orderBy(sql`${notifications.createdAt} DESC`)
    .limit(5);

  // Recent audit activity
  const recentAudit = await db
    .select()
    .from(auditLogs)
    .orderBy(sql`${auditLogs.createdAt} DESC`)
    .limit(5);

  const topStats = [
    {
      title: "Registered Patients",
      value: totalPatients.toString(),
      subtext: "One Medical Identity (UHID)",
      icon: Users,
      color: "text-teal-700 bg-teal-50 border-teal-200",
    },
    {
      title: "OPD Consultation Queue",
      value: opdCount.toString(),
      subtext: "Active outpatient encounters",
      icon: Stethoscope,
      color: "text-cyan-700 bg-cyan-50 border-cyan-200",
    },
    {
      title: "Inpatient Bed Occupancy",
      value: `${occupancyRate}%`,
      subtext: `${occupiedBeds} of ${totalBeds} beds occupied`,
      icon: BedDouble,
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    },
    {
      title: "Emergency & Trauma Cases",
      value: emgCount.toString(),
      subtext: "24x7 Level-1 Unit active",
      icon: Flame,
      color: "text-red-700 bg-red-50 border-red-200",
    },
    {
      title: "Operational Departments",
      value: deptList.length.toString(),
      subtext: "Integrated clinical & diagnostic",
      icon: Building2,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Active Clinicians & Staff",
      value: staffList.length.toString(),
      subtext: "Credentialed medical workforce",
      icon: ShieldCheck,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome back, {session?.firstName} {session?.lastName}
            </h1>
            <Badge variant="teal" className="capitalize">
              {session?.roleName || session?.roleSlug?.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Jigyasa Super Speciality Hospital • Sector 62 Noida Campus • Active Department:{" "}
            <strong>{session?.departmentName || "Executive Administration"}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/wards-beds"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
          >
            Visual Bed Board
          </Link>
          <Link
            href="/security/audit-logs"
            className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            Audit Trail
          </Link>
        </div>
      </div>

      {/* Top 6 High-Density KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {topStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {stat.title}
                </span>
                <div className={`p-1.5 rounded-lg border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {stat.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {stat.subtext}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Middle Grid: Bed Allocation Status & Hospital Departments Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bed Status Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ward & Bed Capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Available for Admission</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {availableBeds} Beds
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Currently Occupied</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {occupiedBeds} Beds
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Terminal Cleaning (Housekeeping)</span>
              <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                {cleaningBeds} Beds
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Total Registered Beds</span>
              <span className="font-bold text-slate-800">{totalBeds} Beds</span>
            </div>

            {/* Visual occupancy bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Occupancy Ratio</span>
                <span className="font-bold">{occupancyRate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all"
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
            </div>

            <Link
              href="/admin/wards-beds"
              className="mt-3 block text-center py-2 px-3 bg-slate-50 hover:bg-slate-100 text-teal-800 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              Open Interactive Bed Matrix →
            </Link>
          </CardContent>
        </Card>

        {/* Real-time Alerts & Escalations */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-600" />
              Critical Escalations & Operations Broadcast
            </CardTitle>
            <Link
              href="/notifications"
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
            >
              All Alerts
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Badge
                      variant={
                        alert.priority === "CRITICAL"
                          ? "danger"
                          : alert.priority === "URGENT"
                          ? "warning"
                          : "teal"
                      }
                      className="mt-0.5 shrink-0"
                    >
                      {alert.priority}
                    </Badge>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {alert.title}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(alert.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hospital Workforce Quick Finder & On-Duty Directory */}
      <Card className="border border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-700" />
              On-Duty Medical Staff & Clinician Roster
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant access to attending doctors, nursing officers, diagnostic technologists, and pharmacists
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 text-xs font-semibold transition-colors"
            >
              <Search className="w-3.5 h-3.5" /> Search All Staff ({staffList.length}) →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffWithRoles.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-teal-300 hover:shadow-xs transition-all flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                  {s.firstName?.[0] || "E"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {s.roleSlug?.includes("doctor") ? `Dr. ${s.firstName} ${s.lastName}` : `${s.firstName} ${s.lastName}`}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                      {s.employeeId}
                    </span>
                  </div>
                  <div className="text-[11px] text-teal-700 font-medium truncate mt-0.5">
                    {s.departmentName || "General Staff"}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {s.specialization || s.designation || s.roleName}
                  </div>
                  {s.phone && (
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-1">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Live Immutable Audit Trail Snippet */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Immutable Audit & Governance Stream
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatic tamper-resistant logging of all clinical, administrative and security events
            </p>
          </div>
          <Link
            href="/security/audit-logs"
            className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
          >
            View Full Audit Ledger →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {recentAudit.map((log) => (
              <div
                key={log.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Badge variant="default" className="font-mono text-[10px]">
                    {log.action}
                  </Badge>
                  <span className="font-semibold text-slate-900">
                    {log.module} / {log.resource}
                  </span>
                  <span className="text-slate-500">
                    by <strong className="text-slate-700">{log.userEmail}</strong> ({log.userRole})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="truncate max-w-xs">{log.reason || "-"}</span>
                  <span className="font-mono text-[10px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


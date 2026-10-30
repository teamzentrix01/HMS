import { db } from "@/db";
import { operatingRooms } from "@/db/schema";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldCheck, Clock, Scissors, AlertTriangle } from "lucide-react";

export default async function OperatingRoomsPage() {
  const ots = await db.select().from(operatingRooms).orderBy(operatingRooms.name);

  const statusMap = {
    AVAILABLE: { label: "Ready / Available", badge: "success" },
    PREPARING: { label: "Pre-Op Prep", badge: "warning" },
    IN_SURGERY: { label: "In Active Surgery", badge: "danger" },
    RECOVERY: { label: "Post-Op Recovery", badge: "info" },
    CLEANING: { label: "CSSD & Sterilization", badge: "warning" },
    MAINTENANCE: { label: "Biomedical Service", badge: "default" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Operation Theatre (OT) Suites
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Module 1 & 15: Surgical suites, laminar airflow monitoring and CSSD sterile readiness
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ots.map((ot) => {
          const cfg = statusMap[ot.status] || statusMap.AVAILABLE;
          return (
            <Card key={ot.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-teal-800 text-sm">
                    {ot.roomNumber}
                  </span>
                  <Badge variant={cfg.badge}>{cfg.label}</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{ot.name}</h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Specialty: {ot.speciality}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Location: {ot.floor}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> CSSD Sterilized
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Cycle Valid
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


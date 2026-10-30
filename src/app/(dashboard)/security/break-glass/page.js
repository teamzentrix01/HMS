"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function BreakGlassMonitorPage() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/security/break-glass");
      const d = await res.json();
      setRecords(d.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Emergency Break-Glass Governance & Monitoring
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Module 9 & 28: Live tracking and medical superintendent compliance review for emergency clinical permission overrides
        </p>
      </div>

      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-900">
        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">HOSPITAL REGULATORY OVERSIGHT:</strong>
          <p>
            Every break-glass activation provides immediate temporary clinical chart access for critical patient resuscitations.
            All actions during break-glass are automatically tagged and queued for peer review by the Quality & Ethics Committee.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target Patient UHID</TableHead>
                <TableHead>Clinical Emergency Indication</TableHead>
                <TableHead>Justification</TableHead>
                <TableHead>Granted At</TableHead>
                <TableHead>Expires At</TableHead>
                <TableHead>Governance Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => {
                const isExpired = new Date(r.expiresAt) < new Date();
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-bold text-xs text-teal-800">
                      {r.patientUhid || "Emergency Case"}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {r.reason}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-sm">
                      {r.justification}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(r.grantedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(r.expiresAt)}
                    </TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Badge variant="default">Expired / Audited</Badge>
                      ) : (
                        <Badge variant="danger" className="animate-pulse">
                          Active Override ({r.accessDurationMinutes}m)
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


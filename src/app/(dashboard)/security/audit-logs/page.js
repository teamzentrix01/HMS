"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ShieldCheck, Search, Eye, Filter } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (moduleFilter !== "ALL") params.append("module", moduleFilter);
      if (actionFilter !== "ALL") params.append("action", actionFilter);
      if (search) params.append("q", search);

      const res = await fetch(`/api/audit?${params.toString()}`);
      const d = await res.json();
      setLogs(d.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const actionVariants = {
    CREATE: "teal",
    UPDATE: "info",
    DELETE: "danger",
    SIGN: "success",
    VERIFY: "purple",
    BREAK_GLASS: "danger",
    LOGIN: "default",
    LOGOUT: "default",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Hospital Security & Immutable Audit Trail
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Module 22 & 28: Regulatory NABH/HIPAA compliance ledger recording every critical clinical, financial and configuration change
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row gap-3 items-center justify-between"
          >
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Search by user email, resource, or justification..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Modules</option>
                <option value="AUTH">Authentication</option>
                <option value="ADMIN">Hospital Admin</option>
                <option value="CLINICAL">Clinical & Notes</option>
                <option value="SECURITY">Security & Access</option>
              </select>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="SIGN">SIGN</option>
                <option value="BREAK_GLASS">BREAK_GLASS</option>
                <option value="LOGIN">LOGIN</option>
              </select>

              <Button type="submit" size="sm">
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module / Resource</TableHead>
                <TableHead>User / Role</TableHead>
                <TableHead>Reason / Notes</TableHead>
                <TableHead className="text-right">Inspection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionVariants[log.action] || "default"}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900 text-xs">
                      {log.module}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {log.resource} {log.resourceId ? `#${log.resourceId}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-800 text-xs">
                      {log.userEmail}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {log.userRole?.replace("_", " ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                    {log.reason || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedLog(log)}
                      className="text-xs text-teal-700 hover:text-teal-900"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Inspect Diff
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inspect Diff Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Deep Inspection"
        description={`Event ID: ${selectedLog?.id} • Action: ${selectedLog?.action}`}
        maxWidth="max-w-3xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">User</span>
                <span className="font-bold text-slate-900">{selectedLog.userEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Role</span>
                <span className="font-mono text-slate-800">{selectedLog.userRole}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Resource</span>
                <span className="font-mono text-slate-800">{selectedLog.resource}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">IP Address</span>
                <span className="font-mono text-slate-800">{selectedLog.ipAddress || "127.0.0.1"}</span>
              </div>
            </div>

            {selectedLog.reason && (
              <div className="text-xs p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900">
                <strong>Audit Justification:</strong> {selectedLog.reason}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Before State
                </h4>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {selectedLog.beforeState
                    ? JSON.stringify(selectedLog.beforeState, null, 2)
                    : "// None (Creation or Stateless event)"}
                </pre>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  After State
                </h4>
                <pre className="p-3 bg-slate-900 text-teal-300 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {selectedLog.afterState
                    ? JSON.stringify(selectedLog.afterState, null, 2)
                    : "// None (Deletion event)"}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <Button size="sm" onClick={() => setSelectedLog(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


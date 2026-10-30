"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Flame, AlertCircle, ShieldAlert, Info, CheckCheck } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = useState([]);
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const d = await res.json();
      setNotifications(d.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return <Flame className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />;
      case "URGENT":
        return <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case "IMPORTANT":
        return <ShieldAlert className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />;
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterPriority !== "ALL" && n.priority !== filterPriority) return false;
    if (filterCategory !== "ALL" && n.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Hospital Central Notification Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Module 24: Real-time clinical alerts, critical lab panics, bed sanitation triggers and operational broadcasts
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={markAllAsRead} className="gap-1.5">
          <CheckCheck className="w-4 h-4" /> Mark All as Acknowledged
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="URGENT">Urgent</option>
          <option value="IMPORTANT">Important</option>
          <option value="INFO">Info</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Categories</option>
          <option value="CLINICAL">Clinical</option>
          <option value="OPERATIONAL">Operational</option>
          <option value="FINANCIAL">Financial</option>
          <option value="SYSTEM">System & Security</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
              !n.isRead
                ? "bg-white border-teal-300 shadow-xs"
                : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              {getPriorityIcon(n.priority)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {n.title}
                  </span>
                  <Badge
                    variant={
                      n.priority === "CRITICAL"
                        ? "danger"
                        : n.priority === "URGENT"
                        ? "warning"
                        : "teal"
                    }
                    className="text-[10px]"
                  >
                    {n.priority}
                  </Badge>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    {n.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {n.message}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                {formatDateTime(n.createdAt)}
              </span>
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-teal-600" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


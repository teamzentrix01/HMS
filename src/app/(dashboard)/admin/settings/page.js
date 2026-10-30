"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Phone, Mail, MapPin, Globe, CheckCircle2, AlertCircle } from "lucide-react";

export default function HospitalSettingsPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleHospitalSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalUpdate: data.hospital }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Hospital master profile updated and logged." });
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = async (key, value) => {
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setData((prev) => ({
        ...prev,
        settings: prev.settings.map((s) => (s.key === key ? { ...s, value } : s)),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading Hospital Configuration...</div>;
  }

  const hosp = data?.hospital || {};
  const settingsList = data?.settings || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Hospital Profile & Master Administration
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Module 1: Facility registration, accreditation, emergency hotlines and operational policies
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Facility Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Healthcare Facility Identity</CardTitle>
              <CardDescription>
                Primary facility branding, statutory registration, and emergency contacts
              </CardDescription>
            </div>
            <Badge variant="teal">{hosp.accreditation || "NABH Accredited"}</Badge>
          </div>
        </CardHeader>
        <form onSubmit={handleHospitalSave}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Hospital Registered Name"
                value={hosp.name || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    hospital: { ...hosp, name: e.target.value },
                  })
                }
                required
              />
              <Input
                label="Hospital Tagline / Motto"
                value={hosp.tagline || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    hospital: { ...hosp, tagline: e.target.value },
                  })
                }
              />
              <Input
                label="Primary Board Line (PBX)"
                value={hosp.phone || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    hospital: { ...hosp, phone: e.target.value },
                  })
                }
              />
              <Input
                label="24x7 Emergency / Code Blue Hotline"
                value={hosp.emergencyPhone || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    hospital: { ...hosp, emergencyPhone: e.target.value },
                  })
                }
              />
              <Input
                label="Administrative Email"
                value={hosp.email || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    hospital: { ...hosp, email: e.target.value },
                  })
                }
              />
              <Input
                label="Campus Address & Postal Code"
                value={hosp.address || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    hospital: { ...hosp, address: e.target.value },
                  })
                }
              />
            </div>
          </CardContent>
          <CardFooter>
            <span className="text-xs text-slate-500">
              Tax GSTIN: {hosp.taxId || "GSTIN07AAAAA0000A1Z5"}
            </span>
            <Button type="submit" size="sm" isLoading={isSaving}>
              Save Profile Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Global Hospital Policy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>System Operating Policies & Protocols</CardTitle>
          <CardDescription>
            Configurable clinical thresholds, security timeouts, and automated billing rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {settingsList.map((st) => (
              <div
                key={st.key}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{st.key}</span>
                    <Badge variant="default" className="text-[10px]">
                      {st.category}
                    </Badge>
                  </div>
                  <p className="text-slate-500 mt-0.5">{st.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={st.value}
                    onChange={(e) =>
                      setData({
                        ...data,
                        settings: data.settings.map((s) =>
                          s.key === st.key ? { ...s, value: e.target.value } : s
                        ),
                      })
                    }
                    className="w-40 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConfigChange(st.key, st.value)}
                  >
                    Update
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


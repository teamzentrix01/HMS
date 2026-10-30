"use client";
import React from "react";
import { User, AlertTriangle, ShieldCheck, HeartPulse, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function GlobalPatientHeader({ patient, encounter }) {
  if (!patient) return null;

  const calculateAge = (dob) => {
    if (!dob) return "-";
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="bg-slate-900 text-white px-5 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 border-b-2 border-teal-500">
      {/* Patient Identification */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-teal-800 text-teal-200 border border-teal-600 flex items-center justify-center font-bold text-sm shrink-0">
          {patient.firstName[0]}
          {patient.lastName[0]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-white">
              {patient.firstName} {patient.lastName}
            </h2>
            <Badge variant="teal" className="font-mono text-[11px] py-0">
              {patient.uhid}
            </Badge>
            <span className="text-xs text-slate-300">
              {age}y / {patient.gender}
            </span>
            {patient.bloodGroup && (
              <span className="text-xs font-semibold px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-800 rounded">
                {patient.bloodGroup}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Building className="w-3 h-3 text-teal-400" />
              {encounter?.departmentName || "Cardiology & Cardiac Sciences"}
            </span>
            <span>•</span>
            <span>Attending: {encounter?.doctorName || "Dr. Arvind Sharma"}</span>
            {encounter?.encounterNumber && (
              <>
                <span>•</span>
                <span className="font-mono text-teal-300">
                  {encounter.encounterNumber}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Clinical Safety & Alerts */}
      <div className="flex items-center gap-2.5">
        {/* Allergy Alert */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-700/80 text-amber-200 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Allergies:{" "}
            <strong className="text-amber-100">
              {patient.allergies?.length
                ? patient.allergies.map((a) => a.allergen).join(", ")
                : "Penicillin (Anaphylaxis)"}
            </strong>
          </span>
        </div>

        {/* Fall Risk / Code Status */}
        <Badge variant="cyan" className="text-[11px]">
          Resuscitation: Full Code
        </Badge>
      </div>
    </div>
  );
}


"use client";
import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { GlobalPatientHeader } from "@/components/layout/global-patient-header";
import {
  User,
  HeartPulse,
  Stethoscope,
  ClipboardList,
  Pill,
  FlaskConical,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileCheck,
  ArrowRight,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function PatientLongitudinalProfilePage({ params }) {
  const unwrappedParams = use(params);
  const patientId = unwrappedParams.id;

  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}`);
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [patientId]);

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading Patient Electronic Health Record...</div>;
  }

  if (!data?.patient) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-sm font-bold text-slate-800">Patient Record Not Found</h2>
        <Link href="/patients" className="text-xs text-teal-700 underline mt-2 block">
          Return to Patients Directory
        </Link>
      </div>
    );
  }

  const { patient, allergies, conditions, encounters, vitals, notes, orders, prescriptions } = data;

  const tabs = [
    { id: "overview", label: "Clinical Summary", icon: User },
    { id: "encounters", label: `Encounters (${encounters.length})`, icon: Clock },
    { id: "vitals", label: `Vitals Flowsheet (${vitals.length})`, icon: HeartPulse },
    { id: "notes", label: `Consultation Notes (${notes.length})`, icon: Stethoscope },
    { id: "orders", label: `Investigation Orders (${orders.length})`, icon: FlaskConical },
    { id: "prescriptions", label: `Prescriptions (${prescriptions.length})`, icon: Pill },
  ];

  return (
    <div className="space-y-6">
      {/* Global Patient Header (Mandatory per Section 10) */}
      <div className="rounded-xl overflow-hidden shadow-sm">
        <GlobalPatientHeader
          patient={patient}
          encounter={encounters[0] || null}
        />
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Quick Actions:</span>
          <Link
            href={`/appointments?patientId=${patient.id}&patientUhid=${patient.uhid}`}
            className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" /> Book OPD Appointment
          </Link>
          <Link
            href={`/vitals?patientId=${patient.id}`}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <HeartPulse className="w-3.5 h-3.5 text-teal-600" /> Record Vitals
          </Link>
          {encounters[0]?.id && (
            <Link
              href={`/opd/${encounters[0].id}`}
              className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Stethoscope className="w-3.5 h-3.5" /> Open Active Consultation
            </Link>
          )}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Last EHR Update: {formatDateTime(patient.updatedAt)}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-teal-700 text-teal-900 bg-white rounded-t-lg shadow-xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-700" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Clinical Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 space-y-4">
            <CardHeader>
              <CardTitle>Demographic & Contact Identification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Full Name</span>
                  <span className="font-bold text-slate-900 text-sm">{patient.firstName} {patient.lastName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">UHID (Master ID)</span>
                  <span className="font-mono font-bold text-teal-800 text-sm">{patient.uhid}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Date of Birth / Age</span>
                  <span className="font-medium text-slate-800">{formatDate(patient.dateOfBirth)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Gender / Blood Group</span>
                  <span className="font-medium text-slate-800">{patient.gender} • {patient.bloodGroup || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Primary Mobile</span>
                  <span className="font-mono font-medium text-slate-800">{patient.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Email Address</span>
                  <span className="text-slate-700 truncate block">{patient.email || "Not Provided"}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Address & City</span>
                  <span className="text-slate-700">{patient.address || "-"}, {patient.city}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Safety Alerts & Kin */}
          <div className="space-y-6">
            <Card className="border-amber-200">
              <CardHeader className="bg-amber-50/50">
                <CardTitle className="text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Known Allergies ({allergies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {allergies.length === 0 ? (
                  <span className="text-xs text-slate-400">No known drug allergies reported.</span>
                ) : (
                  allergies.map((al) => (
                    <div key={al.id} className="p-2 rounded bg-amber-50/80 border border-amber-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span>{al.allergen}</span>
                        <Badge variant="danger" className="text-[9px] py-0">{al.severity}</Badge>
                      </div>
                      <div className="text-[11px] text-amber-800 mt-0.5">{al.reaction || "Severe reaction"}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xs">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div className="font-bold text-slate-900">{patient.emergencyContactName || "Not Documented"}</div>
                <div className="text-slate-500">{patient.emergencyContactRelation || "Next of Kin"}</div>
                <div className="font-mono text-teal-800">{patient.emergencyContactPhone || "-"}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Encounters Timeline */}
      {activeTab === "encounters" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Encounter #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Attending Consultant</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead>Arrival Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encounters.map((enc) => (
                  <TableRow key={enc.id}>
                    <TableCell className="font-mono font-bold text-xs text-teal-800">
                      {enc.encounterNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant={enc.encounterType === "EMERGENCY" ? "danger" : "teal"}>
                        {enc.encounterType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">
                      {enc.departmentName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      Dr. {enc.doctorName || "Sharma"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {enc.chiefComplaint || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(enc.arrivalTime)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{enc.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/opd/${enc.id}`}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                      >
                        Open Workspace →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Vitals Flowsheet */}
      {activeTab === "vitals" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Blood Pressure (mmHg)</TableHead>
                  <TableHead>Heart Rate (bpm)</TableHead>
                  <TableHead>Respiratory Rate</TableHead>
                  <TableHead>Temp (°C)</TableHead>
                  <TableHead>SpO2 (%)</TableHead>
                  <TableHead>Pain (0-10)</TableHead>
                  <TableHead>Weight / BMI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vitals.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(v.recordedAt)}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs text-slate-900">
                      {v.systolicBp}/{v.diastolicBp}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-800">
                      {v.heartRate}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      {v.respiratoryRate || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      {v.temperatureCelsius ? `${v.temperatureCelsius} °C` : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-xs font-bold ${v.spo2Percent < 92 ? "text-red-600" : "text-emerald-700"}`}>
                        {v.spo2Percent}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-mono">
                      {v.painScore}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {v.weightKg ? `${v.weightKg} kg` : "-"} {v.bmi ? `(BMI: ${v.bmi})` : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Doctor Notes */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Primary Diagnosis: {n.primaryDiagnosis || "Outpatient Clinical Consultation"}
                  </CardTitle>
                  <CardDescription>
                    Attending: Dr. {n.doctorName} • {formatDateTime(n.signedAt || n.createdAt)}
                  </CardDescription>
                </div>
                {n.isSigned ? (
                  <Badge variant="teal" className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Digitally Signed
                  </Badge>
                ) : (
                  <Badge variant="warning">Draft Note</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {n.subjective && (
                  <div>
                    <strong className="text-slate-500 uppercase text-[10px] block font-semibold">Subjective History:</strong>
                    <p className="text-slate-800 mt-0.5 leading-relaxed">{n.subjective}</p>
                  </div>
                )}
                {n.objective && (
                  <div>
                    <strong className="text-slate-500 uppercase text-[10px] block font-semibold">Physical Examination:</strong>
                    <p className="text-slate-800 mt-0.5 leading-relaxed">{n.objective}</p>
                  </div>
                )}
                {n.assessment && (
                  <div>
                    <strong className="text-slate-500 uppercase text-[10px] block font-semibold">Clinical Assessment:</strong>
                    <p className="text-slate-800 mt-0.5 leading-relaxed">{n.assessment}</p>
                  </div>
                )}
                {n.plan && (
                  <div>
                    <strong className="text-slate-500 uppercase text-[10px] block font-semibold">Treatment Plan & Advice:</strong>
                    <p className="text-slate-800 mt-0.5 leading-relaxed">{n.plan}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 5: Orders */}
      {activeTab === "orders" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Order Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Instructions</TableHead>
                  <TableHead>Ordered Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-mono font-bold text-xs text-teal-800">
                      {ord.orderNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="teal">{ord.orderType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ord.priority === "STAT" ? "danger" : "default"}>
                        {ord.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {ord.instructions || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {formatDateTime(ord.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{ord.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Prescriptions */}
      {activeTab === "prescriptions" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rx #</TableHead>
                  <TableHead>Clinical Instructions</TableHead>
                  <TableHead>Prescribed Date</TableHead>
                  <TableHead>Digital Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-mono font-bold text-xs text-teal-800">
                      {rx.prescriptionNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {rx.instructions || "Dispense as directed"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {formatDateTime(rx.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Signed by Consultant</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// src/pages/Patients/PatientManagement.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePatients } from "../../hooks/usePatients";
import PatientForm from "./PatientForm";
import ConsentManager from "../../components/Patients/ConsentManager";
import { Patient } from "../../types/patient";
import { useRBAC } from "../../context/RoleContext";
import {
  Users, UserPlus, Search, Calendar, FilePlus, FileSignature,
  Trash2, Edit2, Activity
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import dayjs from "dayjs";
import { getModalityColors } from "../../utils/modalityColors";
import { getGenderColors } from "../../utils/genderColors";
import { cn } from "../../lib/utils";

const PatientManagement: React.FC = () => {
  const { user } = useRBAC();
  const role = user?.role ?? "viewer";
  const { patients, addPatient, updatePatient, deletePatient } = usePatients();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Patient | null>(null);
  const [selectedPatientForConsent, setSelectedPatientForConsent] = useState<Patient | null>(null);
  const navigate = useNavigate();

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const name = (p.name || "").toLowerCase();
    const id = (p.id || "").toString().toLowerCase();
    const uid = (p.aadhaarNumber || "").toLowerCase();
    return name.includes(q) || id.includes(q) || uid.includes(q);
  });

  const handleAdd = (data: Omit<Patient, "id">) => {
    addPatient(data);
    setEditing(null);
  };

  const handleUpdate = (data: Omit<Patient, "id">) => {
    if (editing) updatePatient(editing.id, data);
    setEditing(null);
  };

  const canEdit = role === "admin" || role === "radiologist" || role === "receptionist";

  // Stats
  const stats = {
    total: patients.length,
    today: patients.filter(p => p.date && dayjs(p.date).isSame(dayjs(), 'day')).length,
    recent: patients.slice(0, 5)
  };

  // Actions
  const handleBookAppointment = (p: Patient) => {
    // Navigate to appointments with pre-select
    navigate(`/appointments?patient_id=${p.id}&patient_name=${encodeURIComponent(p.name || "")}`);
  };

  const handleOrderScan = (p: Patient) => {
    // Navigate to Order creation with pre-select
    navigate(`/orders?patient_id=${p.id}&patient_name=${encodeURIComponent(p.name || "")}`);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full font-sans">

      {/* HEADER & STATS */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Patient Management</h1>
            <p className="text-slate-500 mt-1">Central registry for patient demographics and clinical history</p>
          </div>
          {canEdit && (
            <Button
              onClick={() => setEditing({} as Patient)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 gap-2"
            >
              <UserPlus size={18} /> Register New Patient
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Registered Patients"
            value={stats.total}
            icon={<Users className="text-blue-500" />}
            trend="+12% this month"
          />
          <StatCard
            label="New Registrations Today"
            value={stats.today}
            icon={<Activity className="text-emerald-500" />}
            trend="Active today"
          />
          <StatCard
            label="Pending Consents"
            value={1} // Placeholder or calculate
            icon={<FileSignature className="text-amber-500" />}
            trend="Action required"
          />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* TOOLBAR */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by Name, MRN, ID or Aadhaar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            {/* Advanced filters could go here */}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Patient Info</th>
                <th className="px-6 py-4">Demographics</th>
                <th className="px-6 py-4">IDs (MRN / UID)</th>
                <th className="px-6 py-4">Last Visit</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm", getModalityColors(p.modality).bg, getModalityColors(p.modality).text)}>
                        {(p.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {p.name || "Unknown Patient"}
                          {p.modality && (
                            <span className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] uppercase tracking-wider font-bold border", getModalityColors(p.modality).bg, getModalityColors(p.modality).text, getModalityColors(p.modality).border)}>
                              {p.modality}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{p.studyDescription || 'General checkup'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                      getGenderColors(p.gender).bg,
                      getGenderColors(p.gender).text,
                      getGenderColors(p.gender).border
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", getGenderColors(p.gender).indicator)}></span>
                      {p.age} Yrs • {p.gender}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-slate-600">ID: {p.id}</div>
                    {p.aadhaarNumber && <div className="font-mono text-[10px] text-slate-400">UID: {p.aadhaarNumber}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {p.date ? dayjs(p.date).format("MMM D, YYYY") : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleBookAppointment(p)}
                        title="Book Appointment"
                        className="p-2 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                      >
                        <Calendar size={16} />
                      </button>
                      <button
                        onClick={() => handleOrderScan(p)}
                        title="Order Scan"
                        className="p-2 bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                      >
                        <FilePlus size={16} />
                      </button>
                      <button
                        onClick={() => setSelectedPatientForConsent(p)}
                        title="Manage Consents"
                        className="p-2 bg-white text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                      >
                        <FileSignature size={16} />
                      </button>
                      <button
                        onClick={() => setEditing(p)}
                        title="Edit Details"
                        className="p-2 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all shadow-sm hover:shadow-md"
                      >
                        <Edit2 size={16} />
                      </button>

                      {role === 'admin' && (
                        <button onClick={() => deletePatient(p.id)} className="p-2 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-sm hover:shadow-md">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="opacity-20" />
                      <p>No patients found matching "{search}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all scale-100">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-xl sticky top-0 z-10">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {editing.id ? <Edit2 size={20} className="text-indigo-500" /> : <UserPlus size={20} className="text-indigo-500" />}
                {editing.id ? 'Edit Patient Record' : 'New Patient Registration'}
              </h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1 transition-colors">
                <Trash2 className="rotate-45" size={24} /> {/* X icon replacement */}
              </button>
            </div>
            <div className="p-0">
              <PatientForm
                initialData={editing.id ? editing : null}
                onSubmit={editing.id ? handleUpdate : handleAdd}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {selectedPatientForConsent && (
        <ConsentManager
          patientId={selectedPatientForConsent.id.toString()}
          patientName={selectedPatientForConsent.name || "Unknown Patient"}
          onClose={() => setSelectedPatientForConsent(null)}
        />
      )}
    </div>
  );
};

function StatCard({ label, value, icon, trend }: { label: string, value: number, icon: React.ReactNode, trend?: string }) {
  return (
    <Card className="border-none shadow-sm bg-white/80 backdrop-blur ring-1 ring-slate-200/60">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <h4 className="text-3xl font-extrabold text-slate-800">{value}</h4>
          {trend && <p className="text-xs text-slate-400 mt-2 font-medium">{trend}</p>}
        </div>
        <div className="p-3 bg-slate-50 rounded-xl ring-1 ring-slate-100">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

export default PatientManagement;

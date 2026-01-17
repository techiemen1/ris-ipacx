// src/pages/Settings/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import UserManagement from "../Admin/UserManagement";
import PACSManagement from "../Admin/PACSManagement";
import ReportTemplatesManager from "./ReportTemplatesManager";
import BillingSettingsManager from "./BillingSettingsManager";
import ReferenceDataManager from "./ReferenceDataManager";
import ModalitySettings from "./ModalitySettings";
import dayjs from "dayjs";
import { toast } from "react-hot-toast"; // optional: if you have it. If not, remove toast.* lines

// Simple tab definition
const TABS = [
  { id: "system", label: "System & Security" },
  { id: "org", label: "Organization" },
  { id: "users", label: "Users & Roles" },
  { id: "pacs", label: "PACS / DICOM" },
  { id: "clinical", label: "Clinical Workflow" },
  { id: "refdata", label: "Reference Data" },
  { id: "modalities", label: "Modalities" },
  { id: "billing", label: "Billing & GST" },
  { id: "templates", label: "Report Templates" },
  { id: "ai", label: "AI & Reporting" },
  { id: "devops", label: "DevOps & Diagnostics" },
  { id: "danger", label: "Danger Zone" },
];

// ... imports

// ... TABS ...

const DangerAction = ({ label, actionType, onConfirm }: { label: string, actionType: string, onConfirm: () => Promise<void> }) => {
  const [confirming, setConfirming] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (input !== "DELETE") return;
    setLoading(true);
    try {
      await onConfirm();
      setConfirming(false);
      setInput("");
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="mt-4 p-4 bg-white rounded border border-red-200 shadow-sm animate-in fade-in zoom-in duration-200">
        <p className="text-sm font-bold text-red-700 mb-2">Type "DELETE" to confirm {label}:</p>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="DELETE"
            className="h-9 text-sm border-red-300 focus:border-red-500 max-w-[120px]"
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={input !== "DELETE" || loading}
            onClick={handleConfirm}
          >
            {loading ? "Deleting..." : "Confirm Delete"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setConfirming(false); setInput(""); }}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="destructive" onClick={() => setConfirming(true)} className="w-full sm:w-auto">
      {label}
    </Button>
  );
};

export default function SettingsPage() {
  const [active, setActive] = useState<string>("system");
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Danger Zone Filter State
  const [dangerFilters, setDangerFilters] = useState({ patientId: "", dateFrom: "", dateTo: "" });
  // ... rest of component code ...

  // load settings once
  const load = async () => {
    try {
      setLoading(true);
      const r = await axiosInstance.get("/settings");
      setSettings(r.data?.data ?? {});
    } catch (err) {
      console.error("load settings", err);
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // helper: shallow update nested keys safely
  const updateNested = (path: string[], value: any) => {
    setSettings((prev: any) => {
      const clone = { ...(prev || {}) };
      let cur = clone;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        if (!cur[k]) cur[k] = {};
        cur = cur[k];
      }
      cur[path[path.length - 1]] = value;
      return clone;
    });
  };

  // unified save for a key group
  const saveKey = async (key: string, value: any) => {
    setSaving(true);
    try {
      await axiosInstance.post("/settings", { key, value });
      // optimistic reload
      await load();
      // small toast if available
      try { toast?.success?.("Saved"); } catch { }
    } catch (err) {
      console.error("save settings", err);
      try { toast?.error?.("Save failed"); } catch { }
      alert("Save failed — check console for details");
    } finally {
      setSaving(false);
    }
  };

  // derived safe defaults so UI doesn't crash
  const system = settings?.system ?? {};
  const org = settings?.org ?? {}; // Organization details
  const clinical = settings?.clinical ?? {};
  const ai = settings?.ai ?? {};
  const devops = settings?.devops ?? {};

  // small helper for risk / security tips UI
  const SecurityTips: React.FC = () => (
    <div className="text-sm text-gray-600 space-y-2">
      <div>Security quick tips:</div>
      <ul className="list-disc list-inside ml-3">
        <li>Restrict API & UI access to your LAN / VPN.</li>
        <li>Use HTTPS and strong JWT secret rotated periodically.</li>
        <li>Enable audit logging and role-based finalization for reports.</li>
      </ul>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">System configuration, users, PACS and developer settings.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => { setActive("system"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            Go to System
          </Button>
        </div>
      </div>

      {/* Top tabs — clean blue theme */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 rounded-t-md border-b-2 -mb-2 font-medium transition ${active === t.id
              ? "bg-white text-blue-800 border-blue-600 shadow-sm"
              : "bg-transparent text-gray-700 border-transparent hover:text-blue-700"
              }`}
            aria-current={active === t.id ? "page" : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-6">
        {active === "system" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>System & Security</CardTitle>
                <div className="text-sm text-gray-500">Last loaded: {settings?.meta?.loaded_at ? dayjs(settings.meta.loaded_at).format("YYYY-MM-DD HH:mm") : "—"}</div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Allowed LAN CIDR</label>
                  <Input
                    value={system.lanCidr ?? "192.168.0.0/16"}
                    onChange={(e) => updateNested(["system", "lanCidr"], e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">JWT expiry (minutes)</label>
                  <Input
                    type="number"
                    value={system.jwtExpiry ?? 1440}
                    onChange={(e) => updateNested(["system", "jwtExpiry"], Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Enable audit logging</label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={system.audit ?? "on"}
                    onChange={(e) => updateNested(["system", "audit"], e.target.value)}
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Button onClick={() => saveKey("system", system)} disabled={saving}>Save System Settings</Button>
                <Button variant="outline" onClick={() => { setSettings((s: any) => ({ ...s, system: {} })); }}>Reset</Button>
                <div className="ml-auto">
                  <SecurityTips />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {active === "org" && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1 font-medium">Hospital / Clinic Name</label>
                  <Input
                    value={org.name ?? ""}
                    onChange={(e) => updateNested(["org", "name"], e.target.value)}
                    placeholder="e.g. City General Hospital"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm mb-1 font-medium">Full Address (Footer)</label>
                  <Input
                    value={org.address ?? ""}
                    onChange={(e) => updateNested(["org", "address"], e.target.value)}
                    placeholder="e.g. 123 Medical Drive, Health City, ST 12345"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1 font-medium">Enquiry Phone No</label>
                  <Input
                    value={org.enquiryPhone ?? ""}
                    onChange={(e) => updateNested(["org", "enquiryPhone"], e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1 font-medium">Contact No (Emergency/Admin)</label>
                  <Input
                    value={org.contactPhone ?? ""}
                    onChange={(e) => updateNested(["org", "contactPhone"], e.target.value)}
                    placeholder="+91 12345 67890"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1 font-medium">Email Address</label>
                  <Input
                    value={org.email ?? ""}
                    onChange={(e) => updateNested(["org", "email"], e.target.value)}
                    placeholder="info@hospital.com"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1 font-medium">Website</label>
                  <Input
                    value={org.website ?? ""}
                    onChange={(e) => updateNested(["org", "website"], e.target.value)}
                    placeholder="www.hospital.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm mb-1 font-medium">Logo URL</label>
                  <Input
                    value={org.logo ?? ""}
                    onChange={(e) => updateNested(["org", "logo"], e.target.value)}
                    placeholder="https://... or /logo.png"
                  />
                  <p className="text-xs text-slate-500 mt-1">Provide a URL or path to your logo image.</p>
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={() => saveKey("org", org)} disabled={saving}>Save Organization Settings</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {active === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>Users & Roles</CardTitle>
            </CardHeader>
            <CardContent>
              {/* embed your existing UserManagement component */}
              <UserManagement />
            </CardContent>
          </Card>
        )}

        {active === "pacs" && (
          <Card>
            <CardHeader>
              <CardTitle>PACS / DICOM Settings</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="mb-4 text-sm text-gray-600">
                Configure Orthanc / DCM4CHEE / DICOMweb entries used by the system.
              </div>

              {/* embed your existing PACSManagement */}
              <PACSManagement />
            </CardContent>
          </Card>
        )}

        {active === "clinical" && (
          <Card>
            <CardHeader>
              <CardTitle>Clinical & Workflow</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Default modalities (comma)</label>
                  <Input
                    value={(clinical?.modalities ?? ["CR", "CT", "MR"]).join(",")}
                    onChange={(e) =>
                      updateNested(["clinical", "modalities"], e.target.value.split(",").map((s: string) => s.trim()))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Accession prefix</label>
                  <Input
                    value={clinical?.accessionPrefix ?? ""}
                    onChange={(e) => updateNested(["clinical", "accessionPrefix"], e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Button onClick={() => saveKey("clinical", clinical)} disabled={saving}>Save Clinical Settings</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {active === "templates" && (
          <ReportTemplatesManager />
        )}

        {active === "ai" && (
          <Card>
            <CardHeader>
              <CardTitle>AI & Reporting</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">AI model</label>
                  <Input value={ai?.model ?? "gpt-4o-mini"} onChange={(e) => updateNested(["ai", "model"], e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm mb-1">AI temperature</label>
                  <Input type="number" value={ai?.temp ?? 0.25} onChange={(e) => updateNested(["ai", "temp"], Number(e.target.value))} />
                </div>
              </div>

              <div className="mt-4">
                <Button onClick={() => saveKey("ai", ai)} disabled={saving}>Save AI Settings</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {active === "billing" && <BillingSettingsManager />}

        {active === "refdata" && <ReferenceDataManager />}

        {active === "modalities" && <ModalitySettings />}

        {active === "devops" && (
          <Card>
            <CardHeader>
              <CardTitle>DevOps & Diagnostics</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Enable verbose logs</label>
                  <select value={devops?.verbose ? "on" : "off"} onChange={(e) => updateNested(["devops", "verbose"], e.target.value === "on")} className="w-full border rounded px-2 py-1">
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Health check URL</label>
                  <Input value={devops?.healthUrl ?? "/health"} onChange={(e) => updateNested(["devops", "healthUrl"], e.target.value)} />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Button onClick={() => saveKey("devops", devops)} disabled={saving}>Save DevOps Settings</Button>
                <Button variant="outline" onClick={() => {
                  (async () => {
                    try {
                      const r = await axiosInstance.get(devops?.healthUrl ?? "/health");
                      alert(`Health OK: ${r.status}`);
                    } catch (err) {
                      console.error("health check", err);
                      alert("Health check failed (see console)");
                    }
                  })();
                }}>
                  Quick Health Check
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DANGER ZONE */}
        {active === "danger" && (
          <Card className="border-red-200 shadow-sm">
            <CardHeader className="bg-red-50/50 border-b border-red-100">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">

              {/* Alert Box */}
              <div className="bg-red-50 text-red-800 p-4 rounded-md text-sm border border-red-200">
                <strong>Warning:</strong> Actions here are irreversible. Please be certain before proceeding.
                Use filters below to delete specific records, otherwise ALL records of that type will be deleted.
              </div>

              {/* Filters Section */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Selective Deletion Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Patient ID (Exact Match)</label>
                    <Input
                      value={dangerFilters.patientId}
                      onChange={e => setDangerFilters(p => ({ ...p, patientId: e.target.value }))}
                      placeholder="e.g. PAT-1234"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">From Date</label>
                    <Input
                      type="date"
                      value={dangerFilters.dateFrom}
                      onChange={e => setDangerFilters(p => ({ ...p, dateFrom: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">To Date</label>
                    <Input
                      type="date"
                      value={dangerFilters.dateTo}
                      onChange={e => setDangerFilters(p => ({ ...p, dateTo: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  * Leave filters empty to delete ALL records. Specifying multiple filters combines them (AND logic).
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Reports Cleanup */}
                <div className="border border-red-100 rounded-lg p-5 bg-white shadow-sm flex flex-col">
                  <h3 className="font-semibold text-gray-800 mb-1">Reports Only</h3>
                  <p className="text-xs text-gray-500 mb-4 flex-1">
                    Deletes reports matching the filters. Does NOT affect orders or patients.
                  </p>
                  <DangerAction
                    label="Delete Reports"
                    actionType="reports"
                    onConfirm={async () => {
                      await axiosInstance.post("/admin/cleanup", { type: "reports", filters: dangerFilters });
                      toast.success("Reports deleted");
                    }}
                  />
                </div>

                {/* Orders Cleanup */}
                <div className="border border-red-100 rounded-lg p-5 bg-white shadow-sm flex flex-col">
                  <h3 className="font-semibold text-gray-800 mb-1">Orders & Schedule</h3>
                  <p className="text-xs text-gray-500 mb-4 flex-1">
                    Deletes orders, appointments, worklist, and billing. Does NOT delete patients.
                  </p>
                  <DangerAction
                    label="Delete Orders"
                    actionType="orders"
                    onConfirm={async () => {
                      await axiosInstance.post("/admin/cleanup", { type: "orders", filters: dangerFilters });
                      toast.success("Orders deleted");
                    }}
                  />
                </div>

                {/* EVERYTHING Cleanup */}
                <div className="border border-red-200 rounded-lg p-5 bg-red-50/30 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1 bg-red-100 rounded-bl text-[10px] font-bold text-red-600 uppercase">Extreme</div>
                  <h3 className="font-semibold text-red-900 mb-1">Delete Everything</h3>
                  <p className="text-xs text-red-700/70 mb-4 flex-1">
                    Wipes EVERYTHING matching filters: Patients, Orders, Reports, Billing.
                  </p>
                  <DangerAction
                    label="Delete Everything"
                    actionType="everything"
                    onConfirm={async () => {
                      await axiosInstance.post("/admin/cleanup", { type: "everything", filters: dangerFilters });
                      toast.success("Data wiped successfully");
                    }}
                  />
                </div>

              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


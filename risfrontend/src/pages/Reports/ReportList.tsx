import React, { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRBAC } from "../../context/RoleContext";
import dayjs from "dayjs";
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  FileClock,
  Trash2
} from "lucide-react";

// Types
type ReportRow = {
  id?: number;
  studyUID?: string;
  patientName?: string;
  patientID?: string;
  accessionNumber?: string;
  modality?: string;
  studyDate?: string;
  status?: string;
};

export default function ReportList(): JSX.Element {
  const [list, setList] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter State
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "draft" | "final">("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const navigate = useNavigate();
  const { user } = useRBAC();
  const isAdmin = user?.role === "admin";

  // Load Reports
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/reports");
      setList(data?.data ?? data ?? []);
    } catch (err) {
      console.error("load reports", err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Statistics
  const stats = useMemo(() => {
    const total = list.length;
    const draft = list.filter(r => (r.status || "").toLowerCase() === "draft").length;
    const final = list.filter(r => (r.status || "").toLowerCase() === "final").length;
    const todayStr = dayjs().format("YYYY-MM-DD");
    const today = list.filter(r => r.studyDate && dayjs(r.studyDate).format("YYYY-MM-DD") === todayStr).length;
    return { total, draft, final, today };
  }, [list]);

  // Filtering Logic
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return list.filter((r) => {
      const matchesQ =
        !q ||
        (r.patientName || "").toLowerCase().includes(q) ||
        (r.patientID || "").toLowerCase().includes(q) ||
        (r.accessionNumber || "").toLowerCase().includes(q) ||
        (r.modality || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter ? (r.status || "").toLowerCase() === statusFilter : true;
      return matchesQ && matchesStatus;
    });
  }, [list, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const displayed = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  // Actions
  const openViewer = (row: ReportRow) => {
    if (row.studyUID) navigate(`/report/${row.studyUID}`);
  };

  const handleDelete = async (row: ReportRow) => {
    if (!row.studyUID) return;

    const confirmMsg = `MEDICAL-LEGAL WARNING: You are about to DELETE the report for:\n\n` +
      `• Patient: ${row.patientName}\n` +
      `• ID: ${row.patientID}\n` +
      `• Accession: ${row.accessionNumber}\n\n` +
      `Are you ABSOLUTELY sure? This action is permanent and will be audited.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await axiosInstance.delete(`/reports/study/${row.studyUID}`);
      // toast.success("Report deleted");
      setList(prev => prev.filter(r => r.studyUID !== row.studyUID));
    } catch (err) {
      console.error("delete error", err);
    }
  };

  const handleNewReport = () => {
    // Redirect to PACS for proper study selection
    navigate('/pacs');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans">

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Reporting Worklist</h1>
            <p className="text-slate-500 mt-1">Manage and finalize diagnostic reports</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button onClick={handleNewReport} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-200">
              <Plus size={18} /> New Report
            </Button>
          </div>
        </div>

        {/* Stats Cards - Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <StatCard label="Total Reports" value={stats.total} icon={<FileText className="text-blue-500" />} />
          <StatCard label="Drafts Pending" value={stats.draft} icon={<FileClock className="text-amber-500" />} />
          <StatCard label="Finalized Today" value={stats.today} icon={<FileCheck className="text-emerald-500" />} />
          <StatCard label="Total Finalized" value={stats.final} icon={<FileCheck className="text-purple-500" />} />
        </div>
      </div>

      {/* Main List Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search patient, ID, modality..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              className="text-sm border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="">All Status</option>
              <option value="draft">Drafts Only</option>
              <option value="final">Finalized Only</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Accession / ID</th>
                <th className="px-6 py-3">Modality</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading reports...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No reports found matching your filters.</td></tr>
              ) : displayed.map((r) => (
                <tr key={r.id || r.studyUID} className="hover:bg-slate-50 transition-colors group cursor-default">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{r.patientName || "Unknown"}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-xs font-mono font-semibold text-slate-700">{r.accessionNumber || "—"}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{r.patientID}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getModalityColor(r.modality)}`}>
                      {r.modality || "UN"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {r.studyDate ? dayjs(r.studyDate).format("MMM D, YYYY") : "—"}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                        onClick={() => openViewer(r)}
                      >
                        {(r.status === 'final') ? "View" : "Edit"}
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(r)}
                          title="Delete Report (Admin Only)"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Subcomponents ---

function StatCard({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm ring-1 ring-slate-200/60">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-slate-100 rounded-full">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  if (s === 'final') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
        Finalized
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
      Draft
    </span>
  )
}

function getModalityColor(m?: string) {
  switch (m?.toUpperCase()) {
    case "CT": return "bg-blue-50 text-blue-700 border-blue-100";
    case "MR": return "bg-purple-50 text-purple-700 border-purple-100";
    case "CR": case "DX": case "XR": return "bg-slate-100 text-slate-700 border-slate-200";
    case "US": return "bg-amber-50 text-amber-700 border-amber-100";
    default: return "bg-gray-50 text-gray-600 border-gray-100";
  }
}

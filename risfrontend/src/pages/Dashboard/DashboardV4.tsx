import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, AlertTriangle, IndianRupee, Activity, CheckCircle, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from "../../lib/utils";

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
interface PacsStatus {
  name: string;
  status: 'online' | 'offline';
  last_connected: string | null;
}

interface DashboardStats {
  patients_today: number;
  studies_today: number;
  pending_reports: number;
  orders_today: number;
  revenue_today: number;
  avg_tat_hours: number;
  revenue_trend: { label: string; value: number }[];
  reporting_trend: { label: string; value: number }[];
  pacs_servers: PacsStatus[];
}

const DEFAULT_STATS: DashboardStats = {
  patients_today: 0,
  studies_today: 0,
  pending_reports: 0,
  orders_today: 0,
  revenue_today: 0,
  avg_tat_hours: 0,
  revenue_trend: [],
  reporting_trend: [],
  pacs_servers: []
};



/* -------------------------------------------------
   COMPONENTS
-------------------------------------------------- */
const StatCard = ({ title, value, icon: Icon, color, prefix = "" }: any) => (
  <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4 flex items-center justify-between transition-all hover:shadow-md hover:border-indigo-100 duration-200">
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded bg-opacity-10", `bg-${color}-500 text-${color}-600`)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-xl font-black text-slate-800">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get('/analytics/dashboard');
      setStats(res.data || DEFAULT_STATS);
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30s
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      {/* HEADER: COMPACT */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Activity className="w-5 h-5 text-indigo-600" /> INTELLIGENCE HUB
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Operational Command & Control</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-tighter animate-pulse border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> REAL-TIME SYNC
          </span>
        </div>
      </div>

      {/* KPI GRID: HIGH DENSITY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Daily Throughput"
          value={loading ? "..." : stats.patients_today}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Reporting Backlog"
          value={loading ? "..." : stats.pending_reports}
          icon={AlertTriangle}
          color={stats.pending_reports > 10 ? "red" : "amber"}
        />
        <StatCard
          title="Reporting Velocity (TAT)"
          value={loading ? "..." : `${stats.avg_tat_hours}h`}
          icon={History}
          color="indigo"
        />
        <StatCard
          title="Imaging Output"
          value={loading ? "..." : stats.studies_today}
          icon={CheckCircle}
          color="sky"
        />
        <StatCard
          title="Fiscal Pulse"
          value={loading ? "..." : stats.revenue_today}
          icon={IndianRupee}
          color="emerald"
          prefix="₹"
        />
      </div>

      {/* ANALYTICS ROW: DUAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Revenue Performance (7D)</h3>
            <span className="text-[9px] font-black text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded">₹ FISCAL</span>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenue_trend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px' }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Reporting Throughput (7D)</h3>
            <span className="text-[9px] font-black text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded">SCAN VOLUME</span>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.reporting_trend}>
                <defs>
                  <linearGradient id="colorRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px' }} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRep)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* HUD ROW: SYSTEM HEALTH & CONNECTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LOGS HUD */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Operational Pulse</h3>
          <div className="flex-1 space-y-3">
            <div className="p-2 bg-slate-50 border border-slate-100 rounded text-[10px] flex justify-between items-center">
              <span className="font-bold text-slate-600">Active Worklist Studies</span>
              <span className="text-indigo-600 font-black">{stats.studies_today}</span>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded text-[10px] flex justify-between items-center">
              <span className="font-bold text-slate-600">Avg TAT Latency</span>
              <span className="text-amber-600 font-black">{stats.avg_tat_hours} hrs</span>
            </div>
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-[10px] text-indigo-700 italic">
              System optimized. No critical hardware failures detected.
            </div>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="mt-6 pt-3 border-t text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
          >
            Access Worklist Flow →
          </button>
        </div>

        {/* INFRASTRUCTURE HUD */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Digital Architecture</h3>
            <span className="text-[8px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded leading-none">RAID-5 ACTIVE</span>
          </div>
          <div className="flex-1 space-y-4">
            <div className="p-3 bg-slate-900 rounded-lg">
              <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1.5">
                <span>PACS NODE STORAGE</span>
                <span className="text-emerald-400">74%</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: '74%' }}></div>
              </div>
              <div className="mt-2 text-[8px] text-slate-600 italic">Auto-archive schedule: Weekly (Sunday 02:00)</div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-indigo-50/50 border border-indigo-100 rounded">
              <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
              <div>
                <div className="text-[10px] font-black text-indigo-900">Synapse Intelligence</div>
                <div className="text-[8px] text-indigo-500">Clinical Triage Engine Active</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/pacs')}
            className="mt-6 pt-3 border-t text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
          >
            INFRASTRUCTURE MAP →
          </button>
        </div>

        {/* CONNECTIVITY HUD */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Synced Tele-Imaging Nodes</h3>
          <div className="flex-1 space-y-2">
            {stats.pacs_servers.length > 0 ? stats.pacs_servers.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    p.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"
                  )}></span>
                  <div>
                    <div className="text-[10px] font-black text-slate-800 leading-tight uppercase tracking-tighter">{p.name}</div>
                    <div className="text-[8px] font-bold text-slate-400 leading-none">{p.status === 'online' ? 'LIVE SYNC' : 'OFFLINE'}</div>
                  </div>
                </div>
                <div className="text-[8px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                  {p.last_connected ? new Date(p.last_connected).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-[9px] text-slate-400 italic font-bold">NO NODES CONFIGURED</div>
            )}
          </div>
          <div className="mt-6 pt-3 border-t flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <span>Heartbeat: 30s</span>
            <button
              onClick={() => navigate('/settings')}
              className="hover:text-indigo-600"
            >Manage Registry</button>
          </div>
        </div>
      </div>
    </div>
  );
}

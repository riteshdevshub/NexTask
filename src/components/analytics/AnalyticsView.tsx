import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardData } from '../../types/index.js';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';

export function AnalyticsView() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiRequest<DashboardData>('/api/analytics/dashboard');
        setData(res);
      } catch {
        // Quietly handle
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleExport = (format: 'csv' | 'json') => {
    window.open(`/api/analytics/export?format=${format}`, '_blank');
    success(`Downloading workspace ${format.toUpperCase()} export...`);
  };

  const metrics = data?.metrics || {
    total: 0,
    completed: 0,
    inProgress: 0,
    review: 0,
    pending: 0,
    completionRate: 0,
    activeProjects: 0,
    totalNotes: 0,
    totalFiles: 0,
  };

  const priorityData = data?.priorityDistribution || [];
  const weeklyData = data?.weeklyProgress || [];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Analytics & Velocity Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quantify sprint output, track team throughput, and export audit backups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-500" />
            Export JSON
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 mb-1">Completion Ratio</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {metrics.completionRate}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.completed} of {metrics.total} closed
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 mb-1">In-Flight Queue</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-500">
            {metrics.inProgress + metrics.review}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.inProgress} sprint · {metrics.review} review
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 mb-1">Active Projects</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-indigo-500">
            {metrics.activeProjects}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Workspaces configured</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Assets</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-purple-500">
            {metrics.totalNotes + metrics.totalFiles}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.totalNotes} notes · {metrics.totalFiles} files
          </p>
        </div>
      </div>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Bar Chart */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Weekly Throughput: Created vs Completed
            </h2>
            <p className="text-[11px] text-slate-500">Daily velocity over the past 7 days</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="completed" fill="#6366F1" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="created" fill="#94A3B8" radius={[4, 4, 0, 0]} name="Created" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Tasks by Priority Level
            </h2>
            <p className="text-[11px] text-slate-500">Distribution across urgency tiers</p>
          </div>

          <div className="space-y-3 pt-2">
            {priorityData.map((p) => {
              const totalActive = metrics.total || 1;
              const pct = Math.round((p.count / totalActive) * 100);

              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {p.count} tasks ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

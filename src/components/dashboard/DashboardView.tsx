import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderGit2,
  TrendingUp,
  Plus,
  ArrowRight,
  Flame,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { DashboardData, Task, Project } from '../../types/index.js';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';

interface DashboardViewProps {
  onSelectTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  onSelectTask: (task: Task) => void;
  onSelectProject: (projectId: string) => void;
}

export function DashboardView({
  onSelectTab,
  onOpenQuickAdd,
  onSelectTask,
  onSelectProject,
}: DashboardViewProps) {
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const fetchDashboardData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest<DashboardData>('/api/analytics/dashboard');
      setData(res);
    } catch (err: any) {
      // Quietly log without noisy console alert
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, authLoading]);

  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await apiRequest(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      success(nextStatus === 'completed' ? 'Task completed! Great job.' : 'Task marked as todo.');
      fetchDashboardData();
    } catch (err: any) {
      error('Failed to update task.');
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setSubmitting(true);
    try {
      await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: quickTitle.trim(),
          priority: quickPriority,
          status: 'todo',
          category: 'General',
        }),
      });
      success(`Added task "${quickTitle}"`);
      setQuickTitle('');
      fetchDashboardData();
    } catch (err: any) {
      error('Failed to add task.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Workspace Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Plan Smart. Work Better. Track current sprints, deadlines, and velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('tasks')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
          >
            Open Tasks Board
          </button>
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (Single-Elevation Depth) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Active Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {metrics.total}
            </span>
            <span className="text-xs text-slate-400">items</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {metrics.completed} completed · {metrics.pending} pending
          </div>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">In Progress</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {metrics.inProgress}
            </span>
            <span className="text-xs text-slate-400">sprinting</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            {metrics.review} in review queue
          </div>
        </div>

        {/* Completion Velocity */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {metrics.completionRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              velocity
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>

        {/* Active Projects */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Projects</span>
            <FolderGit2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {metrics.activeProjects}
            </span>
            <span className="text-xs text-slate-400">workspaces</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {metrics.totalNotes} notes · {metrics.totalFiles} files
          </div>
        </div>
      </div>

      {/* Quick Add Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="flex-1 w-full flex items-center gap-2 px-3">
          <Plus className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick add a task... (Press Enter to save)"
            className="w-full text-xs bg-transparent py-1.5 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-2 sm:px-0">
          <select
            value={quickPriority}
            onChange={(e: any) => setQuickPriority(e.target.value)}
            aria-label="Select task priority"
            className="text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>

          <button
            type="submit"
            disabled={submitting || !quickTitle.trim()}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      {/* Main Grid: Weekly Velocity Chart + Today's Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productivity Velocity Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Productivity Velocity (Last 7 Days)
              </h2>
              <p className="text-[11px] text-slate-500">
                Number of completed tasks vs newly added tasks
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
                Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-700 inline-block" />
                Created
              </span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.weeklyProgress || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                  name="Created"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Matrix & Urgent Deadlines */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Upcoming Deadlines
            </h2>
            <button
              onClick={() => onSelectTab('tasks')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {(data?.upcomingDeadlines || []).slice(0, 4).map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-900 dark:text-white line-clamp-1">
                    {task.title}
                  </p>
                  <span
                    className={`text-[10px] font-mono shrink-0 px-1.5 py-0.2 rounded ${
                      task.priority === 'urgent'
                        ? 'text-red-600 bg-red-50 dark:bg-red-950/40'
                        : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                  </span>
                  <span>·</span>
                  <span>{task.category}</span>
                </div>
              </div>
            ))}

            {(!data?.upcomingDeadlines || data.upcomingDeadlines.length === 0) && (
              <p className="text-xs text-slate-400 py-6 text-center">
                No imminent deadlines in the next 7 days.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Two Columns: Today's Tasks & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Today's Tasks & Sprints
              </h2>
              <p className="text-[11px] text-slate-500">
                Direct check-off updates your workspace instantly
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {(data?.todayTasks || []).length} scheduled
            </span>
          </div>

          <div className="space-y-2">
            {(data?.todayTasks || []).slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleToggleTask(task)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="truncate">
                    <p
                      className={`text-xs font-medium cursor-pointer truncate ${
                        task.status === 'completed'
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                      onClick={() => onSelectTask(task)}
                    >
                      {task.title}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {task.category} · Priority: {task.priority}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectTask(task)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {(!data?.todayTasks || data.todayTasks.length === 0) && (
              <div className="py-8 text-center text-xs text-slate-400">
                You're all caught up for today! Add a new task above.
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Audit Feed */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Recent Workspace Activity
              </h2>
              <p className="text-[11px] text-slate-500">
                Audit log of completed tasks, notes, and file updates
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(data?.recentActivities || []).slice(0, 5).map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div className="flex-1 truncate">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {act.action}:{' '}
                  </span>
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {act.entityTitle}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums mt-0.5">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {(!data?.recentActivities || data.recentActivities.length === 0) && (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

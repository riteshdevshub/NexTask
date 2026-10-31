import React, { useState, useEffect } from 'react';
import {
  List,
  Kanban,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Search,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Task, Project, TaskStatus, TaskPriority } from '../../types/index.js';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { TaskDetailModal } from './TaskDetailModal.js';
import { useAuth } from '../../context/AuthContext.js';

interface TasksViewProps {
  projects: Project[];
  onOpenQuickAdd: () => void;
  selectedTask?: Task | null;
  onClearSelectedTask?: () => void;
}

export function TasksView({
  projects,
  onOpenQuickAdd,
  selectedTask,
  onClearSelectedTask,
}: TasksViewProps) {
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('kanban');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('');

  // Active task for modal
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Calendar month state
  const [calendarDate, setCalendarDate] = useState(new Date());

  const { success, error } = useToast();

  const fetchTasks = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (projectFilter) params.set('projectId', projectFilter);
      if (search) params.set('search', search);

      const res = await apiRequest<{ tasks: Task[] }>(`/api/tasks?${params.toString()}`);
      setTasks(res.tasks || []);
    } catch (err: any) {
      // Quietly handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, statusFilter, priorityFilter, projectFilter, search]);

  useEffect(() => {
    if (selectedTask) {
      setActiveTask(selectedTask);
      setIsDetailOpen(true);
      if (onClearSelectedTask) onClearSelectedTask();
    }
  }, [selectedTask]);

  // Toggle status inline
  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await apiRequest(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (nextStatus === 'completed') {
        confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
        success('Task completed! 🎉');
      } else {
        success('Task status updated.');
      }
      fetchTasks();
    } catch {
      error('Failed to update task.');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault();
    if (dragOverColumn !== col) setDragOverColumn(col);
  };

  const handleDrop = async (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === col) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: col } : t)));

    try {
      await apiRequest(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: col }),
      });
      if (col === 'completed') {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        success('Moved to completed! 🎉');
      } else {
        success(`Task moved to ${col.replace('_', ' ')}.`);
      }
      fetchTasks();
    } catch {
      error('Failed to update task column.');
      fetchTasks();
    } finally {
      setDraggedTaskId(null);
    }
  };

  const columns: { id: TaskStatus; label: string; dotColor: string }[] = [
    { id: 'todo', label: 'To Do', dotColor: 'bg-slate-400' },
    { id: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-500' },
    { id: 'review', label: 'Under Review', dotColor: 'bg-indigo-500' },
    { id: 'completed', label: 'Completed', dotColor: 'bg-emerald-500' },
  ];

  // Calendar calculations
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Task Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize, prioritize, and track all tasks across List, Kanban, and Calendar views.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented View Mode Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Project Selector */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Priority Selector */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status Filter (applicable in list view) */}
          {viewMode === 'list' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>
          )}

          {(search || projectFilter || priorityFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setProjectFilter('');
                setPriorityFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <span className="text-[11px] font-mono tabular-nums text-slate-400">
          Showing {tasks.length} tasks
        </span>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-xl bg-slate-50/70 dark:bg-[#111827]/70 border transition-all ${
                  isOver
                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                    : 'border-slate-200/80 dark:border-slate-800/80'
                } p-3.5 min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task Cards Stack */}
                <div className="space-y-2.5 flex-1">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onClick={() => {
                        setActiveTask(t);
                        setIsDetailOpen(true);
                      }}
                      className="p-3 bg-white dark:bg-[#0B0F19] rounded-lg border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 cursor-grab active:cursor-grabbing shadow-xs transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                          {t.title}
                        </p>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                            t.priority === 'urgent'
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                              : t.priority === 'high'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      {t.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                          {t.description}
                        </p>
                      )}

                      {/* Unboxed Metadata (Zero-Pill rule) */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                        {t.dueDate && (
                          <>
                            <span>{new Date(t.dueDate).toLocaleDateString()}</span>
                            <span>·</span>
                          </>
                        )}
                        <span>{t.category}</span>
                        {t.subtasks && t.subtasks.length > 0 && (
                          <>
                            <span>·</span>
                            <span>
                              {t.subtasks.filter((s) => s.completed).length}/{t.subtasks.length}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: HIGH-DENSITY LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4 w-10">Done</th>
                  <th className="py-2.5 px-4">Task Title</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      setActiveTask(task);
                      setIsDetailOpen(true);
                    }}
                  >
                    <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => handleToggleStatus(task)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white line-clamp-1">
                        <span className={task.status === 'completed' ? 'line-through text-slate-400' : ''}>
                          {task.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[11px] capitalize text-slate-600 dark:text-slate-300">
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                          task.priority === 'urgent'
                            ? 'text-red-600 bg-red-50 dark:bg-red-950/40'
                            : task.priority === 'high'
                            ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                            : 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{task.category}</td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setActiveTask(task);
                          setIsDetailOpen(true);
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: INTERACTIVE CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                {monthNames[month]} {year}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded border border-slate-200 dark:border-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-800 font-medium"
              >
                Today
              </button>
              <button
                onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded border border-slate-200 dark:border-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading slots */}
            {[...Array(firstDayIndex)].map((_, i) => (
              <div key={`empty_${i}`} className="min-h-24 p-1 bg-slate-50/40 dark:bg-slate-900/20 rounded" />
            ))}

            {/* Actual day cells */}
            {[...Array(daysInMonth)].map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const dateStr = dateObj.toISOString().split('T')[0];

              const dayTasks = tasks.filter((t) => {
                if (!t.dueDate) return false;
                return t.dueDate.startsWith(dateStr);
              });

              const isToday =
                new Date().toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={`day_${dayNum}`}
                  className={`min-h-24 p-1.5 rounded border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between ${
                    isToday ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-500/30' : 'bg-white dark:bg-[#0B0F19]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span
                      className={`font-mono tabular-nums text-xs font-medium px-1.5 rounded ${
                        isToday ? 'bg-indigo-600 text-white font-bold' : 'text-slate-500'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 flex-1 overflow-y-auto max-h-20">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setActiveTask(t);
                          setIsDetailOpen(true);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer font-medium ${
                          t.status === 'completed'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
                            : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={activeTask}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onTaskUpdated={fetchTasks}
        projects={projects}
      />
    </div>
  );
}

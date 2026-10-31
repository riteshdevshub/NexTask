import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, CheckSquare, Archive } from 'lucide-react';
import { Task } from '../../types/index.js';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';

export function TrashView() {
  const { isAuthenticated } = useAuth();
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<'trash' | 'archive'>('trash');
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();

  const fetchItems = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const [trashRes, archiveRes] = await Promise.all([
        apiRequest<{ tasks: Task[] }>('/api/tasks?deleted=true'),
        apiRequest<{ tasks: Task[] }>('/api/tasks?archived=true'),
      ]);
      setDeletedTasks(trashRes.tasks || []);
      setArchivedTasks(archiveRes.tasks || []);
    } catch {
      // Quietly handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchItems();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleRestore = async (task: Task) => {
    try {
      await apiRequest(`/api/tasks/${task.id}/restore`, { method: 'POST' });
      success(`Restored "${task.title}" to active workspace.`);
      fetchItems();
    } catch {
      error('Failed to restore item.');
    }
  };

  const handlePermanentDelete = async (task: Task) => {
    try {
      await apiRequest(`/api/tasks/${task.id}?permanent=true`, { method: 'DELETE' });
      success('Task permanently deleted.');
      fetchItems();
    } catch {
      error('Failed to delete item.');
    }
  };

  const currentList = tab === 'trash' ? deletedTasks : archivedTasks;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Trash & Archive
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Safely recover accidentally deleted items or review archived historical sprints.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
          <button
            onClick={() => setTab('trash')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'trash'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Recycle Bin ({deletedTasks.length})
          </button>
          <button
            onClick={() => setTab('archive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'archive'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Archive ({archivedTasks.length})
          </button>
        </div>
      </div>

      {/* List Table */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
            <tr>
              <th className="py-2.5 px-4">Task Title</th>
              <th className="py-2.5 px-4">Category</th>
              <th className="py-2.5 px-4">Priority</th>
              <th className="py-2.5 px-4">Deleted / Archived Date</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {currentList.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.title}</span>
                  </div>
                </td>
                <td className="py-2.5 px-4 text-slate-500">{item.category}</td>
                <td className="py-2.5 px-4 font-mono text-[11px] uppercase text-slate-500">{item.priority}</td>
                <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleRestore(item)}
                      className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                    {tab === 'trash' && (
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        className="text-xs text-red-500 hover:text-red-700"
                        title="Delete permanently"
                      >
                        Delete Forever
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {currentList.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-xs text-slate-400">
                  {tab === 'trash' ? 'Recycle bin is completely empty.' : 'No archived items found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

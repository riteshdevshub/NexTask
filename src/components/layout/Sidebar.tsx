import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderGit2,
  FileText,
  HardDrive,
  BarChart3,
  Trash2,
  Settings,
  Plus,
  Folder,
  Circle,
} from 'lucide-react';
import { Project } from '../../types/index.js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  projects: Project[];
  onOpenCreateProject: () => void;
  taskStats?: { total: number; pending: number };
}

export function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  projects,
  onOpenCreateProject,
  taskStats,
}: SidebarProps) {
  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: taskStats?.pending },
    { id: 'projects', label: 'Projects', icon: FolderGit2, badge: projects.length },
    { id: 'notes', label: 'Notes & Workspace', icon: FileText },
    { id: 'files', label: 'File Manager', icon: HardDrive },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'trash', label: 'Trash & Archive', icon: Trash2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelect = (tab: string) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:sticky top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-64 bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between overflow-y-auto select-none`}
      >
        <div className="p-4 space-y-6">
          {/* Main Navigation */}
          <nav className="space-y-1">
            <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Workspace
            </p>
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Active Projects List */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Projects
              </p>
              <button
                onClick={onOpenCreateProject}
                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 rounded transition-colors"
                title="Create project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {projects.slice(0, 6).map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => handleSelect('projects')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Circle className="w-2.5 h-2.5 shrink-0" style={{ fill: proj.color, stroke: proj.color }} />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  {proj.taskStats && (
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                      {proj.taskStats.progress}%
                    </span>
                  )}
                </button>
              ))}

              {projects.length === 0 && (
                <p className="px-3 py-1 text-[11px] text-slate-400 italic">No projects yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Storage / Quick Status footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/70 dark:border-slate-800/70 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-300">NexTask Cloud</span>
              <span className="text-[10px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              MongoDB + Cloudinary Ready
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

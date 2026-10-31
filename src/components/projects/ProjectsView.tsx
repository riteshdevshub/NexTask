import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  Calendar,
  CheckSquare,
  FileText,
  HardDrive,
  MoreVertical,
  X,
  Edit,
  Trash2,
  Circle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Project, Task, Note, FileItem } from '../../types/index.js';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';

interface ProjectsViewProps {
  onRefreshProjects: () => void;
  onOpenTaskModal?: (task: Task) => void;
}

export function ProjectsView({ onRefreshProjects, onOpenTaskModal }: ProjectsViewProps) {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<Project['status']>('active');

  // Project Detail Room Drawer
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectRoom, setProjectRoom] = useState<{
    project: Project;
    tasks: Task[];
    notes: Note[];
    files: FileItem[];
  } | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);

  const { success, error } = useToast();

  const fetchProjects = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ projects: Project[] }>('/api/projects');
      setProjects(res.projects || []);
    } catch {
      // Quietly handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const openCreateModal = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    setColor('#6366F1');
    setDeadline('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setName(proj.name);
    setDescription(proj.description || '');
    setColor(proj.color || '#6366F1');
    setDeadline(proj.deadline ? proj.deadline.split('T')[0] : '');
    setStatus(proj.status || 'active');
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingProject) {
        await apiRequest(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            description,
            color,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            status,
          }),
        });
        success('Project updated.');
      } else {
        await apiRequest('/api/projects', {
          method: 'POST',
          body: JSON.stringify({
            name,
            description,
            color,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            status,
          }),
        });
        success('Project created.');
      }

      setIsModalOpen(false);
      fetchProjects();
      onRefreshProjects();
    } catch (err: any) {
      error(err.message || 'Failed to save project.');
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
      success('Project deleted.');
      if (selectedProjectId === id) setSelectedProjectId(null);
      fetchProjects();
      onRefreshProjects();
    } catch {
      error('Failed to delete project.');
    }
  };

  const openProjectRoom = async (proj: Project) => {
    setSelectedProjectId(proj.id);
    setLoadingRoom(true);
    try {
      const res = await apiRequest<{
        project: Project;
        tasks: Task[];
        notes: Note[];
        files: FileItem[];
      }>(`/api/projects/${proj.id}`);
      setProjectRoom(res);
    } catch {
      error('Failed to load project room.');
    } finally {
      setLoadingRoom(false);
    }
  };

  const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Projects & Workspaces
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Group your tasks, research notes, and asset files into unified project rooms.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const stats = proj.taskStats || { total: 0, completed: 0, progress: 0 };

          return (
            <div
              key={proj.id}
              onClick={() => openProjectRoom(proj)}
              className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-xs flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {proj.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEditModal(proj, e)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                      title="Edit project"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {proj.description || 'No project description provided.'}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${stats.progress}%`, backgroundColor: proj.color }}
                    />
                  </div>
                </div>

                {/* Unboxed Metadata (Zero-Pill rule) */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span>{stats.completed}/{stats.total} Tasks</span>
                    <span>·</span>
                    <span>{proj.notesCount || 0} Notes</span>
                    <span>·</span>
                    <span>{proj.filesCount || 0} Files</span>
                  </div>

                  {proj.deadline && (
                    <span className="text-slate-500">
                      Due {new Date(proj.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No projects found. Click "Create Project" to get started.
          </div>
        )}
      </div>

      {/* Project Room Modal / Drawer */}
      {selectedProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: projectRoom?.project.color || '#6366F1' }}
                />
                <div>
                  <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
                    {projectRoom?.project.name || 'Project Room'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Dedicated workspace for project assets and sprints
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProjectId(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingRoom ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading project room...</div>
              ) : (
                <>
                  {/* Scoped Tasks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-indigo-500" />
                        Associated Tasks ({(projectRoom?.tasks || []).length})
                      </h3>
                    </div>

                    <div className="space-y-1.5">
                      {(projectRoom?.tasks || []).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {t.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono capitalize text-slate-400">
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}

                      {(!projectRoom?.tasks || projectRoom.tasks.length === 0) && (
                        <p className="text-xs text-slate-400 py-3 italic">No tasks linked to this project yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Scoped Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500" />
                        Linked Notes ({(projectRoom?.notes || []).length})
                      </h3>
                    </div>

                    <div className="space-y-1.5">
                      {(projectRoom?.notes || []).map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-xs"
                        >
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{n.content}</p>
                        </div>
                      ))}

                      {(!projectRoom?.notes || projectRoom.notes.length === 0) && (
                        <p className="text-xs text-slate-400 py-3 italic">No notes linked yet.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 Website Redesign"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Target outcome, team members, deliverables..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        color === c ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

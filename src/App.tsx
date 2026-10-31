import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { ToastProvider, useToast } from './context/ToastContext.js';
import { TopBar } from './components/layout/TopBar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { DevOtpBanner } from './components/auth/DevOtpBanner.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal.js';
import { QuickAddModal } from './components/tasks/QuickAddModal.js';
import { DashboardView } from './components/dashboard/DashboardView.js';
import { TasksView } from './components/tasks/TasksView.js';
import { ProjectsView } from './components/projects/ProjectsView.js';
import { NotesView } from './components/notes/NotesView.js';
import { FilesView } from './components/files/FilesView.js';
import { AnalyticsView } from './components/analytics/AnalyticsView.js';
import { TrashView } from './components/trash/TrashView.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { Project, Task } from './types/index.js';
import { apiRequest } from './lib/api.js';

function MainApp() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authPrefillCode, setAuthPrefillCode] = useState('');
  const [authPrefillEmail, setAuthPrefillEmail] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Projects shared state for sidebar & task modals
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchSharedProjects = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiRequest<{ projects: Project[] }>('/api/projects');
      setProjects(res.projects || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSharedProjects();
    setSelectedTask(null);
  }, [isAuthenticated, user?.id]);

  // Global keyboard shortcuts (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDevOtpSelect = (code: string, email?: string) => {
    setAuthPrefillCode(code);
    if (email) {
      setAuthPrefillEmail(email);
    }
    setIsAuthOpen(true);
  };

  const handleNavigateFromSearch = (type: 'task' | 'project' | 'note' | 'file', item: any) => {
    if (type === 'task') {
      setActiveTab('tasks');
      setSelectedTask(item);
    } else if (type === 'project') {
      setActiveTab('projects');
    } else if (type === 'note') {
      setActiveTab('notes');
    } else if (type === 'file') {
      setActiveTab('files');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Dev OTP Inspector Banner */}
      <DevOtpBanner onSelectCode={handleDevOtpSelect} />

      {/* 3-Zone Compliant Top Navigation Bar */}
      <TopBar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuickAdd={() => {
          if (!isAuthenticated) {
            setIsAuthOpen(true);
          } else {
            setIsQuickAddOpen(true);
          }
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <div className="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto">
        {/* Workspace Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          projects={projects}
          onOpenCreateProject={() => {
            if (!isAuthenticated) {
              setIsAuthOpen(true);
            } else {
              setActiveTab('projects');
            }
          }}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-3.5rem)]">
          {activeTab === 'dashboard' && (
            <DashboardView
              onSelectTab={setActiveTab}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onSelectTask={(task) => {
                setActiveTab('tasks');
                setSelectedTask(task);
              }}
              onSelectProject={(projId) => {
                setActiveTab('projects');
              }}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              projects={projects}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              selectedTask={selectedTask}
              onClearSelectedTask={() => setSelectedTask(null)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              onRefreshProjects={fetchSharedProjects}
              onOpenTaskModal={(task) => {
                setActiveTab('tasks');
                setSelectedTask(task);
              }}
            />
          )}

          {activeTab === 'notes' && <NotesView />}

          {activeTab === 'files' && <FilesView />}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'trash' && <TrashView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthPrefillCode('');
          setAuthPrefillEmail('');
          fetchSharedProjects();
        }}
        prefillCode={authPrefillCode}
        prefillEmail={authPrefillEmail}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigateFromSearch}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onTaskCreated={() => {
          fetchSharedProjects();
        }}
        projects={projects}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  isVerified: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  userId: string;
  projectId?: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  category: string;
  tags: string[];
  subtasks: Subtask[];
  timeSpentMinutes: number;
  isArchived: boolean;
  isDeleted: boolean;
  attachments?: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  deadline?: string | null;
  isArchived: boolean;
  isDeleted: boolean;
  taskStats?: {
    total: number;
    completed: number;
    pending: number;
    progress: number;
  };
  notesCount?: number;
  filesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  projectId?: string | null;
  title: string;
  content: string;
  folder?: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  userId: string;
  projectId?: string | null;
  name: string;
  originalName: string;
  fileType: 'image' | 'pdf' | 'doc' | 'sheet' | 'text' | 'other';
  mimeType: string;
  sizeBytes: number;
  url: string;
  folder: string;
  isFavorite: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  entityType: 'task' | 'project' | 'note' | 'file';
  entityId: string;
  entityTitle: string;
  timestamp: string;
}

export interface DashboardMetrics {
  total: number;
  completed: number;
  inProgress: number;
  review: number;
  pending: number;
  completionRate: number;
  activeProjects: number;
  totalNotes: number;
  totalFiles: number;
}

export interface PriorityDistribution {
  name: string;
  count: number;
  color: string;
}

export interface WeeklyProgressItem {
  day: string;
  date: string;
  completed: number;
  created: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  todayTasks: Task[];
  upcomingDeadlines: Task[];
  priorityDistribution: PriorityDistribution[];
  weeklyProgress: WeeklyProgressItem[];
  recentActivities: Activity[];
}

export interface DevOtpItem {
  email: string;
  code: string;
  type: string;
  timestamp: string;
  expiresAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  isVerified: boolean;
  otpCode?: string | null;
  otpExpiresAt?: number | null;
  otpType?: 'verification' | 'passwordless' | 'reset';
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  projectId?: string | null;
  title: string;
  content: string; // Markdown or rich HTML
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
  url: string; // Cloudinary or base64/data-url
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

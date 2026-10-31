import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Task, Project, Note, FileItem, Activity } from '../models/schema.js';

interface DatabaseStore {
  users: User[];
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  files: FileItem[];
  activities: Activity[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const defaultStore: DatabaseStore = {
  users: [],
  tasks: [],
  projects: [],
  notes: [],
  files: [],
  activities: [],
};

class StoreManager {
  private data: DatabaseStore = defaultStore;
  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.persist();
      }
    } catch (err) {
      console.warn('[DB] Failed to load store.json, using in-memory store:', err);
      this.seedInitialData();
    }
    this.isLoaded = true;
  }

  private seedInitialData() {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('password123', salt);
    const now = new Date().toISOString();
    const demoUserId = 'usr_demo_101';

    const demoUser: User = {
      id: demoUserId,
      name: 'Alex Rivera',
      email: 'demo@nextask.io',
      passwordHash: demoPasswordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      isVerified: true,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    };

    const demoProjects: Project[] = [
      {
        id: 'proj_01',
        userId: demoUserId,
        name: 'NexTask Q4 Launch',
        description: 'Complete cross-platform productivity workspace release.',
        color: '#6366F1',
        icon: 'rocket',
        status: 'active',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'proj_02',
        userId: demoUserId,
        name: 'Brand & Design System',
        description: 'Design system overhaul with Linear and Notion aesthetics.',
        color: '#10B981',
        icon: 'palette',
        status: 'active',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'proj_03',
        userId: demoUserId,
        name: 'Mobile PWA Sync',
        description: 'Offline-first sync engine and mobile touch navigation.',
        color: '#F59E0B',
        icon: 'smartphone',
        status: 'planning',
        deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const demoTasks: Task[] = [
      {
        id: 'task_01',
        userId: demoUserId,
        projectId: 'proj_01',
        title: 'Finalize JWT and Resend OTP auth service',
        description: 'Verify 6-digit email OTPs, expiry timers, and secure token refresh.',
        status: 'completed',
        priority: 'urgent',
        dueDate: new Date(Date.now() - 86400000).toISOString(),
        category: 'Backend',
        tags: ['Security', 'Auth'],
        subtasks: [
          { id: 'sub_1', title: 'Generate bcrypt password hash', completed: true },
          { id: 'sub_2', title: 'Issue JWT access & refresh tokens', completed: true },
          { id: 'sub_3', title: 'Build Resend OTP email generator', completed: true },
        ],
        timeSpentMinutes: 120,
        isArchived: false,
        isDeleted: false,
        order: 1,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'task_02',
        userId: demoUserId,
        projectId: 'proj_01',
        title: 'Implement Kanban drag-and-drop workflow',
        description: 'Smooth state transitions across Todo, In Progress, Review, and Completed.',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        category: 'Frontend',
        tags: ['UI', 'Kanban'],
        subtasks: [
          { id: 'sub_4', title: 'Setup drag sensors & visual hover drop zones', completed: true },
          { id: 'sub_5', title: 'Optimistic state update with server sync', completed: false },
        ],
        timeSpentMinutes: 75,
        isArchived: false,
        isDeleted: false,
        order: 2,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'task_03',
        userId: demoUserId,
        projectId: 'proj_02',
        title: 'Audit typography hierarchy and zero-pill discipline',
        description: 'Ensure Plus Jakarta Sans headings, DM Sans body, and unboxed metadata.',
        status: 'review',
        priority: 'medium',
        dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
        category: 'Design',
        tags: ['Design System'],
        subtasks: [
          { id: 'sub_6', title: 'Replace pill tags with typographic separators', completed: true },
          { id: 'sub_7', title: 'Verify dark mode contrast ratios', completed: true },
        ],
        timeSpentMinutes: 45,
        isArchived: false,
        isDeleted: false,
        order: 3,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'task_04',
        userId: demoUserId,
        projectId: 'proj_01',
        title: 'Configure Cloudinary multi-format file uploader',
        description: 'Support PDF, PNG, JPG, XLSX previews with storage quota meter.',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        category: 'Integration',
        tags: ['Storage', 'Files'],
        subtasks: [
          { id: 'sub_8', title: 'Implement client base64 previewer', completed: false },
          { id: 'sub_9', title: 'Add folder tree organization', completed: false },
        ],
        timeSpentMinutes: 0,
        isArchived: false,
        isDeleted: false,
        order: 4,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const demoNotes: Note[] = [
      {
        id: 'note_01',
        userId: demoUserId,
        projectId: 'proj_01',
        title: 'NexTask Architecture & Product Vision',
        content: `## Product Philosophy\n\nNexTask blends the structured task execution of **Todoist**, the open-ended thought organization of **Notion**, and the centralized document repository of **Google Drive**.\n\n### Core Tenets\n- **Zero Distraction**: Clean borders, no neon badges, focused scannability.\n- **Speed First**: Sub-100ms micro-interactions, optimistic updates, and instant keyboard shortcuts.\n- **True Ownership**: User-scoped documents, verifiable access tokens, and zero leaked credentials.`,
        folder: 'Architecture',
        tags: ['Product', 'Specs'],
        isPinned: true,
        isFavorite: true,
        isArchived: false,
        isDeleted: false,
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'note_02',
        userId: demoUserId,
        projectId: 'proj_02',
        title: 'Design Guidelines: Linear & Notion Aesthetic',
        content: `### Visual Language Rules\n\n1. **Unboxed Metadata**: Metadata like due dates, categories, and tags should never be enclosed in rounded pill candy badges. Use clean text with typographic separators (\`·\`).\n2. **Tabular Numerals**: Enforce \`font-mono tabular-nums\` for timers, dates, task counts, and storage bytes.\n3. **60-30-10 Color Rule**: 60% neutral canvas, 30% structural surfaces, 10% purposeful indigo accent.\n4. **Dual Theme**: Strict dark and light theme parity.`,
        folder: 'Design',
        tags: ['Design', 'Standards'],
        isPinned: false,
        isFavorite: true,
        isArchived: false,
        isDeleted: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: now,
      },
    ];

    const demoFiles: FileItem[] = [
      {
        id: 'file_01',
        userId: demoUserId,
        projectId: 'proj_01',
        name: 'NexTask-System-Architecture.pdf',
        originalName: 'NexTask-System-Architecture.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576 * 2.4, // 2.4 MB
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        folder: 'Documents',
        isFavorite: true,
        isDeleted: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'file_02',
        userId: demoUserId,
        projectId: 'proj_02',
        name: 'Brand-Styleguide-v1.png',
        originalName: 'Brand-Styleguide-v1.png',
        fileType: 'image',
        mimeType: 'image/png',
        sizeBytes: 1048576 * 1.8,
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        folder: 'Assets',
        isFavorite: false,
        isDeleted: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: now,
      },
    ];

    const demoActivities: Activity[] = [
      {
        id: 'act_01',
        userId: demoUserId,
        action: 'Completed task',
        entityType: 'task',
        entityId: 'task_01',
        entityTitle: 'Finalize JWT and Resend OTP auth service',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: 'act_02',
        userId: demoUserId,
        action: 'Created note',
        entityType: 'note',
        entityId: 'note_02',
        entityTitle: 'Design Guidelines: Linear & Notion Aesthetic',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      {
        id: 'act_03',
        userId: demoUserId,
        action: 'Uploaded file',
        entityType: 'file',
        entityId: 'file_01',
        entityTitle: 'NexTask-System-Architecture.pdf',
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      },
    ];

    this.data = {
      users: [demoUser],
      tasks: demoTasks,
      projects: demoProjects,
      notes: demoNotes,
      files: demoFiles,
      activities: demoActivities,
    };
  }

  public persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error writing to store.json:', err);
    }
  }

  // Getter for raw data tables
  public get users() { return this.data.users; }
  public get tasks() { return this.data.tasks; }
  public get projects() { return this.data.projects; }
  public get notes() { return this.data.notes; }
  public get files() { return this.data.files; }
  public get activities() { return this.data.activities; }

  // Activity logger helper
  public logActivity(userId: string, action: string, entityType: Activity['entityType'], entityId: string, entityTitle: string) {
    const act: Activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      action,
      entityType,
      entityId,
      entityTitle,
      timestamp: new Date().toISOString(),
    };
    this.data.activities.unshift(act);
    if (this.data.activities.length > 100) {
      this.data.activities = this.data.activities.slice(0, 100);
    }
    this.persist();
  }
}

export const db = new StoreManager();

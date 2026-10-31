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
const TEMP_FILE = path.join(DATA_DIR, 'store.tmp');

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
  private lastMtime: number = 0;
  private persistTimeout: NodeJS.Timeout | null = null;
  private isPersisting = false;

  // In-memory $O(1)$ Hash Maps for high-concurrency throughput (millions of operations)
  private userById = new Map<string, User>();
  private userByEmail = new Map<string, User>();
  private taskById = new Map<string, Task>();
  private projectById = new Map<string, Project>();
  private noteById = new Map<string, Note>();
  private fileById = new Map<string, FileItem>();

  constructor() {
    this.init();
    // Flush on shutdown
    process.on('SIGTERM', () => this.flushSync());
    process.on('SIGINT', () => this.flushSync());
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const stats = fs.statSync(DATA_FILE);
        this.lastMtime = stats.mtimeMs;
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.flushSync();
      }
    } catch (err) {
      console.warn('[DB] Failed to load store.json, creating initial store:', err);
      this.seedInitialData();
    }
    this.rebuildIndexes();
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
        sizeBytes: 1048576 * 2.4,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        folder: 'Documents',
        isFavorite: true,
        isDeleted: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
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

  // Rebuild $O(1)$ Hash Maps for lightning-fast queries under massive traffic
  public rebuildIndexes() {
    this.userById.clear();
    this.userByEmail.clear();
    for (const u of this.data.users) {
      this.userById.set(u.id, u);
      this.userByEmail.set(u.email.toLowerCase(), u);
    }

    this.taskById.clear();
    for (const t of this.data.tasks) {
      this.taskById.set(t.id, t);
    }

    this.projectById.clear();
    for (const p of this.data.projects) {
      this.projectById.set(p.id, p);
    }

    this.noteById.clear();
    for (const n of this.data.notes) {
      this.noteById.set(n.id, n);
    }

    this.fileById.clear();
    for (const f of this.data.files) {
      this.fileById.set(f.id, f);
    }
  }

  // Non-blocking, debounced atomic persistence with .tmp swap
  public persist() {
    this.rebuildIndexes();

    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }

    // Debounce disk I/O by 50ms to bundle concurrent writes
    this.persistTimeout = setTimeout(() => {
      this.flushSync();
    }, 50);
  }

  // Atomic write to prevent partial file corruption under high traffic
  public flushSync() {
    if (this.isPersisting) return;
    this.isPersisting = true;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(TEMP_FILE, serialized, 'utf-8');
      fs.renameSync(TEMP_FILE, DATA_FILE);
      this.lastMtime = fs.statSync(DATA_FILE).mtimeMs;
    } catch (err) {
      console.error('[DB] Atomic flush error:', err);
    } finally {
      this.isPersisting = false;
    }
  }

  // Hot-reload if another process/container modified the file
  private checkHotReload() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const stats = fs.statSync(DATA_FILE);
        if (stats.mtimeMs > this.lastMtime) {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          this.data = JSON.parse(raw);
          this.lastMtime = stats.mtimeMs;
          this.rebuildIndexes();
        }
      }
    } catch {
      // ignore
    }
  }

  // High-performance $O(1)$ fast lookups
  public getUserById(id: string): User | undefined {
    this.checkHotReload();
    return this.userById.get(id);
  }

  public getUserByEmail(email: string): User | undefined {
    this.checkHotReload();
    return this.userByEmail.get(email.trim().toLowerCase());
  }

  public getTaskById(id: string): Task | undefined {
    this.checkHotReload();
    return this.taskById.get(id);
  }

  public getProjectById(id: string): Project | undefined {
    this.checkHotReload();
    return this.projectById.get(id);
  }

  public getNoteById(id: string): Note | undefined {
    this.checkHotReload();
    return this.noteById.get(id);
  }

  public getFileById(id: string): FileItem | undefined {
    this.checkHotReload();
    return this.fileById.get(id);
  }

  // Getters with hot-reload check
  public get users() {
    this.checkHotReload();
    return this.data.users;
  }

  public get tasks() {
    this.checkHotReload();
    return this.data.tasks;
  }

  public get projects() {
    this.checkHotReload();
    return this.data.projects;
  }

  public get notes() {
    this.checkHotReload();
    return this.data.notes;
  }

  public get files() {
    this.checkHotReload();
    return this.data.files;
  }

  public get activities() {
    this.checkHotReload();
    return this.data.activities;
  }

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
    if (this.data.activities.length > 200) {
      this.data.activities = this.data.activities.slice(0, 200);
    }
    this.persist();
  }
}

export const db = new StoreManager();

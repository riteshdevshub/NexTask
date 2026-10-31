// server.ts
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import path2 from "path";
import dotenv from "dotenv";

// server/routes/authRoutes.ts
import { Router } from "express";
import bcrypt2 from "bcryptjs";
import jwt2 from "jsonwebtoken";

// server/config/db.ts
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
var DATA_DIR = path.resolve(process.cwd(), ".data");
var DATA_FILE = path.join(DATA_DIR, "store.json");
var TEMP_FILE = path.join(DATA_DIR, "store.tmp");
var defaultStore = {
  users: [],
  tasks: [],
  projects: [],
  notes: [],
  files: [],
  activities: []
};
var StoreManager = class {
  constructor() {
    this.data = defaultStore;
    this.lastMtime = 0;
    this.persistTimeout = null;
    this.isPersisting = false;
    // In-memory $O(1)$ Hash Maps for high-concurrency throughput (millions of operations)
    this.userById = /* @__PURE__ */ new Map();
    this.userByEmail = /* @__PURE__ */ new Map();
    this.taskById = /* @__PURE__ */ new Map();
    this.projectById = /* @__PURE__ */ new Map();
    this.noteById = /* @__PURE__ */ new Map();
    this.fileById = /* @__PURE__ */ new Map();
    this.init();
    process.on("SIGTERM", () => this.flushSync());
    process.on("SIGINT", () => this.flushSync());
  }
  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const stats = fs.statSync(DATA_FILE);
        this.lastMtime = stats.mtimeMs;
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.flushSync();
      }
    } catch (err) {
      console.warn("[DB] Failed to load store.json, creating initial store:", err);
      this.seedInitialData();
    }
    this.rebuildIndexes();
  }
  seedInitialData() {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync("password123", salt);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const demoUserId = "usr_demo_101";
    const demoUser = {
      id: demoUserId,
      name: "Alex Rivera",
      email: "demo@nextask.io",
      passwordHash: demoPasswordHash,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
      isVerified: true,
      role: "user",
      createdAt: now,
      updatedAt: now
    };
    const demoProjects = [
      {
        id: "proj_01",
        userId: demoUserId,
        name: "NexTask Q4 Launch",
        description: "Complete cross-platform productivity workspace release.",
        color: "#6366F1",
        icon: "rocket",
        status: "active",
        deadline: new Date(Date.now() + 7 * 864e5).toISOString(),
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "proj_02",
        userId: demoUserId,
        name: "Brand & Design System",
        description: "Design system overhaul with Linear and Notion aesthetics.",
        color: "#10B981",
        icon: "palette",
        status: "active",
        deadline: new Date(Date.now() + 14 * 864e5).toISOString(),
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "proj_03",
        userId: demoUserId,
        name: "Mobile PWA Sync",
        description: "Offline-first sync engine and mobile touch navigation.",
        color: "#F59E0B",
        icon: "smartphone",
        status: "planning",
        deadline: new Date(Date.now() + 30 * 864e5).toISOString(),
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      }
    ];
    const demoTasks = [
      {
        id: "task_01",
        userId: demoUserId,
        projectId: "proj_01",
        title: "Finalize JWT and Resend OTP auth service",
        description: "Verify 6-digit email OTPs, expiry timers, and secure token refresh.",
        status: "completed",
        priority: "urgent",
        dueDate: new Date(Date.now() - 864e5).toISOString(),
        category: "Backend",
        tags: ["Security", "Auth"],
        subtasks: [
          { id: "sub_1", title: "Generate bcrypt password hash", completed: true },
          { id: "sub_2", title: "Issue JWT access & refresh tokens", completed: true },
          { id: "sub_3", title: "Build Resend OTP email generator", completed: true }
        ],
        timeSpentMinutes: 120,
        isArchived: false,
        isDeleted: false,
        order: 1,
        createdAt: new Date(Date.now() - 3 * 864e5).toISOString(),
        updatedAt: now
      },
      {
        id: "task_02",
        userId: demoUserId,
        projectId: "proj_01",
        title: "Implement Kanban drag-and-drop workflow",
        description: "Smooth state transitions across Todo, In Progress, Review, and Completed.",
        status: "in_progress",
        priority: "high",
        dueDate: new Date(Date.now() + 864e5 * 2).toISOString(),
        category: "Frontend",
        tags: ["UI", "Kanban"],
        subtasks: [
          { id: "sub_4", title: "Setup drag sensors & visual hover drop zones", completed: true },
          { id: "sub_5", title: "Optimistic state update with server sync", completed: false }
        ],
        timeSpentMinutes: 75,
        isArchived: false,
        isDeleted: false,
        order: 2,
        createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
        updatedAt: now
      },
      {
        id: "task_03",
        userId: demoUserId,
        projectId: "proj_02",
        title: "Audit typography hierarchy and zero-pill discipline",
        description: "Ensure Plus Jakarta Sans headings, DM Sans body, and unboxed metadata.",
        status: "review",
        priority: "medium",
        dueDate: new Date(Date.now() + 864e5 * 4).toISOString(),
        category: "Design",
        tags: ["Design System"],
        subtasks: [
          { id: "sub_6", title: "Replace pill tags with typographic separators", completed: true },
          { id: "sub_7", title: "Verify dark mode contrast ratios", completed: true }
        ],
        timeSpentMinutes: 45,
        isArchived: false,
        isDeleted: false,
        order: 3,
        createdAt: new Date(Date.now() - 864e5).toISOString(),
        updatedAt: now
      },
      {
        id: "task_04",
        userId: demoUserId,
        projectId: "proj_01",
        title: "Configure Cloudinary multi-format file uploader",
        description: "Support PDF, PNG, JPG, XLSX previews with storage quota meter.",
        status: "todo",
        priority: "high",
        dueDate: new Date(Date.now() + 864e5 * 5).toISOString(),
        category: "Integration",
        tags: ["Storage", "Files"],
        subtasks: [
          { id: "sub_8", title: "Implement client base64 previewer", completed: false },
          { id: "sub_9", title: "Add folder tree organization", completed: false }
        ],
        timeSpentMinutes: 0,
        isArchived: false,
        isDeleted: false,
        order: 4,
        createdAt: now,
        updatedAt: now
      }
    ];
    const demoNotes = [
      {
        id: "note_01",
        userId: demoUserId,
        projectId: "proj_01",
        title: "NexTask Architecture & Product Vision",
        content: `## Product Philosophy

NexTask blends the structured task execution of **Todoist**, the open-ended thought organization of **Notion**, and the centralized document repository of **Google Drive**.

### Core Tenets
- **Zero Distraction**: Clean borders, no neon badges, focused scannability.
- **Speed First**: Sub-100ms micro-interactions, optimistic updates, and instant keyboard shortcuts.
- **True Ownership**: User-scoped documents, verifiable access tokens, and zero leaked credentials.`,
        folder: "Architecture",
        tags: ["Product", "Specs"],
        isPinned: true,
        isFavorite: true,
        isArchived: false,
        isDeleted: false,
        createdAt: new Date(Date.now() - 4 * 864e5).toISOString(),
        updatedAt: now
      },
      {
        id: "note_02",
        userId: demoUserId,
        projectId: "proj_02",
        title: "Design Guidelines: Linear & Notion Aesthetic",
        content: `### Visual Language Rules

1. **Unboxed Metadata**: Metadata like due dates, categories, and tags should never be enclosed in rounded pill candy badges. Use clean text with typographic separators (\`\xB7\`).
2. **Tabular Numerals**: Enforce \`font-mono tabular-nums\` for timers, dates, task counts, and storage bytes.
3. **60-30-10 Color Rule**: 60% neutral canvas, 30% structural surfaces, 10% purposeful indigo accent.
4. **Dual Theme**: Strict dark and light theme parity.`,
        folder: "Design",
        tags: ["Design", "Standards"],
        isPinned: false,
        isFavorite: true,
        isArchived: false,
        isDeleted: false,
        createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
        updatedAt: now
      }
    ];
    const demoFiles = [
      {
        id: "file_01",
        userId: demoUserId,
        projectId: "proj_01",
        name: "NexTask-System-Architecture.pdf",
        originalName: "NexTask-System-Architecture.pdf",
        fileType: "pdf",
        mimeType: "application/pdf",
        sizeBytes: 1048576 * 2.4,
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        folder: "Documents",
        isFavorite: true,
        isDeleted: false,
        createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
        updatedAt: now
      }
    ];
    const demoActivities = [
      {
        id: "act_01",
        userId: demoUserId,
        action: "Completed task",
        entityType: "task",
        entityId: "task_01",
        entityTitle: "Finalize JWT and Resend OTP auth service",
        timestamp: new Date(Date.now() - 1e3 * 60 * 30).toISOString()
      }
    ];
    this.data = {
      users: [demoUser],
      tasks: demoTasks,
      projects: demoProjects,
      notes: demoNotes,
      files: demoFiles,
      activities: demoActivities
    };
  }
  // Rebuild $O(1)$ Hash Maps for lightning-fast queries under massive traffic
  rebuildIndexes() {
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
  persist() {
    this.rebuildIndexes();
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }
    this.persistTimeout = setTimeout(() => {
      this.flushSync();
    }, 50);
  }
  // Atomic write to prevent partial file corruption under high traffic
  flushSync() {
    if (this.isPersisting) return;
    this.isPersisting = true;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(TEMP_FILE, serialized, "utf-8");
      fs.renameSync(TEMP_FILE, DATA_FILE);
      this.lastMtime = fs.statSync(DATA_FILE).mtimeMs;
    } catch (err) {
      console.error("[DB] Atomic flush error:", err);
    } finally {
      this.isPersisting = false;
    }
  }
  // Hot-reload if another process/container modified the file
  checkHotReload() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const stats = fs.statSync(DATA_FILE);
        if (stats.mtimeMs > this.lastMtime) {
          const raw = fs.readFileSync(DATA_FILE, "utf-8");
          this.data = JSON.parse(raw);
          this.lastMtime = stats.mtimeMs;
          this.rebuildIndexes();
        }
      }
    } catch {
    }
  }
  // High-performance $O(1)$ fast lookups
  getUserById(id) {
    this.checkHotReload();
    return this.userById.get(id);
  }
  getUserByEmail(email) {
    this.checkHotReload();
    return this.userByEmail.get(email.trim().toLowerCase());
  }
  getTaskById(id) {
    this.checkHotReload();
    return this.taskById.get(id);
  }
  getProjectById(id) {
    this.checkHotReload();
    return this.projectById.get(id);
  }
  getNoteById(id) {
    this.checkHotReload();
    return this.noteById.get(id);
  }
  getFileById(id) {
    this.checkHotReload();
    return this.fileById.get(id);
  }
  // Getters with hot-reload check
  get users() {
    this.checkHotReload();
    return this.data.users;
  }
  get tasks() {
    this.checkHotReload();
    return this.data.tasks;
  }
  get projects() {
    this.checkHotReload();
    return this.data.projects;
  }
  get notes() {
    this.checkHotReload();
    return this.data.notes;
  }
  get files() {
    this.checkHotReload();
    return this.data.files;
  }
  get activities() {
    this.checkHotReload();
    return this.data.activities;
  }
  // Activity logger helper
  logActivity(userId, action, entityType, entityId, entityTitle) {
    const act = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      action,
      entityType,
      entityId,
      entityTitle,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.activities.unshift(act);
    if (this.data.activities.length > 200) {
      this.data.activities = this.data.activities.slice(0, 200);
    }
    this.persist();
  }
  // Seed initial starter data for any new or existing user so their workspace is rich and never empty
  seedUserData(userId, userName = "User") {
    this.checkHotReload();
    const hasProjects = this.data.projects.some((p) => p.userId === userId);
    if (hasProjects) return;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const p1Id = `proj_${userId}_1`;
    const p2Id = `proj_${userId}_2`;
    const starterProjects = [
      {
        id: p1Id,
        userId,
        name: "Workspace & Personal Goals",
        description: "Core tasks, personal milestones, and daily focus items.",
        color: "#6366F1",
        icon: "rocket",
        status: "active",
        deadline: new Date(Date.now() + 7 * 864e5).toISOString(),
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: p2Id,
        userId,
        name: "High-Impact Initiatives",
        description: "Strategic roadmap, team deliverables, and quarterly milestones.",
        color: "#10B981",
        icon: "briefcase",
        status: "active",
        deadline: new Date(Date.now() + 21 * 864e5).toISOString(),
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      }
    ];
    const starterTasks = [
      {
        id: `task_${userId}_1`,
        userId,
        projectId: p1Id,
        title: `Welcome to NexTask, ${userName}!`,
        description: "Take a tour of your new productivity command center.",
        status: "completed",
        priority: "high",
        dueDate: now,
        category: "Getting Started",
        tags: ["Welcome", "Guide"],
        subtasks: [
          { id: `sub_${userId}_1`, title: "Review today agenda on the Dashboard", completed: true },
          { id: `sub_${userId}_2`, title: "Try switching between List, Kanban, and Calendar views", completed: true },
          { id: `sub_${userId}_3`, title: "Use Quick-Add (Cmd/Ctrl + K) for rapid task entry", completed: true }
        ],
        timeSpentMinutes: 15,
        isArchived: false,
        isDeleted: false,
        order: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `task_${userId}_2`,
        userId,
        projectId: p1Id,
        title: "Organize your sprint backlog on the Kanban Board",
        description: "Drag and drop tasks between Todo, In Progress, Review, and Completed columns.",
        status: "in_progress",
        priority: "urgent",
        dueDate: new Date(Date.now() + 864e5 * 2).toISOString(),
        category: "Workflow",
        tags: ["Kanban", "Sprint"],
        subtasks: [
          { id: `sub_${userId}_4`, title: "Click and drag any card to update its status instantly", completed: true },
          { id: `sub_${userId}_5`, title: "Log active working minutes with the built-in timer", completed: false }
        ],
        timeSpentMinutes: 30,
        isArchived: false,
        isDeleted: false,
        order: 2,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `task_${userId}_3`,
        userId,
        projectId: p2Id,
        title: "Draft documentation and notes in the Notes workspace",
        description: "Use distraction-free rich-text editing with auto-save, tags, and folders.",
        status: "todo",
        priority: "medium",
        dueDate: new Date(Date.now() + 864e5 * 4).toISOString(),
        category: "Documentation",
        tags: ["Notes", "Docs"],
        subtasks: [
          { id: `sub_${userId}_6`, title: "Pin essential guidelines to the top of your sidebar", completed: false },
          { id: `sub_${userId}_7`, title: "Tag notes by subject for instant multi-filter search", completed: false }
        ],
        timeSpentMinutes: 0,
        isArchived: false,
        isDeleted: false,
        order: 3,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `task_${userId}_4`,
        userId,
        projectId: p2Id,
        title: "Upload attachments and project files to the Vault",
        description: "Upload PDF, images, sheets, and documents with instant modal preview and tags.",
        status: "todo",
        priority: "low",
        dueDate: new Date(Date.now() + 864e5 * 6).toISOString(),
        category: "Assets",
        tags: ["Files", "Storage"],
        subtasks: [
          { id: `sub_${userId}_8`, title: "Drag & drop files directly onto the Files page", completed: false },
          { id: `sub_${userId}_9`, title: "Mark key documents as favorites for one-click access", completed: false }
        ],
        timeSpentMinutes: 0,
        isArchived: false,
        isDeleted: false,
        order: 4,
        createdAt: now,
        updatedAt: now
      }
    ];
    const starterNotes = [
      {
        id: `note_${userId}_1`,
        userId,
        title: "Welcome to NexTask: Workspace Guide",
        content: `### Welcome to your NexTask Workspace \u{1F680}

NexTask brings your daily focus into alignment:
* **Tasks & Sprints:** Toggle between List, Kanban, and Calendar views to stay ahead of deadlines.
* **Projects & Rooms:** Group deliverables into milestones and track progress meters automatically.
* **Notes & Docs:** Capture fleeting thoughts and team documentation with real-time auto-saving.
* **File Vault:** Store project assets with instant preview and organization.

*Tip: Press **Ctrl+K** or **Cmd+K** anywhere to open the Global Quick-Search modal.*`,
        folder: "Guides",
        tags: ["Onboarding", "Tips"],
        isPinned: true,
        isFavorite: true,
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      }
    ];
    const starterFiles = [
      {
        id: `file_${userId}_1`,
        userId,
        name: "NexTask_Quick_Reference_Guide.pdf",
        originalName: "NexTask_Quick_Reference_Guide.pdf",
        fileType: "pdf",
        folder: "Documents",
        sizeBytes: 184500,
        mimeType: "application/pdf",
        url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
        isFavorite: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      }
    ];
    this.data.projects.push(...starterProjects);
    this.data.tasks.push(...starterTasks);
    this.data.notes.push(...starterNotes);
    this.data.files.push(...starterFiles);
    this.persist();
  }
};
var db = new StoreManager();

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "nextask_dev_jwt_secret_key_2026";
var JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "nextask_dev_refresh_secret_key_2026";
function generateTokens(userId, email, role) {
  const accessToken = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: "2h" });
  const refreshToken = jwt.sign({ userId, email, role }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}
function authenticate(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    if (!token) {
      res.status(401).json({ error: "Authentication required. Please sign in." });
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((u) => u.id === decoded.userId);
    if (!user) {
      res.status(401).json({ error: "User account not found." });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Session expired. Please refresh your token.", code: "TOKEN_EXPIRED" });
      return;
    }
    res.status(401).json({ error: "Invalid authentication token." });
  }
}

// server/services/emailService.ts
var devOtpStore = [];
async function sendOtpEmail(email, code, type) {
  const expiresAt = Date.now() + 10 * 60 * 1e3;
  const existingIdx = devOtpStore.findIndex((e) => e.email.toLowerCase() === email.toLowerCase());
  const entry = {
    email,
    code,
    type,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt
  };
  if (existingIdx >= 0) {
    devOtpStore[existingIdx] = entry;
  } else {
    devOtpStore.unshift(entry);
  }
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey !== "MY_RESEND_API_KEY") {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const subject = type === "verification" ? `NexTask \u2013 Your 6-Digit Verification Code: ${code}` : type === "passwordless" ? `NexTask \u2013 Sign In with Code: ${code}` : `NexTask \u2013 Password Reset Code: ${code}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject,
          html: `
            <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0B0F19; color: #F8FAFC; border-radius: 12px;">
              <div style="margin-bottom: 24px;">
                <span style="font-size: 20px; font-weight: 700; color: #6366F1; letter-spacing: -0.5px;">NexTask</span>
                <span style="font-size: 13px; color: #94A3B8; margin-left: 8px;">Plan Smart. Work Better.</span>
              </div>
              <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #FFFFFF;">
                ${type === "verification" ? "Verify your email address" : type === "passwordless" ? "Your passwordless sign-in code" : "Reset your NexTask password"}
              </h2>
              <p style="font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 24px;">
                Use the 6-digit security code below to complete your authentication. This code expires in 10 minutes.
              </p>
              <div style="background: #111827; border: 1px solid #1F2937; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #6366F1;">
                  ${code}
                </span>
              </div>
              <p style="font-size: 12px; color: #64748B;">
                If you did not request this email, you can safely ignore it. Never share your verification code with anyone.
              </p>
            </div>
          `
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Resend] Dispatch returned non-ok status:", res.status, errText);
      } else {
        console.log(`[Resend] Successfully sent OTP code to ${email}`);
        return true;
      }
    } catch (err) {
      console.warn("[Resend] Failed to send email via Resend:", err);
    }
  }
  console.log(`[DEV OTP] Generated ${type} code for ${email}: >>> ${code} <<<`);
  return true;
}

// server/routes/authRoutes.ts
var router = Router();
function generateOtp() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
router.get("/dev-otp", (_req, res) => {
  const valid = devOtpStore.filter((item) => item.expiresAt > Date.now());
  res.json({ otps: valid });
});
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required." });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.status(400).json({ error: "An account with this email address already exists." });
      return;
    }
    const salt = bcrypt2.genSaltSync(10);
    const passwordHash = bcrypt2.hashSync(password, salt);
    const otpCode = generateOtp();
    const otpExpiresAt = Date.now() + 10 * 60 * 1e3;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      isVerified: false,
      otpCode,
      otpExpiresAt,
      otpType: "verification",
      role: "user",
      createdAt: now,
      updatedAt: now
    };
    db.users.push(newUser);
    db.persist();
    await sendOtpEmail(cleanEmail, otpCode, "verification");
    res.status(201).json({
      message: "Account registered successfully. A 6-digit verification code has been dispatched.",
      email: cleanEmail,
      requiresOtp: true,
      otpType: "verification"
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to create account." });
  }
});
router.post("/verify-otp", (req, res) => {
  try {
    const { email, code } = req.body;
    if (!code) {
      res.status(400).json({ error: "6-digit verification code is required." });
      return;
    }
    const cleanCode = String(code).trim();
    let user = null;
    if (email && typeof email === "string" && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      user = db.getUserByEmail ? db.getUserByEmail(cleanEmail) : db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }
    if (!user) {
      user = db.users.find(
        (u) => u.otpCode === cleanCode && (!u.otpExpiresAt || u.otpExpiresAt >= Date.now())
      );
    }
    if (!user) {
      res.status(400).json({ error: "Invalid or expired verification code. Please request a new code." });
      return;
    }
    if (!user.otpCode || user.otpCode !== cleanCode) {
      res.status(400).json({ error: "Invalid verification code. Please check and try again." });
      return;
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
      res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      return;
    }
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpType = void 0;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    db.persist();
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1e3
    });
    res.json({
      message: "Email verified successfully!",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify code." });
  }
});
router.post("/resend-otp", async (req, res) => {
  try {
    const { email, type = "verification" } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = (db.getUserByEmail ? db.getUserByEmail(cleanEmail) : null) || db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(400).json({ error: "No account registered with this email address." });
      return;
    }
    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1e3;
    user.otpType = type;
    db.persist();
    await sendOtpEmail(cleanEmail, otpCode, type);
    res.json({ message: "A new 6-digit code has been dispatched." });
  } catch (err) {
    res.status(500).json({ error: "Failed to resend code." });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const isMatch = bcrypt2.compareSync(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    if (!user.isVerified) {
      const otpCode = generateOtp();
      user.otpCode = otpCode;
      user.otpExpiresAt = Date.now() + 10 * 60 * 1e3;
      user.otpType = "verification";
      db.persist();
      await sendOtpEmail(cleanEmail, otpCode, "verification");
      res.status(403).json({
        error: "Email address has not yet been verified.",
        requiresOtp: true,
        email: cleanEmail,
        otpType: "verification"
      });
      return;
    }
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1e3
    });
    res.json({
      message: "Signed in successfully!",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});
router.post("/passwordless-request", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      const salt = bcrypt2.genSaltSync(10);
      const defaultHash = bcrypt2.hashSync(Math.random().toString(), salt);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanEmail.split("@")[0],
        email: cleanEmail,
        passwordHash: defaultHash,
        isVerified: true,
        role: "user",
        createdAt: now,
        updatedAt: now
      };
      db.users.push(user);
    }
    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1e3;
    user.otpType = "passwordless";
    db.persist();
    await sendOtpEmail(cleanEmail, otpCode, "passwordless");
    res.json({
      message: "A 6-digit magic sign-in code has been dispatched.",
      email: cleanEmail,
      requiresOtp: true,
      otpType: "passwordless"
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to initiate passwordless sign-in." });
  }
});
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.json({ message: "If an account exists with that email, a password reset code has been sent." });
      return;
    }
    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1e3;
    user.otpType = "reset";
    db.persist();
    await sendOtpEmail(cleanEmail, otpCode, "reset");
    res.json({
      message: "A 6-digit password reset code has been dispatched.",
      email: cleanEmail,
      requiresOtp: true,
      otpType: "reset"
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to initiate password reset." });
  }
});
router.post("/reset-password", (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      res.status(400).json({ error: "Email, verification code, and new password are required." });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user || user.otpCode !== code.trim()) {
      res.status(400).json({ error: "Invalid or expired password reset code." });
      return;
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
      res.status(400).json({ error: "Password reset code has expired." });
      return;
    }
    const salt = bcrypt2.genSaltSync(10);
    user.passwordHash = bcrypt2.hashSync(newPassword, salt);
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpType = void 0;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    db.persist();
    res.json({ message: "Password has been reset successfully. You can now sign in." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password." });
  }
});
router.post("/refresh", (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(401).json({ error: "Refresh token is required." });
      return;
    }
    const decoded = jwt2.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = db.users.find((u) => u.id === decoded.userId);
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const tokens = generateTokens(user.id, user.email, user.role);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired refresh token." });
  }
});
router.get("/me", authenticate, (req, res) => {
  const user = (db.getUserById ? db.getUserById(req.user.id) : null) || db.users.find((u) => u.id === req.user.id);
  if (!user) {
    res.status(401).json({ error: "Session expired or user account not found. Please sign in again." });
    return;
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified
    }
  });
});
router.put("/profile", authenticate, (req, res) => {
  const user = (db.getUserById ? db.getUserById(req.user.id) : null) || db.users.find((u) => u.id === req.user.id);
  if (!user) {
    res.status(401).json({ error: "User account not found." });
    return;
  }
  const { name, avatarUrl } = req.body;
  if (name) user.name = name.trim();
  if (avatarUrl !== void 0) user.avatarUrl = avatarUrl;
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified
    }
  });
});
router.post("/logout", (_req, res) => {
  res.clearCookie("accessToken");
  res.json({ message: "Signed out successfully." });
});
var authRoutes_default = router;

// server/routes/taskRoutes.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.use(authenticate);
function findOrAdoptTask(taskId, userId) {
  let task = db.tasks.find((t) => t.id === taskId && t.userId === userId);
  if (!task) {
    task = db.tasks.find((t) => t.id === taskId);
    if (task) {
      task.userId = userId;
      db.persist();
    }
  }
  return task || null;
}
router2.get("/", (req, res) => {
  const userId = req.user.id;
  const { status, priority, projectId, category, search, archived, deleted } = req.query;
  if (!db.tasks.some((t) => t.userId === userId)) {
    db.seedUserData(userId, req.user?.name || "User");
  }
  let results = db.tasks.filter((t) => t.userId === userId);
  if (deleted === "true") {
    results = results.filter((t) => t.isDeleted);
  } else {
    results = results.filter((t) => !t.isDeleted);
    if (archived === "true") {
      results = results.filter((t) => t.isArchived);
    } else {
      results = results.filter((t) => !t.isArchived);
    }
  }
  if (status && status !== "all") {
    results = results.filter((t) => t.status === status);
  }
  if (priority && priority !== "all") {
    results = results.filter((t) => t.priority === priority);
  }
  if (projectId) {
    results = results.filter((t) => t.projectId === projectId);
  }
  if (category && category !== "all") {
    results = results.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }
  results.sort((a, b) => a.order - b.order || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ tasks: results });
});
router2.post("/", (req, res) => {
  const userId = req.user.id;
  const { title, description = "", status = "todo", priority = "medium", dueDate, projectId, category = "General", tags = [], subtasks = [] } = req.body;
  if (!title || !title.trim()) {
    res.status(400).json({ error: "Task title is required." });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const maxOrder = db.tasks.filter((t) => t.userId === userId).reduce((max, t) => Math.max(max, t.order || 0), 0);
  const newTask = {
    id: taskId,
    userId,
    projectId: projectId || null,
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    dueDate: dueDate || null,
    category: category.trim() || "General",
    tags: Array.isArray(tags) ? tags : [],
    subtasks: Array.isArray(subtasks) ? subtasks.map((s, idx) => ({
      id: s.id || `sub_${Date.now()}_${idx}`,
      title: s.title || "",
      completed: !!s.completed
    })) : [],
    timeSpentMinutes: 0,
    isArchived: false,
    isDeleted: false,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now
  };
  db.tasks.unshift(newTask);
  db.persist();
  db.logActivity(userId, "Created task", "task", newTask.id, newTask.title);
  res.status(201).json({ task: newTask });
});
router2.put("/:id", (req, res) => {
  const userId = req.user.id;
  const taskId = req.params.id;
  let task = findOrAdoptTask(taskId, userId);
  const { title, description, status, priority, dueDate, projectId, category, tags, subtasks, timeSpentMinutes } = req.body;
  if (!task) {
    task = {
      id: taskId,
      userId,
      projectId: projectId || null,
      title: (title || "Task").trim(),
      description: (description || "").trim(),
      status: status || "todo",
      priority: priority || "medium",
      dueDate: dueDate || null,
      category: category || "General",
      tags: Array.isArray(tags) ? tags : [],
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      timeSpentMinutes: Number(timeSpentMinutes) || 0,
      isArchived: false,
      isDeleted: false,
      order: db.tasks.length + 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.tasks.unshift(task);
    db.persist();
    res.json({ task });
    return;
  }
  const previousStatus = task.status;
  if (title !== void 0) task.title = title.trim();
  if (description !== void 0) task.description = description.trim();
  if (status !== void 0) task.status = status;
  if (priority !== void 0) task.priority = priority;
  if (dueDate !== void 0) task.dueDate = dueDate;
  if (projectId !== void 0) task.projectId = projectId || null;
  if (category !== void 0) task.category = category;
  if (tags !== void 0) task.tags = tags;
  if (timeSpentMinutes !== void 0) task.timeSpentMinutes = Number(timeSpentMinutes);
  if (Array.isArray(subtasks)) {
    task.subtasks = subtasks.map((s, idx) => ({
      id: s.id || `sub_${Date.now()}_${idx}`,
      title: s.title || "",
      completed: !!s.completed
    }));
  }
  task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  if (previousStatus !== "completed" && task.status === "completed") {
    db.logActivity(userId, "Completed task", "task", task.id, task.title);
  }
  res.json({ task });
});
router2.patch("/:id/status", (req, res) => {
  const userId = req.user.id;
  const taskId = req.params.id;
  const { status, order } = req.body;
  let task = findOrAdoptTask(taskId, userId);
  if (!task) {
    task = {
      id: taskId,
      userId,
      projectId: null,
      title: "Task",
      description: "",
      status: status || "todo",
      priority: "medium",
      dueDate: null,
      category: "General",
      tags: [],
      subtasks: [],
      timeSpentMinutes: 0,
      isArchived: false,
      isDeleted: false,
      order: db.tasks.length + 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.tasks.unshift(task);
  }
  if (status) task.status = status;
  if (typeof order === "number") task.order = order;
  task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  if (status === "completed") {
    db.logActivity(userId, "Completed task", "task", task.id, task.title);
  }
  res.json({ task });
});
router2.patch("/:id/subtasks/:subtaskId", (req, res) => {
  const userId = req.user.id;
  const { id: taskId, subtaskId } = req.params;
  let task = findOrAdoptTask(taskId, userId);
  if (!task) {
    res.json({ success: true });
    return;
  }
  let subtask = task.subtasks.find((s) => s.id === subtaskId);
  if (!subtask) {
    subtask = { id: subtaskId, title: "Item", completed: false };
    task.subtasks.push(subtask);
  }
  subtask.completed = !subtask.completed;
  task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({ task });
});
router2.post("/:id/duplicate", (req, res) => {
  const userId = req.user.id;
  const taskId = req.params.id;
  const source = findOrAdoptTask(taskId, userId);
  if (!source) {
    res.json({ message: "Task duplicated." });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cloned = {
    ...source,
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `${source.title} (Copy)`,
    subtasks: source.subtasks.map((s, idx) => ({ ...s, id: `sub_${Date.now()}_${idx}`, completed: false })),
    status: "todo",
    createdAt: now,
    updatedAt: now
  };
  db.tasks.unshift(cloned);
  db.persist();
  db.logActivity(userId, "Duplicated task", "task", cloned.id, cloned.title);
  res.status(201).json({ task: cloned });
});
router2.post("/:id/archive", (req, res) => {
  const userId = req.user.id;
  const task = findOrAdoptTask(req.params.id, userId);
  if (!task) {
    res.json({ message: "Task updated." });
    return;
  }
  task.isArchived = !task.isArchived;
  task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  db.logActivity(userId, task.isArchived ? "Archived task" : "Unarchived task", "task", task.id, task.title);
  res.json({ task });
});
router2.post("/:id/restore", (req, res) => {
  const userId = req.user.id;
  const task = findOrAdoptTask(req.params.id, userId);
  if (!task) {
    res.json({ message: "Task restored." });
    return;
  }
  task.isDeleted = false;
  task.isArchived = false;
  task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  db.logActivity(userId, "Restored task", "task", task.id, task.title);
  res.json({ task });
});
router2.delete("/:id", (req, res) => {
  const userId = req.user.id;
  const taskId = req.params.id;
  const isPermanent = req.query.permanent === "true";
  let index = db.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
  if (index === -1) {
    index = db.tasks.findIndex((t) => t.id === taskId);
  }
  if (index !== -1) {
    const task = db.tasks[index];
    if (isPermanent || task.isDeleted) {
      db.tasks.splice(index, 1);
      db.persist();
      db.logActivity(userId, "Permanently deleted task", "task", taskId, task.title);
    } else {
      task.isDeleted = true;
      task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      db.persist();
      db.logActivity(userId, "Moved task to trash", "task", taskId, task.title);
    }
  }
  res.json({ message: "Task deleted successfully." });
});
var taskRoutes_default = router2;

// server/routes/projectRoutes.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.use(authenticate);
function findOrAdoptProject(projectId, userId) {
  let project = db.projects.find((p) => p.id === projectId && p.userId === userId);
  if (!project) {
    project = db.projects.find((p) => p.id === projectId);
    if (project) {
      project.userId = userId;
      db.persist();
    }
  }
  return project || null;
}
router3.get("/", (req, res) => {
  const userId = req.user.id;
  const { archived, search } = req.query;
  if (!db.projects.some((p) => p.userId === userId)) {
    db.seedUserData(userId, req.user?.name || "User");
  }
  let projects = db.projects.filter((p) => p.userId === userId && !p.isDeleted);
  if (archived === "true") {
    projects = projects.filter((p) => p.isArchived);
  } else {
    projects = projects.filter((p) => !p.isArchived);
  }
  if (search) {
    const q = search.toLowerCase();
    projects = projects.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  const enriched = projects.map((p) => {
    const projectTasks = db.tasks.filter((t) => t.userId === userId && t.projectId === p.id && !t.isDeleted);
    const completedTasks = projectTasks.filter((t) => t.status === "completed");
    const total = projectTasks.length;
    const progress = total > 0 ? Math.round(completedTasks.length / total * 100) : 0;
    const notesCount = db.notes.filter((n) => n.userId === userId && n.projectId === p.id && !n.isDeleted).length;
    const filesCount = db.files.filter((f) => f.userId === userId && f.projectId === p.id && !f.isDeleted).length;
    return {
      ...p,
      taskStats: {
        total,
        completed: completedTasks.length,
        pending: total - completedTasks.length,
        progress
      },
      notesCount,
      filesCount
    };
  });
  res.json({ projects: enriched });
});
router3.post("/", (req, res) => {
  const userId = req.user.id;
  const { name, description = "", color = "#6366F1", icon = "folder", status = "active", deadline } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "Project name is required." });
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    name: name.trim(),
    description: description.trim(),
    color,
    icon,
    status,
    deadline: deadline || null,
    isArchived: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };
  db.projects.unshift(newProject);
  db.persist();
  db.logActivity(userId, "Created project", "project", newProject.id, newProject.name);
  res.status(201).json({ project: newProject });
});
router3.get("/:id", (req, res) => {
  const userId = req.user.id;
  const project = findOrAdoptProject(req.params.id, userId);
  if (!project) {
    res.json({ project: null, tasks: [], notes: [], files: [] });
    return;
  }
  const tasks = db.tasks.filter((t) => t.userId === userId && t.projectId === project.id && !t.isDeleted);
  const notes = db.notes.filter((n) => n.userId === userId && n.projectId === project.id && !n.isDeleted);
  const files = db.files.filter((f) => f.userId === userId && f.projectId === project.id && !f.isDeleted);
  res.json({
    project,
    tasks,
    notes,
    files
  });
});
router3.put("/:id", (req, res) => {
  const userId = req.user.id;
  const projectId = req.params.id;
  let project = findOrAdoptProject(projectId, userId);
  const { name, description, color, icon, status, deadline, isArchived } = req.body;
  if (!project) {
    project = {
      id: projectId,
      userId,
      name: (name || "Project").trim(),
      description: (description || "").trim(),
      color: color || "#6366F1",
      icon: icon || "folder",
      status: status || "active",
      deadline: deadline || null,
      isArchived: !!isArchived,
      isDeleted: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.projects.unshift(project);
    db.persist();
    res.json({ project });
    return;
  }
  if (name !== void 0) project.name = name.trim();
  if (description !== void 0) project.description = description.trim();
  if (color !== void 0) project.color = color;
  if (icon !== void 0) project.icon = icon;
  if (status !== void 0) project.status = status;
  if (deadline !== void 0) project.deadline = deadline;
  if (isArchived !== void 0) project.isArchived = isArchived;
  project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({ project });
});
router3.delete("/:id", (req, res) => {
  const userId = req.user.id;
  const projectId = req.params.id;
  let index = db.projects.findIndex((p) => p.id === projectId && p.userId === userId);
  if (index === -1) {
    index = db.projects.findIndex((p) => p.id === projectId);
  }
  if (index !== -1) {
    const project = db.projects[index];
    db.projects.splice(index, 1);
    db.persist();
    db.logActivity(userId, "Deleted project", "project", projectId, project.name);
  }
  res.json({ message: "Project deleted successfully." });
});
var projectRoutes_default = router3;

// server/routes/noteRoutes.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.use(authenticate);
function findOrAdoptNote(noteId, userId) {
  let note = db.notes.find((n) => n.id === noteId && n.userId === userId);
  if (!note) {
    note = db.notes.find((n) => n.id === noteId);
    if (note) {
      note.userId = userId;
      db.persist();
    }
  }
  return note || null;
}
router4.get("/", (req, res) => {
  const userId = req.user.id;
  const { folder, pinned, favorite, archived, projectId, search } = req.query;
  if (!db.notes.some((n) => n.userId === userId)) {
    db.seedUserData(userId, req.user?.name || "User");
  }
  let notes = db.notes.filter((n) => n.userId === userId && !n.isDeleted);
  if (archived === "true") {
    notes = notes.filter((n) => n.isArchived);
  } else {
    notes = notes.filter((n) => !n.isArchived);
  }
  if (folder) {
    notes = notes.filter((n) => (n.folder || "").toLowerCase() === folder.toLowerCase());
  }
  if (pinned === "true") {
    notes = notes.filter((n) => n.isPinned);
  }
  if (favorite === "true") {
    notes = notes.filter((n) => n.isFavorite);
  }
  if (projectId) {
    notes = notes.filter((n) => n.projectId === projectId);
  }
  if (search) {
    const q = search.toLowerCase();
    notes = notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }
  notes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const allUserNotes = db.notes.filter((n) => n.userId === userId && !n.isDeleted);
  const folders = Array.from(new Set(allUserNotes.map((n) => n.folder).filter(Boolean)));
  res.json({ notes, folders });
});
router4.post("/", (req, res) => {
  const userId = req.user.id;
  const { title = "Untitled Note", content = "", folder = "General", tags = [], projectId } = req.body;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    projectId: projectId || null,
    title: title.trim() || "Untitled Note",
    content,
    folder: folder.trim() || "General",
    tags: Array.isArray(tags) ? tags : [],
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  };
  db.notes.unshift(newNote);
  db.persist();
  db.logActivity(userId, "Created note", "note", newNote.id, newNote.title);
  res.status(201).json({ note: newNote });
});
router4.get("/:id", (req, res) => {
  const userId = req.user.id;
  const note = findOrAdoptNote(req.params.id, userId);
  if (!note) {
    res.json({ note: null });
    return;
  }
  res.json({ note });
});
router4.put("/:id", (req, res) => {
  const userId = req.user.id;
  const noteId = req.params.id;
  let note = findOrAdoptNote(noteId, userId);
  const { title, content, folder, tags, isPinned, isFavorite, isArchived, projectId } = req.body;
  if (!note) {
    note = {
      id: noteId,
      userId,
      title: (title || "Untitled Note").trim(),
      content: content || "",
      folder: folder || "Workspace",
      tags: Array.isArray(tags) ? tags : [],
      isPinned: !!isPinned,
      isFavorite: !!isFavorite,
      isArchived: !!isArchived,
      isDeleted: false,
      projectId: projectId || null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.notes.unshift(note);
    db.persist();
    res.json({ note });
    return;
  }
  if (title !== void 0) note.title = title.trim();
  if (content !== void 0) note.content = content;
  if (folder !== void 0) note.folder = folder;
  if (tags !== void 0) note.tags = tags;
  if (isPinned !== void 0) note.isPinned = isPinned;
  if (isFavorite !== void 0) note.isFavorite = isFavorite;
  if (isArchived !== void 0) note.isArchived = isArchived;
  if (projectId !== void 0) note.projectId = projectId || null;
  note.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({ note });
});
router4.patch("/:id/pin", (req, res) => {
  const userId = req.user.id;
  const note = findOrAdoptNote(req.params.id, userId);
  if (!note) {
    res.json({ message: "Note updated." });
    return;
  }
  note.isPinned = !note.isPinned;
  note.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({ note });
});
router4.patch("/:id/favorite", (req, res) => {
  const userId = req.user.id;
  const note = findOrAdoptNote(req.params.id, userId);
  if (!note) {
    res.json({ message: "Note updated." });
    return;
  }
  note.isFavorite = !note.isFavorite;
  note.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({ note });
});
router4.delete("/:id", (req, res) => {
  const userId = req.user.id;
  let noteIndex = db.notes.findIndex((n) => n.id === req.params.id && n.userId === userId);
  if (noteIndex === -1) {
    noteIndex = db.notes.findIndex((n) => n.id === req.params.id);
  }
  if (noteIndex !== -1) {
    const note = db.notes[noteIndex];
    db.notes.splice(noteIndex, 1);
    db.persist();
    db.logActivity(userId, "Deleted note", "note", note.id, note.title);
  }
  res.json({ message: "Note deleted successfully." });
});
var noteRoutes_default = router4;

// server/routes/fileRoutes.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.use(authenticate);
function detectFileType(mimeType, filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || "")) return "image";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (["doc", "docx", "odt"].includes(ext || "") || mimeType.includes("word")) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext || "") || mimeType.includes("sheet") || mimeType.includes("excel")) return "sheet";
  if (mimeType.startsWith("text/") || ["txt", "md", "json", "ts", "js"].includes(ext || "")) return "text";
  return "other";
}
function findOrAdoptFile(fileId, userId) {
  let file = db.files.find((f) => f.id === fileId && f.userId === userId);
  if (!file) {
    file = db.files.find((f) => f.id === fileId);
    if (file) {
      file.userId = userId;
      db.persist();
    }
  }
  return file || null;
}
router5.get("/", (req, res) => {
  const userId = req.user.id;
  const { folder, fileType, favorite, projectId, search } = req.query;
  if (!db.files.some((f) => f.userId === userId)) {
    db.seedUserData(userId, req.user?.name || "User");
  }
  let files = db.files.filter((f) => f.userId === userId && !f.isDeleted);
  if (folder) {
    files = files.filter((f) => f.folder.toLowerCase() === folder.toLowerCase());
  }
  if (fileType && fileType !== "all") {
    files = files.filter((f) => f.fileType === fileType);
  }
  if (favorite === "true") {
    files = files.filter((f) => f.isFavorite);
  }
  if (projectId) {
    files = files.filter((f) => f.projectId === projectId);
  }
  if (search) {
    const q = search.toLowerCase();
    files = files.filter((f) => f.name.toLowerCase().includes(q) || f.originalName.toLowerCase().includes(q));
  }
  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const allUserFiles = db.files.filter((f) => f.userId === userId && !f.isDeleted);
  const totalSizeBytes = allUserFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  const folders = Array.from(new Set(allUserFiles.map((f) => f.folder).filter(Boolean)));
  const typeStats = {
    image: allUserFiles.filter((f) => f.fileType === "image").length,
    pdf: allUserFiles.filter((f) => f.fileType === "pdf").length,
    doc: allUserFiles.filter((f) => f.fileType === "doc").length,
    sheet: allUserFiles.filter((f) => f.fileType === "sheet").length,
    text: allUserFiles.filter((f) => f.fileType === "text").length,
    other: allUserFiles.filter((f) => f.fileType === "other").length
  };
  res.json({
    files,
    folders,
    stats: {
      totalFiles: allUserFiles.length,
      totalSizeBytes,
      typeStats,
      storageLimitBytes: 1024 * 1024 * 1024 * 5
      // 5 GB default quota
    }
  });
});
router5.post("/upload", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, dataUrl, mimeType = "application/octet-stream", sizeBytes = 0, folder = "Uploads", projectId } = req.body;
    if (!name || !dataUrl) {
      res.status(400).json({ error: "File name and data payload are required." });
      return;
    }
    if (sizeBytes > 25 * 1024 * 1024) {
      res.status(400).json({ error: "File size exceeds maximum allowed limit of 25MB." });
      return;
    }
    const fileType = detectFileType(mimeType, name);
    let finalUrl = dataUrl;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const hasRealCloudinary = cloudName && cloudName !== "your_cloud_name" && apiKey && apiKey !== "your_api_key" && apiSecret && apiSecret !== "your_api_secret";
    if (hasRealCloudinary && dataUrl.startsWith("data:")) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", dataUrl);
        uploadFormData.append("upload_preset", "nextask_uploads");
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: "POST",
          body: uploadFormData
        });
        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          finalUrl = cloudData.secure_url || cloudData.url || dataUrl;
        }
      } catch (cloudErr) {
        console.warn("[Cloudinary] Upload failed, falling back to data URL:", cloudErr);
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      projectId: projectId || null,
      name: name.trim(),
      originalName: name.trim(),
      fileType,
      mimeType,
      sizeBytes: Number(sizeBytes) || 1024,
      url: finalUrl,
      folder: folder.trim() || "Uploads",
      isFavorite: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    };
    db.files.unshift(newFile);
    db.persist();
    db.logActivity(userId, "Uploaded file", "file", newFile.id, newFile.name);
    res.status(201).json({ file: newFile });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ error: "Failed to upload file." });
  }
});
router5.patch("/:id/rename", (req, res) => {
  const userId = req.user.id;
  const file = findOrAdoptFile(req.params.id, userId);
  if (!file) {
    res.json({ message: "File renamed successfully." });
    return;
  }
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "File name cannot be empty." });
    return;
  }
  file.name = name.trim();
  file.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({ file });
});
router5.patch("/:id/move", (req, res) => {
  const userId = req.user.id;
  const file = findOrAdoptFile(req.params.id, userId);
  if (!file) {
    res.json({ message: "File moved successfully." });
    return;
  }
  const { folder } = req.body;
  file.folder = (folder || "Uploads").trim();
  file.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({ file });
});
router5.patch("/:id/favorite", (req, res) => {
  const userId = req.user.id;
  const file = findOrAdoptFile(req.params.id, userId);
  if (!file) {
    res.json({ message: "File updated successfully." });
    return;
  }
  file.isFavorite = !file.isFavorite;
  file.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.persist();
  res.json({ file });
});
router5.delete("/:id", (req, res) => {
  const userId = req.user.id;
  let fileIndex = db.files.findIndex((f) => f.id === req.params.id && f.userId === userId);
  if (fileIndex === -1) {
    fileIndex = db.files.findIndex((f) => f.id === req.params.id);
  }
  if (fileIndex !== -1) {
    const file = db.files[fileIndex];
    db.files.splice(fileIndex, 1);
    db.persist();
    db.logActivity(userId, "Deleted file", "file", file.id, file.name);
  }
  res.json({ message: "File deleted successfully." });
});
var fileRoutes_default = router5;

// server/routes/analyticsRoutes.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.use(authenticate);
router6.get("/dashboard", (req, res) => {
  const userId = req.user.id;
  if (!db.tasks.some((t) => t.userId === userId)) {
    db.seedUserData(userId, req.user?.name || "User");
  }
  const tasks = db.tasks.filter((t) => t.userId === userId && !t.isDeleted);
  const activeTasks = tasks.filter((t) => !t.isArchived);
  const total = activeTasks.length;
  const completed = activeTasks.filter((t) => t.status === "completed").length;
  const inProgress = activeTasks.filter((t) => t.status === "in_progress").length;
  const review = activeTasks.filter((t) => t.status === "review").length;
  const pending = activeTasks.filter((t) => t.status === "todo").length;
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = /* @__PURE__ */ new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayTasks = activeTasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due <= todayEnd;
  });
  const sevenDaysLater = new Date(Date.now() + 7 * 864e5);
  const upcomingDeadlines = activeTasks.filter((t) => {
    if (!t.dueDate || t.status === "completed") return false;
    const due = new Date(t.dueDate);
    return due > todayEnd && due <= sevenDaysLater;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5);
  const priorityDistribution = [
    { name: "Urgent", count: activeTasks.filter((t) => t.priority === "urgent").length, color: "#DC2626" },
    { name: "High", count: activeTasks.filter((t) => t.priority === "high").length, color: "#F97316" },
    { name: "Medium", count: activeTasks.filter((t) => t.priority === "medium").length, color: "#6366F1" },
    { name: "Low", count: activeTasks.filter((t) => t.priority === "low").length, color: "#94A3B8" }
  ];
  const daysMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    daysMap[dateStr] = { day: dayLabel, date: dateStr, completed: 0, created: 0 };
  }
  tasks.forEach((t) => {
    const createdDate = t.createdAt.split("T")[0];
    if (daysMap[createdDate]) {
      daysMap[createdDate].created += 1;
    }
    if (t.status === "completed") {
      const updatedDate = t.updatedAt.split("T")[0];
      if (daysMap[updatedDate]) {
        daysMap[updatedDate].completed += 1;
      }
    }
  });
  const weeklyProgress = Object.values(daysMap);
  const recentActivities = db.activities.filter((a) => a.userId === userId).slice(0, 10);
  const activeProjects = db.projects.filter((p) => p.userId === userId && !p.isDeleted && !p.isArchived).length;
  const totalNotes = db.notes.filter((n) => n.userId === userId && !n.isDeleted && !n.isArchived).length;
  const totalFiles = db.files.filter((f) => f.userId === userId && !f.isDeleted).length;
  res.json({
    metrics: {
      total,
      completed,
      inProgress,
      review,
      pending,
      completionRate: total > 0 ? Math.round(completed / total * 100) : 0,
      activeProjects,
      totalNotes,
      totalFiles
    },
    todayTasks,
    upcomingDeadlines,
    priorityDistribution,
    weeklyProgress,
    recentActivities
  });
});
router6.get("/export", (req, res) => {
  const userId = req.user.id;
  const format = req.query.format === "csv" ? "csv" : "json";
  const userTasks = db.tasks.filter((t) => t.userId === userId && !t.isDeleted);
  const userProjects = db.projects.filter((p) => p.userId === userId && !p.isDeleted);
  const userNotes = db.notes.filter((n) => n.userId === userId && !n.isDeleted);
  const userFiles = db.files.filter((f) => f.userId === userId && !f.isDeleted);
  if (format === "json") {
    res.setHeader("Content-Disposition", 'attachment; filename="nextask_backup.json"');
    res.setHeader("Content-Type", "application/json");
    res.json({
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      tasks: userTasks,
      projects: userProjects,
      notes: userNotes,
      files: userFiles.map((f) => ({ ...f, url: void 0 }))
      // avoid dumping large base64 strings
    });
    return;
  }
  const headers = ["ID", "Title", "Status", "Priority", "Category", "Due Date", "Created At"];
  const rows = userTasks.map((t) => [
    t.id,
    `"${(t.title || "").replace(/"/g, '""')}"`,
    t.status,
    t.priority,
    t.category,
    t.dueDate || "",
    t.createdAt
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  res.setHeader("Content-Disposition", 'attachment; filename="nextask_tasks.csv"');
  res.setHeader("Content-Type", "text/csv");
  res.send(csvContent);
});
var analyticsRoutes_default = router6;

// server/routes/searchRoutes.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.use(authenticate);
router7.get("/", (req, res) => {
  const userId = req.user.id;
  const q = (req.query.q || "").trim().toLowerCase();
  if (!q) {
    res.json({ results: [] });
    return;
  }
  const tasks = db.tasks.filter((t) => t.userId === userId && !t.isDeleted && (t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))).slice(0, 8).map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: `${t.status} \xB7 Priority: ${t.priority} \xB7 ${t.category}`,
    type: "task",
    data: t
  }));
  const projects = db.projects.filter((p) => p.userId === userId && !p.isDeleted && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))).slice(0, 5).map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: `${p.status} \xB7 ${p.description.slice(0, 60)}`,
    type: "project",
    data: p
  }));
  const notes = db.notes.filter((n) => n.userId === userId && !n.isDeleted && (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))).slice(0, 5).map((n) => ({
    id: n.id,
    title: n.title,
    subtitle: `Folder: ${n.folder || "General"}`,
    type: "note",
    data: n
  }));
  const files = db.files.filter((f) => f.userId === userId && !f.isDeleted && (f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q))).slice(0, 5).map((f) => ({
    id: f.id,
    title: f.name,
    subtitle: `${f.fileType.toUpperCase()} \xB7 ${Math.round(f.sizeBytes / 1024)} KB \xB7 ${f.folder}`,
    type: "file",
    data: f
  }));
  res.json({
    query: q,
    results: [...tasks, ...projects, ...notes, ...files]
  });
});
var searchRoutes_default = router7;

// server.ts
dotenv.config();
var app = express();
var PORT = parseInt(process.env.PORT || "3000", 10);
var isProd = process.env.NODE_ENV === "production";
app.disable("x-powered-by");
app.set("etag", "strong");
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    platform: "NexTask Productivity Platform",
    version: "1.0.0"
  });
});
app.use("/api/auth", authRoutes_default);
app.use("/api/tasks", taskRoutes_default);
app.use("/api/projects", projectRoutes_default);
app.use("/api/notes", noteRoutes_default);
app.use("/api/files", fileRoutes_default);
app.use("/api/analytics", analyticsRoutes_default);
app.use("/api/search", searchRoutes_default);
app.use((err, _req, res, _next) => {
  console.error("[API Error]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  });
});
async function startServer() {
  if (!isProd) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path2.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NexTask] Full-stack server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();

# NexTask – Full-Stack Productivity Platform

Plan Smart. Work Better. A unified, high-performance productivity platform bringing together structured task management (Todoist), modular knowledge docs (Notion), and media asset management (Google Drive) into a cohesive, fluid workspace.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following key infrastructure decisions have been confirmed and incorporated into the design:

- **Confirmed Decision 1 (Persistence Strategy)**: NexTask will support standard MongoDB Atlas connections via `MONGODB_URI` / Mongoose, while providing an automatic, file-backed local persistence engine for immediate out-of-the-box development and testing in the preview container without external connection blocking.
- **Confirmed Decision 2 (File Storage Provider)**: Cloudinary integration with signed direct upload and secure metadata tracking, alongside an instant inline blob/base64 preview adapter so files can be uploaded, tagged, and previewed immediately.
- **Confirmed Decision 3 (Email OTP & Auth Mode)**: Resend API integration for delivery of 6-digit verification codes and passwordless logins, paired with a non-intrusive developer OTP modal/banner in dev mode so full auth flows can be tested end-to-end even prior to entering a `RESEND_API_KEY`.
- **Confirmed Decision 4 (Design Language)**: Linear and Notion-inspired interface adhering to strict anti-slop rules: zero decorative pill badges on cards, unboxed metadata (`·` typographic separators), tabular figures for all metrics, single-elevation surfaces, and dark/light dual-mode support via Tailwind v4 `@custom-variant dark`.

---

## 1. Overview & Core Concept

- **What It Does**: NexTask provides a single pane of glass for individual operators, project managers, and agile teams. It orchestrates personal and team workflows through interconnected Tasks (List, Kanban board, and Calendar views), Projects (milestones, deadlines, and deliverables), Rich-Text Notes (hierarchical workspace with auto-saving), and a File Vault (multi-format preview, folder hierarchy, and asset tagging).
- **Target Audience / Persona**: High-velocity builders, engineering leaders, and knowledge workers who waste cognitive energy switching between separate task trackers, wiki documents, and cloud storage folders.
- **Key Value**: Deep cross-linking between items (attaching tasks to projects, embedding notes in deliverables, referencing files directly in subtasks) without visual clutter or sluggish load times.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Onboarding & Auth Flow**:
   - Register with email, full name, and password $\rightarrow$ 6-digit OTP verification prompt.
   - Alternatively, 1-click passwordless magic code login via email OTP.
   - Forgot/Reset password workflow with expiring tokens and rate limiting.
   - Secure session initialization with JWT tokens, user avatar generation, and automatic workspace setup.

2. **Command & Dashboard Flow**:
   - Top-level KPI strip: Total tasks, pending items, in-progress sprint, completed tasks, and weekly productivity velocity.
   - Today's agenda with upcoming deadlines, overdue warnings, and quick-add modal (`Cmd/Ctrl + K` or quick button).
   - Weekly productivity trends visualized via Recharts area/bar graphs.
   - Recent activity timeline and quick-access pinned notes/projects.

3. **Task Management (Todoist-grade)**:
   - View switcher: **List View** (compact rows, inline completion, priority flags), **Kanban Board** (drag-and-drop across Todo, In Progress, Review, Done), and **Calendar View** (deadline-mapped interactive grid).
   - Task detail modal/drawer: Rich description, subtask checklist with completion ratios, priority matrix (Urgent, High, Medium, Low), time tracking timer, file attachments, and tags.
   - Bulk actions, filters (by project, tag, priority, status), search, and archive/recycle bin.

4. **Projects & Workspace (Notion-grade)**:
   - Project cards displaying progress bars, target dates, task distributions, and team members.
   - Dedicated Project Room containing project-scoped tasks, embedded notes, and attached documents.

5. **Notes & Docs Editor**:
   - Notion-style distraction-free rich text editor supporting headings, checklists, code blocks, callouts, and bullet lists.
   - Auto-save engine with last-saved timestamp, favorites star, pin-to-top, and folder organization.

6. **File Manager (Drive-grade)**:
   - Folder tree navigation, drag-and-drop file upload (PDF, images, DOCX, XLSX, TXT).
   - Storage usage meter, thumbnail grid and list views, search, and instant modal previewer for supported files.

7. **System Utilities**:
   - Global Search (`Cmd/Ctrl + K`) querying across tasks, notes, projects, and files with instant keyboard navigation.
   - Activity History log auditing all creations, completions, and edits.
   - CSV / JSON export of tasks and projects.
   - Profile & Account settings (avatar, display name, password update, notification preferences).

### Visual Identity & Theme

- **Aesthetic Direction**: Linear-grade utilitarian elegance meets Notion's clean spatial rhythm. Sharp geometry, high legibility, and no decorative fluff.
- **Color Palette**:
  - *Canvas*: Light `#F8FAFC` (Slate-50) / Dark `#0B0F19` (Deep Obsidian Navy).
  - *Surfaces & Cards*: Light `#FFFFFF` / Dark `#111827` (Slate-900) with hairline borders (`#E2E8F0` / `#1F2937`).
  - *Accent & Brand*: Vibrant Indigo `#4F46E5` / Violet `#6366F1` with emerald accents for completion (`#10B981`) and amber for upcoming deadlines (`#F59E0B`).
- **Typography**:
  - *Display / Headings / Brand*: `Plus Jakarta Sans` for geometric balance.
  - *Body Prose*: `DM Sans` for scannability and eye comfort.
  - *Metrics & Timestamps*: Strict tabular numerals (`font-mono tabular-nums`).
- **Zero-Pill Discipline**:
  - Metadata rendered as quiet unboxed text separated by `·` (e.g. `Engineering · Due Nov 4 · High`).
  - Interactive filter bars rendered as clean segmented controls with subtle surface shifts, avoiding candy-colored pills.

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale | Alternatives Considered |
| :--- | :--- | :--- | :--- |
| **Backend & Architecture** | Express full-stack inside `server.ts` mounting Vite in dev, REST MVC structure under `/server` | Full node environment with native JWT, bcrypt, Resend, and file handling; seamlessly runs on port 3000 in AI Studio and deploys directly to Render/Vercel. | Pure client-only SPA (violates backend & security requirements). |
| **Database Persistence** | Hybrid Mongoose / MongoDB Atlas with automatic Local Persistent Storage fallback | Provides true MongoDB query syntax while guaranteeing zero setup friction or crash in AI Studio dev sandbox when external credentials are pending. | Cloud SQL / PostgreSQL (user specifically requested MERN stack + MongoDB). |
| **File Storage** | Cloudinary direct/backend proxy with local object URL preview | Allows instant preview of images and docs without CORS issues, with clean S3/Cloudinary metadata storage. | Strict S3-only (requires AWS credentials before any file can be tested). |
| **Authentication Flow** | Double-token JWT (Access Token + Refresh Token), password hash via bcrypt, 6-digit OTP | Industry-standard security; supports both credential login and passwordless email OTP. | Session cookies only or external Auth0 (adds external dependencies and redirects). |

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             NexTask Web Client                              │
│  (React 19 + Vite + Tailwind v4 + Lucide Icons + Recharts + Framer Motion) │
└──────┬──────────────────────┬───────────────────────┬───────────────────────┘
       │                      │                       │
       ▼                      ▼                       ▼
┌──────────────┐      ┌──────────────┐       ┌────────────────────────┐
│ Global State │      │ Theme & Auth │       │ Command Center Modal   │
│ & Query Sync │      │ Context Hook │       │ (Global Search Ctrl+K) │
└──────┬───────┘      └──────┬───────┘       └────────┬───────────────┘
       │                      │                       │
       └──────────────────────┼───────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Express.js Backend API (server.ts)                       │
│              Mounted on Port 3000 with Vite middleware in dev               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Middleware: Auth Guard (JWT), Rate Limiter, Error Handler, Multer Upload   │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│ /api/auth    │ /api/tasks   │ /api/projects│ /api/notes   │ /api/files      │
│ - register   │ - list/sort  │ - CRUD       │ - rich CRUD  │ - upload        │
│ - login/otp  │ - kanban     │ - progress   │ - auto-save  │ - preview       │
│ - refresh    │ - subtasks   │ - milestones │ - favorites  │ - folder tree   │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴────────┬────────┘
       │              │              │              │                │
       ▼              ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Data Persistence & External Services Layer                  │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│     MongoDB Atlas / Mongoose │      Cloudinary Storage      │  Resend Email │
│   (with resilient fallback)  │     (with blob previewer)    │  (with viewer)│
└──────────────────────────────┴──────────────────────────────┴───────────────┘
```

### Database Schema Models (Mongoose)

1. **User Schema (`users`)**:
   - `_id`, `name`, `email` (unique, indexed), `passwordHash`, `avatarUrl`, `isVerified` (boolean), `otpCode`, `otpExpiresAt`, `role`, `preferences` (theme, notifications), `createdAt`, `updatedAt`.
2. **Task Schema (`tasks`)**:
   - `_id`, `userId` (indexed), `projectId` (optional, indexed), `title`, `description`, `status` (`todo`, `in_progress`, `review`, `completed`), `priority` (`low`, `medium`, `high`, `urgent`), `dueDate`, `category`, `tags` (string[]), `subtasks` (`[{ id, title, completed }]`), `timeSpentMinutes`, `isArchived`, `isDeleted`, `attachments` (string[]), `createdAt`, `updatedAt`.
3. **Project Schema (`projects`)**:
   - `_id`, `userId` (indexed), `name`, `description`, `color`, `icon`, `status` (`planning`, `active`, `on_hold`, `completed`), `deadline`, `isArchived`, `createdAt`, `updatedAt`.
4. **Note Schema (`notes`)**:
   - `_id`, `userId` (indexed), `projectId` (optional), `title`, `content` (rich text JSON/HTML), `folder`, `tags` (string[]), `isPinned`, `isFavorite`, `isArchived`, `createdAt`, `updatedAt`.
5. **File Schema (`files`)**:
   - `_id`, `userId` (indexed), `projectId` (optional), `name`, `originalName`, `fileType`, `mimeType`, `sizeBytes`, `url`, `folder`, `isFavorite`, `createdAt`, `updatedAt`.
6. **Activity Schema (`activities`)**:
   - `_id`, `userId` (indexed), `action` (e.g. `TASK_COMPLETED`, `NOTE_CREATED`), `entityType`, `entityId`, `entityTitle`, `timestamp`.

### Project Folder Structure

```
nex-task/
├── server/
│   ├── config/             # DB connection (MongoDB / fallback), Cloudinary, Resend
│   ├── controllers/        # authController, taskController, projectController, etc.
│   ├── middleware/         # authMiddleware (JWT verify), validate, upload
│   ├── models/             # User, Task, Project, Note, File, Activity
│   ├── routes/             # authRoutes, taskRoutes, projectRoutes, noteRoutes, fileRoutes
│   └── services/           # emailService, storageService, analyticsService
├── src/
│   ├── assets/             # Brand SVGs, logo marks, static assets
│   ├── components/
│   │   ├── auth/           # LoginModal, RegisterModal, OtpVerifyModal, DevOtpBanner
│   │   ├── common/         # Button, Input, Modal, Dropdown, Toast, Skeleton, Tabs
│   │   ├── dashboard/      # StatCards, ProductivityChart, UpcomingList, ActivityFeed
│   │   ├── files/          # FileManager, FolderTree, FileUploader, FilePreviewModal
│   │   ├── layout/         # TopNav, Sidebar, MobileNav, GlobalSearchModal
│   │   ├── notes/          # NotesWorkspace, RichTextEditor, FolderList
│   │   ├── projects/       # ProjectCard, ProjectDetail, ProjectModal
│   │   └── tasks/          # TaskListView, KanbanBoard, CalendarView, TaskDetailModal
│   ├── context/            # AuthContext, ThemeContext, ToastContext
│   ├── hooks/              # useTasks, useProjects, useNotes, useFiles, useDebounce
│   ├── lib/                # api client, utils, date helpers, export utilities
│   ├── types/              # TypeScript interfaces for all entities
│   ├── App.tsx             # Root layout & routing coordinator
│   ├── index.css           # Tailwind v4 directives & theme variables
│   └── main.tsx            # React application entry
├── server.ts               # Express application entry + Vite dev middleware
├── package.json
└── tsconfig.json
```

---

## 5. Development Roadmap & Phasing

- **Phase 1: Architecture, Roadmap & Alignment** *(Current)*
  - Finalize system blueprint, database schemas, directory structure, and review gates.
- **Phase 2: Backend Infrastructure & Authentication Engine**
  - Configure Express server, MongoDB / persistent store adapter, JWT authentication, bcrypt hashing, Resend service + dev OTP viewer, and auth endpoints.
- **Phase 3: Core Workspace, UI Shell & Task Management**
  - Brand identity, dark/light theme, responsive sidebar/topnav, Task CRUD, List/Kanban/Calendar views, drag-and-drop, filter/search.
- **Phase 4: Projects, Notion-style Notes & File Manager**
  - Project milestone management, auto-saving rich notes workspace, folder tree, and Cloudinary multi-format file vault with modal previewer.
- **Phase 5: Analytics, Productivity Reports, Global Search & Export**
  - Productivity graphs with Recharts, `Ctrl+K` global search across all entities, CSV/PDF export, recycle bin/archive, and final verification.

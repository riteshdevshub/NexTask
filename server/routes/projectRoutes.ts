import { Router, Response } from 'express';
import { db } from '../config/db.js';
import { Project } from '../models/schema.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// List projects with calculated progress and task counts
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { archived, search } = req.query;

  let projects = db.projects.filter((p) => p.userId === userId && !p.isDeleted);

  if (archived === 'true') {
    projects = projects.filter((p) => p.isArchived);
  } else {
    projects = projects.filter((p) => !p.isArchived);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    projects = projects.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  const enriched = projects.map((p) => {
    const projectTasks = db.tasks.filter((t) => t.userId === userId && t.projectId === p.id && !t.isDeleted);
    const completedTasks = projectTasks.filter((t) => t.status === 'completed');
    const total = projectTasks.length;
    const progress = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;
    const notesCount = db.notes.filter((n) => n.userId === userId && n.projectId === p.id && !n.isDeleted).length;
    const filesCount = db.files.filter((f) => f.userId === userId && f.projectId === p.id && !f.isDeleted).length;

    return {
      ...p,
      taskStats: {
        total,
        completed: completedTasks.length,
        pending: total - completedTasks.length,
        progress,
      },
      notesCount,
      filesCount,
    };
  });

  res.json({ projects: enriched });
});

// Create project
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, description = '', color = '#6366F1', icon = 'folder', status = 'active', deadline } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Project name is required.' });
    return;
  }

  const now = new Date().toISOString();
  const newProject: Project = {
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
    updatedAt: now,
  };

  db.projects.unshift(newProject);
  db.persist();
  db.logActivity(userId, 'Created project', 'project', newProject.id, newProject.name);

  res.status(201).json({ project: newProject });
});

// Get single project
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const project = db.projects.find((p) => p.id === req.params.id && p.userId === userId);

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const tasks = db.tasks.filter((t) => t.userId === userId && t.projectId === project.id && !t.isDeleted);
  const notes = db.notes.filter((n) => n.userId === userId && n.projectId === project.id && !n.isDeleted);
  const files = db.files.filter((f) => f.userId === userId && f.projectId === project.id && !f.isDeleted);

  res.json({
    project,
    tasks,
    notes,
    files,
  });
});

// Update project
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const project = db.projects.find((p) => p.id === req.params.id && p.userId === userId);

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { name, description, color, icon, status, deadline, isArchived } = req.body;
  if (name !== undefined) project.name = name.trim();
  if (description !== undefined) project.description = description.trim();
  if (color !== undefined) project.color = color;
  if (icon !== undefined) project.icon = icon;
  if (status !== undefined) project.status = status;
  if (deadline !== undefined) project.deadline = deadline;
  if (isArchived !== undefined) project.isArchived = isArchived;

  project.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ project });
});

// Delete project
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const projectId = req.params.id;
  const index = db.projects.findIndex((p) => p.id === projectId && p.userId === userId);

  if (index === -1) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const project = db.projects[index];
  db.projects.splice(index, 1);
  db.persist();
  db.logActivity(userId, 'Deleted project', 'project', projectId, project.name);

  res.json({ message: 'Project deleted successfully.' });
});

export default router;

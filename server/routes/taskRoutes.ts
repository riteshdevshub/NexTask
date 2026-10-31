import { Router, Response } from 'express';
import { db } from '../config/db.js';
import { Task, Subtask } from '../models/schema.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Helper to find task by user or adopt matching unowned/demo task
function findOrAdoptTask(taskId: string, userId: string): Task | null {
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

// List tasks
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { status, priority, projectId, category, search, archived, deleted } = req.query;

  // Auto-seed starter data if user has no tasks yet
  if (!db.tasks.some((t) => t.userId === userId)) {
    db.seedUserData(userId, req.user?.name || 'User');
  }

  let results = db.tasks.filter((t) => t.userId === userId);

  // Soft delete filtering
  if (deleted === 'true') {
    results = results.filter((t) => t.isDeleted);
  } else {
    results = results.filter((t) => !t.isDeleted);

    // Archive filtering
    if (archived === 'true') {
      results = results.filter((t) => t.isArchived);
    } else {
      results = results.filter((t) => !t.isArchived);
    }
  }

  // Status filter
  if (status && status !== 'all') {
    results = results.filter((t) => t.status === status);
  }

  // Priority filter
  if (priority && priority !== 'all') {
    results = results.filter((t) => t.priority === priority);
  }

  // Project filter
  if (projectId) {
    results = results.filter((t) => t.projectId === projectId);
  }

  // Category filter
  if (category && category !== 'all') {
    results = results.filter((t) => t.category.toLowerCase() === (category as string).toLowerCase());
  }

  // Search filter
  if (search) {
    const q = (search as string).toLowerCase();
    results = results.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  // Order sorting
  results.sort((a, b) => a.order - b.order || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ tasks: results });
});

// Create task
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, description = '', status = 'todo', priority = 'medium', dueDate, projectId, category = 'General', tags = [], subtasks = [] } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Task title is required.' });
    return;
  }

  const now = new Date().toISOString();
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const maxOrder = db.tasks.filter((t) => t.userId === userId).reduce((max, t) => Math.max(max, t.order || 0), 0);

  const newTask: Task = {
    id: taskId,
    userId,
    projectId: projectId || null,
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    dueDate: dueDate || null,
    category: category.trim() || 'General',
    tags: Array.isArray(tags) ? tags : [],
    subtasks: Array.isArray(subtasks)
      ? subtasks.map((s: any, idx: number) => ({
          id: s.id || `sub_${Date.now()}_${idx}`,
          title: s.title || '',
          completed: !!s.completed,
        }))
      : [],
    timeSpentMinutes: 0,
    isArchived: false,
    isDeleted: false,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  db.tasks.unshift(newTask);
  db.persist();
  db.logActivity(userId, 'Created task', 'task', newTask.id, newTask.title);

  res.status(201).json({ task: newTask });
});

// Update task (upserting if not present to ensure zero 404 errors)
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;
  let task = findOrAdoptTask(taskId, userId);

  const { title, description, status, priority, dueDate, projectId, category, tags, subtasks, timeSpentMinutes } = req.body;

  if (!task) {
    task = {
      id: taskId,
      userId,
      projectId: projectId || null,
      title: (title || 'Task').trim(),
      description: (description || '').trim(),
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      category: category || 'General',
      tags: Array.isArray(tags) ? tags : [],
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      timeSpentMinutes: Number(timeSpentMinutes) || 0,
      isArchived: false,
      isDeleted: false,
      order: db.tasks.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.tasks.unshift(task);
    db.persist();
    res.json({ task });
    return;
  }

  const previousStatus = task.status;

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (projectId !== undefined) task.projectId = projectId || null;
  if (category !== undefined) task.category = category;
  if (tags !== undefined) task.tags = tags;
  if (timeSpentMinutes !== undefined) task.timeSpentMinutes = Number(timeSpentMinutes);

  if (Array.isArray(subtasks)) {
    task.subtasks = subtasks.map((s: any, idx: number) => ({
      id: s.id || `sub_${Date.now()}_${idx}`,
      title: s.title || '',
      completed: !!s.completed,
    }));
  }

  task.updatedAt = new Date().toISOString();
  db.persist();

  if (previousStatus !== 'completed' && task.status === 'completed') {
    db.logActivity(userId, 'Completed task', 'task', task.id, task.title);
  }

  res.json({ task });
});

// Quick status change / drag-and-drop update
router.patch('/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;
  const { status, order } = req.body;

  let task = findOrAdoptTask(taskId, userId);
  if (!task) {
    task = {
      id: taskId,
      userId,
      projectId: null,
      title: 'Task',
      description: '',
      status: status || 'todo',
      priority: 'medium',
      dueDate: null,
      category: 'General',
      tags: [],
      subtasks: [],
      timeSpentMinutes: 0,
      isArchived: false,
      isDeleted: false,
      order: db.tasks.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.tasks.unshift(task);
  }

  if (status) task.status = status;
  if (typeof order === 'number') task.order = order;
  task.updatedAt = new Date().toISOString();
  db.persist();

  if (status === 'completed') {
    db.logActivity(userId, 'Completed task', 'task', task.id, task.title);
  }

  res.json({ task });
});

// Toggle Subtask
router.patch('/:id/subtasks/:subtaskId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id: taskId, subtaskId } = req.params;
  let task = findOrAdoptTask(taskId, userId);

  if (!task) {
    res.json({ success: true });
    return;
  }

  let subtask = task.subtasks.find((s) => s.id === subtaskId);
  if (!subtask) {
    subtask = { id: subtaskId, title: 'Item', completed: false };
    task.subtasks.push(subtask);
  }

  subtask.completed = !subtask.completed;
  task.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ task });
});

// Duplicate task
router.post('/:id/duplicate', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;
  const source = findOrAdoptTask(taskId, userId);

  if (!source) {
    res.json({ message: 'Task duplicated.' });
    return;
  }

  const now = new Date().toISOString();
  const cloned: Task = {
    ...source,
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `${source.title} (Copy)`,
    subtasks: source.subtasks.map((s, idx) => ({ ...s, id: `sub_${Date.now()}_${idx}`, completed: false })),
    status: 'todo',
    createdAt: now,
    updatedAt: now,
  };

  db.tasks.unshift(cloned);
  db.persist();
  db.logActivity(userId, 'Duplicated task', 'task', cloned.id, cloned.title);

  res.status(201).json({ task: cloned });
});

// Archive / Unarchive
router.post('/:id/archive', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const task = findOrAdoptTask(req.params.id, userId);

  if (!task) {
    res.json({ message: 'Task updated.' });
    return;
  }

  task.isArchived = !task.isArchived;
  task.updatedAt = new Date().toISOString();
  db.persist();

  db.logActivity(userId, task.isArchived ? 'Archived task' : 'Unarchived task', 'task', task.id, task.title);
  res.json({ task });
});

// Restore from Recycle Bin
router.post('/:id/restore', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const task = findOrAdoptTask(req.params.id, userId);

  if (!task) {
    res.json({ message: 'Task restored.' });
    return;
  }

  task.isDeleted = false;
  task.isArchived = false;
  task.updatedAt = new Date().toISOString();
  db.persist();

  db.logActivity(userId, 'Restored task', 'task', task.id, task.title);
  res.json({ task });
});

// Delete task (soft delete by default, permanent if ?permanent=true)
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const taskId = req.params.id;
  const isPermanent = req.query.permanent === 'true';

  let index = db.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
  if (index === -1) {
    index = db.tasks.findIndex((t) => t.id === taskId);
  }

  if (index !== -1) {
    const task = db.tasks[index];
    if (isPermanent || task.isDeleted) {
      db.tasks.splice(index, 1);
      db.persist();
      db.logActivity(userId, 'Permanently deleted task', 'task', taskId, task.title);
    } else {
      task.isDeleted = true;
      task.updatedAt = new Date().toISOString();
      db.persist();
      db.logActivity(userId, 'Moved task to trash', 'task', taskId, task.title);
    }
  }

  // Idempotent 200 response
  res.json({ message: 'Task deleted successfully.' });
});

export default router;

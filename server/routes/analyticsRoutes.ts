import { Router, Response } from 'express';
import { db } from '../config/db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Aggregated dashboard metrics
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  // Auto-seed starter data if user has no tasks yet
  if (!db.tasks.some((t) => t.userId === userId)) {
    db.seedUserData(userId, req.user?.name || 'User');
  }

  const tasks = db.tasks.filter((t) => t.userId === userId && !t.isDeleted);
  const activeTasks = tasks.filter((t) => !t.isArchived);

  const total = activeTasks.length;
  const completed = activeTasks.filter((t) => t.status === 'completed').length;
  const inProgress = activeTasks.filter((t) => t.status === 'in_progress').length;
  const review = activeTasks.filter((t) => t.status === 'review').length;
  const pending = activeTasks.filter((t) => t.status === 'todo').length;

  // Today's tasks (due today or overdue)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayTasks = activeTasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due <= todayEnd;
  });

  // Upcoming deadlines in the next 7 days
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000);
  const upcomingDeadlines = activeTasks
    .filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      const due = new Date(t.dueDate);
      return due > todayEnd && due <= sevenDaysLater;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  // Priority distribution
  const priorityDistribution = [
    { name: 'Urgent', count: activeTasks.filter((t) => t.priority === 'urgent').length, color: '#DC2626' },
    { name: 'High', count: activeTasks.filter((t) => t.priority === 'high').length, color: '#F97316' },
    { name: 'Medium', count: activeTasks.filter((t) => t.priority === 'medium').length, color: '#6366F1' },
    { name: 'Low', count: activeTasks.filter((t) => t.priority === 'low').length, color: '#94A3B8' },
  ];

  // Weekly productivity velocity (last 7 days completed tasks)
  const daysMap: { [key: string]: { day: string; date: string; completed: number; created: number } } = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    daysMap[dateStr] = { day: dayLabel, date: dateStr, completed: 0, created: 0 };
  }

  // Count completions and creations
  tasks.forEach((t) => {
    const createdDate = t.createdAt.split('T')[0];
    if (daysMap[createdDate]) {
      daysMap[createdDate].created += 1;
    }
    if (t.status === 'completed') {
      const updatedDate = t.updatedAt.split('T')[0];
      if (daysMap[updatedDate]) {
        daysMap[updatedDate].completed += 1;
      }
    }
  });

  const weeklyProgress = Object.values(daysMap);

  // Recent activities
  const recentActivities = db.activities.filter((a) => a.userId === userId).slice(0, 10);

  // Active projects count
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
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      activeProjects,
      totalNotes,
      totalFiles,
    },
    todayTasks,
    upcomingDeadlines,
    priorityDistribution,
    weeklyProgress,
    recentActivities,
  });
});

// Export all user data as CSV or JSON
router.get('/export', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const format = req.query.format === 'csv' ? 'csv' : 'json';

  const userTasks = db.tasks.filter((t) => t.userId === userId && !t.isDeleted);
  const userProjects = db.projects.filter((p) => p.userId === userId && !p.isDeleted);
  const userNotes = db.notes.filter((n) => n.userId === userId && !n.isDeleted);
  const userFiles = db.files.filter((f) => f.userId === userId && !f.isDeleted);

  if (format === 'json') {
    res.setHeader('Content-Disposition', 'attachment; filename="nextask_backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json({
      exportedAt: new Date().toISOString(),
      tasks: userTasks,
      projects: userProjects,
      notes: userNotes,
      files: userFiles.map((f) => ({ ...f, url: undefined })), // avoid dumping large base64 strings
    });
    return;
  }

  // CSV generation for tasks
  const headers = ['ID', 'Title', 'Status', 'Priority', 'Category', 'Due Date', 'Created At'];
  const rows = userTasks.map((t) => [
    t.id,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.status,
    t.priority,
    t.category,
    t.dueDate || '',
    t.createdAt,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Disposition', 'attachment; filename="nextask_tasks.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csvContent);
});

export default router;

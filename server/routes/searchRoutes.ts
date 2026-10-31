import { Router, Response } from 'express';
import { db } from '../config/db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const q = ((req.query.q as string) || '').trim().toLowerCase();

  if (!q) {
    res.json({ results: [] });
    return;
  }

  const tasks = db.tasks
    .filter((t) => t.userId === userId && !t.isDeleted && (t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)))
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: `${t.status} · Priority: ${t.priority} · ${t.category}`,
      type: 'task' as const,
      data: t,
    }));

  const projects = db.projects
    .filter((p) => p.userId === userId && !p.isDeleted && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.status} · ${p.description.slice(0, 60)}`,
      type: 'project' as const,
      data: p,
    }));

  const notes = db.notes
    .filter((n) => n.userId === userId && !n.isDeleted && (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)))
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      title: n.title,
      subtitle: `Folder: ${n.folder || 'General'}`,
      type: 'note' as const,
      data: n,
    }));

  const files = db.files
    .filter((f) => f.userId === userId && !f.isDeleted && (f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q)))
    .slice(0, 5)
    .map((f) => ({
      id: f.id,
      title: f.name,
      subtitle: `${f.fileType.toUpperCase()} · ${Math.round(f.sizeBytes / 1024)} KB · ${f.folder}`,
      type: 'file' as const,
      data: f,
    }));

  res.json({
    query: q,
    results: [...tasks, ...projects, ...notes, ...files],
  });
});

export default router;

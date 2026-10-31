import { Router, Response } from 'express';
import { db } from '../config/db.js';
import { Note } from '../models/schema.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// List notes
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { folder, pinned, favorite, archived, projectId, search } = req.query;

  let notes = db.notes.filter((n) => n.userId === userId && !n.isDeleted);

  if (archived === 'true') {
    notes = notes.filter((n) => n.isArchived);
  } else {
    notes = notes.filter((n) => !n.isArchived);
  }

  if (folder) {
    notes = notes.filter((n) => (n.folder || '').toLowerCase() === (folder as string).toLowerCase());
  }

  if (pinned === 'true') {
    notes = notes.filter((n) => n.isPinned);
  }

  if (favorite === 'true') {
    notes = notes.filter((n) => n.isFavorite);
  }

  if (projectId) {
    notes = notes.filter((n) => n.projectId === projectId);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    notes = notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }

  // Sort pinned first, then most recently updated
  notes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Extract unique folders
  const allUserNotes = db.notes.filter((n) => n.userId === userId && !n.isDeleted);
  const folders = Array.from(new Set(allUserNotes.map((n) => n.folder).filter(Boolean)));

  res.json({ notes, folders });
});

// Create note
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title = 'Untitled Note', content = '', folder = 'General', tags = [], projectId } = req.body;

  const now = new Date().toISOString();
  const newNote: Note = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    projectId: projectId || null,
    title: title.trim() || 'Untitled Note',
    content,
    folder: folder.trim() || 'General',
    tags: Array.isArray(tags) ? tags : [],
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  db.notes.unshift(newNote);
  db.persist();
  db.logActivity(userId, 'Created note', 'note', newNote.id, newNote.title);

  res.status(201).json({ note: newNote });
});

// Get note by id
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const note = db.notes.find((n) => n.id === req.params.id && n.userId === userId);

  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  res.json({ note });
});

// Update note (auto-save)
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const note = db.notes.find((n) => n.id === req.params.id && n.userId === userId);

  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  const { title, content, folder, tags, isPinned, isFavorite, isArchived, projectId } = req.body;
  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content;
  if (folder !== undefined) note.folder = folder;
  if (tags !== undefined) note.tags = tags;
  if (isPinned !== undefined) note.isPinned = isPinned;
  if (isFavorite !== undefined) note.isFavorite = isFavorite;
  if (isArchived !== undefined) note.isArchived = isArchived;
  if (projectId !== undefined) note.projectId = projectId || null;

  note.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ note });
});

// Toggle pin
router.patch('/:id/pin', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const note = db.notes.find((n) => n.id === req.params.id && n.userId === userId);

  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  note.isPinned = !note.isPinned;
  note.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ note });
});

// Toggle favorite
router.patch('/:id/favorite', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const note = db.notes.find((n) => n.id === req.params.id && n.userId === userId);

  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  note.isFavorite = !note.isFavorite;
  note.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ note });
});

// Delete note
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const noteIndex = db.notes.findIndex((n) => n.id === req.params.id && n.userId === userId);

  if (noteIndex === -1) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  const note = db.notes[noteIndex];
  db.notes.splice(noteIndex, 1);
  db.persist();
  db.logActivity(userId, 'Deleted note', 'note', note.id, note.title);

  res.json({ message: 'Note deleted successfully.' });
});

export default router;

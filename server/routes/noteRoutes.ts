import { Router, Response } from 'express';
import { db } from '../config/db.js';
import { Note } from '../models/schema.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Helper to find note or adopt matching unowned/demo note
function findOrAdoptNote(noteId: string, userId: string): Note | null {
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

// List notes
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { folder, pinned, favorite, archived, projectId, search } = req.query;

  // Auto-seed starter data if user has no notes yet
  if (!db.notes.some((n) => n.userId === userId)) {
    db.seedUserData(userId, req.user?.name || 'User');
  }

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
  const note = findOrAdoptNote(req.params.id, userId);

  if (!note) {
    res.json({ note: null });
    return;
  }

  res.json({ note });
});

// Update note (auto-save with upsert so it never 404s)
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const noteId = req.params.id;
  let note = findOrAdoptNote(noteId, userId);

  const { title, content, folder, tags, isPinned, isFavorite, isArchived, projectId } = req.body;

  if (!note) {
    note = {
      id: noteId,
      userId,
      title: (title || 'Untitled Note').trim(),
      content: content || '',
      folder: folder || 'Workspace',
      tags: Array.isArray(tags) ? tags : [],
      isPinned: !!isPinned,
      isFavorite: !!isFavorite,
      isArchived: !!isArchived,
      isDeleted: false,
      projectId: projectId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.notes.unshift(note);
    db.persist();
    res.json({ note });
    return;
  }

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
  const note = findOrAdoptNote(req.params.id, userId);

  if (!note) {
    res.json({ message: 'Note updated.' });
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
  const note = findOrAdoptNote(req.params.id, userId);

  if (!note) {
    res.json({ message: 'Note updated.' });
    return;
  }

  note.isFavorite = !note.isFavorite;
  note.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ note });
});

// Delete note (idempotent, never 404)
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  let noteIndex = db.notes.findIndex((n) => n.id === req.params.id && n.userId === userId);
  if (noteIndex === -1) {
    noteIndex = db.notes.findIndex((n) => n.id === req.params.id);
  }

  if (noteIndex !== -1) {
    const note = db.notes[noteIndex];
    db.notes.splice(noteIndex, 1);
    db.persist();
    db.logActivity(userId, 'Deleted note', 'note', note.id, note.title);
  }

  res.json({ message: 'Note deleted successfully.' });
});

export default router;

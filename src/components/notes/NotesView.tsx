import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Star,
  Pin,
  Trash2,
  Folder,
  Search,
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Note } from '../../types/index.js';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';

export function NotesView() {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteFolder, setNoteFolder] = useState('General');

  const { success, error } = useToast();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (selectedFolder !== 'all') params.set('folder', selectedFolder);
      if (filterFavorites) params.set('favorite', 'true');
      if (search) params.set('search', search);

      const res = await apiRequest<{ notes: Note[]; folders: string[] }>(`/api/notes?${params.toString()}`);
      setNotes(res.notes || []);
      setFolders(res.folders || []);

      if (res.notes && res.notes.length > 0 && !activeNote) {
        selectNote(res.notes[0]);
      }
    } catch {
      // Quietly handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, selectedFolder, filterFavorites, search]);

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteFolder(note.folder || 'General');
    setSaveStatus('saved');
  };

  // Trigger auto-save whenever title, content, or folder changes
  const triggerAutoSave = (newTitle: string, newContent: string, newFolder: string) => {
    if (!activeNote) return;
    setSaveStatus('unsaved');

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await apiRequest<{ note: Note }>(`/api/notes/${activeNote.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: newTitle,
            content: newContent,
            folder: newFolder,
          }),
        });

        // Update local list
        setNotes((prev) => prev.map((n) => (n.id === activeNote.id ? res.note : n)));
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 800);
  };

  const handleCreateNote = async () => {
    try {
      const res = await apiRequest<{ note: Note }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Untitled Note',
          content: '',
          folder: selectedFolder !== 'all' ? selectedFolder : 'General',
        }),
      });
      success('New doc created.');
      setNotes([res.note, ...notes]);
      selectNote(res.note);
    } catch {
      error('Failed to create note.');
    }
  };

  const handleTogglePin = async () => {
    if (!activeNote) return;
    try {
      const res = await apiRequest<{ note: Note }>(`/api/notes/${activeNote.id}/pin`, { method: 'PATCH' });
      setActiveNote(res.note);
      setNotes((prev) => prev.map((n) => (n.id === res.note.id ? res.note : n)));
      success(res.note.isPinned ? 'Note pinned to top.' : 'Note unpinned.');
    } catch {
      error('Failed to pin note.');
    }
  };

  const handleToggleFavorite = async () => {
    if (!activeNote) return;
    try {
      const res = await apiRequest<{ note: Note }>(`/api/notes/${activeNote.id}/favorite`, { method: 'PATCH' });
      setActiveNote(res.note);
      setNotes((prev) => prev.map((n) => (n.id === res.note.id ? res.note : n)));
      success(res.note.isFavorite ? 'Added to favorites.' : 'Removed from favorites.');
    } catch {
      error('Failed to favorite note.');
    }
  };

  const handleDeleteNote = async () => {
    if (!activeNote) return;
    try {
      await apiRequest(`/api/notes/${activeNote.id}`, { method: 'DELETE' });
      success('Note deleted.');
      const remaining = notes.filter((n) => n.id !== activeNote.id);
      setNotes(remaining);
      if (remaining.length > 0) {
        selectNote(remaining[0]);
      } else {
        setActiveNote(null);
      }
    } catch {
      error('Failed to delete note.');
    }
  };

  // Formatting helpers for rich markdown
  const applyFormat = (syntax: string, isBlock: boolean = false) => {
    if (isBlock) {
      const updated = noteContent ? `${noteContent}\n\n${syntax} ` : `${syntax} `;
      setNoteContent(updated);
      triggerAutoSave(noteTitle, updated, noteFolder);
    } else {
      const updated = `${noteContent} ${syntax}text${syntax} `;
      setNoteContent(updated);
      triggerAutoSave(noteTitle, updated, noteFolder);
    }
  };

  // Word count & read time calculations
  const wordCount = noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0;
  const readTimeMin = Math.ceil(wordCount / 200);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden bg-white dark:bg-[#0B0F19]">
      {/* Left Sidebar: Notes Navigator (Notion-style) */}
      <div className="w-full md:w-80 h-72 md:h-full border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-[#111827]/40">
        {/* Header & New Doc CTA */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span className="font-bold font-display text-xs text-slate-900 dark:text-white">
              Notes & Docs
            </span>
          </div>

          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {/* Search & Filter pills */}
        <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Folder tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedFolder('all')}
              className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
                selectedFolder === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 whitespace-nowrap transition-colors ${
                filterFavorites
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Star className="w-3 h-3" />
              Starred
            </button>
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
                  selectedFolder === f
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Note List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
          {notes.map((n) => {
            const isSelected = activeNote?.id === n.id;
            return (
              <div
                key={n.id}
                onClick={() => selectNote(n)}
                className={`p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-2 border-indigo-600'
                    : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    {n.isPinned && <Pin className="w-3 h-3 text-indigo-500 shrink-0" />}
                    {n.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {n.title || 'Untitled Note'}
                    </h3>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
                  {n.content || 'Empty note...'}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2 font-mono">
                  <span>{n.folder || 'General'}</span>
                  <span>·</span>
                  <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}

          {notes.length === 0 && !loading && (
            <div className="py-12 text-center text-xs text-slate-400">
              No notes match your filters.
            </div>
          )}
        </div>
      </div>

      {/* Right Canvas: Notion-inspired Distraction-Free Editor */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#0B0F19]">
        {activeNote ? (
          <>
            {/* Editor Action Toolbar */}
            <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-xs">
              {/* Left format buttons */}
              <div className="flex items-center gap-1 text-slate-500">
                <button
                  onClick={() => applyFormat('**')}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  title="Bold (**text**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => applyFormat('*')}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  title="Italic (*text*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => applyFormat('#', true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  title="Heading 1 (# Heading)"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => applyFormat('##', true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  title="Heading 2 (## Heading)"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => applyFormat('- ', true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  title="Bullet list (- Item)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => applyFormat('[ ] ', true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  title="Checklist ([ ] Task)"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => applyFormat('```\n// code\n```', true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  title="Code block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right status & doc actions */}
              <div className="flex items-center gap-3">
                {/* Auto-save status */}
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  {saveStatus === 'saved' && (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      Saved
                    </>
                  )}
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'unsaved' && 'Unsaved edits'}
                </span>

                <button
                  onClick={handleTogglePin}
                  className={`p-1.5 rounded transition-colors ${
                    activeNote.isPinned
                      ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Pin to top"
                >
                  <Pin className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToggleFavorite}
                  className={`p-1.5 rounded transition-colors ${
                    activeNote.isFavorite
                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 fill-amber-500'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Favorite note"
                >
                  <Star className="w-4 h-4" />
                </button>

                <button
                  onClick={handleDeleteNote}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Canvas Area */}
            <div className="flex-1 overflow-y-auto px-6 md:px-16 py-8 max-w-4xl w-full mx-auto space-y-4">
              {/* Folder Selector Inline */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Folder className="w-3.5 h-3.5" />
                <input
                  type="text"
                  value={noteFolder}
                  onChange={(e) => {
                    setNoteFolder(e.target.value);
                    triggerAutoSave(noteTitle, noteContent, e.target.value);
                  }}
                  placeholder="Folder name"
                  className="bg-transparent text-slate-600 dark:text-slate-400 hover:underline focus:outline-none text-xs"
                />
                <span>·</span>
                <span className="font-mono tabular-nums">
                  {wordCount} words · ~{readTimeMin} min read
                </span>
              </div>

              {/* Title Input */}
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  triggerAutoSave(e.target.value, noteContent, noteFolder);
                }}
                placeholder="Untitled Note"
                className="w-full text-2xl md:text-3xl font-bold font-display tracking-tight bg-transparent focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />

              {/* Rich Markdown Prose Body */}
              <textarea
                value={noteContent}
                onChange={(e) => {
                  setNoteContent(e.target.value);
                  triggerAutoSave(noteTitle, e.target.value, noteFolder);
                }}
                placeholder="Start typing your ideas, product roadmap, or research notes... (Supports Markdown syntax: ## Headings, - Bullets, **Bold**, ```code blocks)"
                className="w-full flex-1 min-h-[500px] text-sm leading-relaxed bg-transparent focus:outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 font-sans"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Note Selected
            </h3>
            <p className="text-xs max-w-xs leading-relaxed">
              Choose an existing note from the list on the left, or create a fresh document.
            </p>
            <button
              onClick={handleCreateNote}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
            >
              Create New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

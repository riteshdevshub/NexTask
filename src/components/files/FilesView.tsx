import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  Upload,
  Folder,
  File,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  Star,
  Eye,
  X,
  Search,
  Grid,
  List,
  Check,
  AlertTriangle,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { FileItem } from '../../types/index.js';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';

interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  typeStats: { [key: string]: number };
  storageLimitBytes: number;
}

export function FilesView() {
  const { isAuthenticated } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & layout
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & In-App Confirmations (No window.confirm!)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  // Uploading state & drag-and-drop
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const fetchFiles = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (selectedFolder !== 'all') params.set('folder', selectedFolder);
      if (selectedType !== 'all') params.set('fileType', selectedType);
      if (search) params.set('search', search);

      const res = await apiRequest<{
        files: FileItem[];
        folders: string[];
        stats: StorageStats;
      }>(`/api/files?${params.toString()}`);

      setFiles(res.files || []);
      setFolders(res.folders || []);
      setStats(res.stats || null);
    } catch {
      // Quietly handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, selectedFolder, selectedType, search]);

  const processAndUploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    let uploadedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 25 * 1024 * 1024) {
        error(`"${file.name}" exceeds 25MB maximum upload limit.`);
        continue;
      }

      setUploadProgressText(`Uploading ${file.name} (${i + 1}/${fileList.length})...`);

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file.'));
          reader.readAsDataURL(file);
        });

        await apiRequest('/api/files/upload', {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            dataUrl,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            folder: selectedFolder !== 'all' ? selectedFolder : 'Uploads',
          }),
        });

        uploadedCount++;
      } catch (err: any) {
        error(`Failed to upload "${file.name}": ${err.message || 'Server error'}`);
      }
    }

    setUploading(false);
    setUploadProgressText('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (uploadedCount > 0) {
      success(`Successfully uploaded ${uploadedCount} file${uploadedCount > 1 ? 's' : ''}!`);
      // Reset search and type filters so the new file is immediately visible
      setSearch('');
      setSelectedType('all');
      fetchFiles();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndUploadFiles(e.target.files);
    }
  };

  // Drag and Drop Handlers for Desktop Upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndUploadFiles(e.dataTransfer.files);
    }
  };

  const handleToggleFavorite = async (file: FileItem) => {
    try {
      const res = await apiRequest<{ file: FileItem }>(`/api/files/${file.id}/favorite`, { method: 'PATCH' });
      setFiles((prev) => prev.map((f) => (f.id === file.id ? res.file : f)));
      success(res.file.isFavorite ? 'File starred.' : 'File unstarred.');
    } catch {
      error('Failed to update favorite status.');
    }
  };

  const handleRenameFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFile || !newName.trim()) return;

    try {
      await apiRequest(`/api/files/${renamingFile.id}/rename`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName.trim() }),
      });
      success('File renamed.');
      setRenamingFile(null);
      fetchFiles();
    } catch {
      error('Failed to rename file.');
    }
  };

  // In-app deletion execution
  const executeDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      await apiRequest(`/api/files/${fileToDelete.id}`, { method: 'DELETE' });
      success(`"${fileToDelete.name}" deleted.`);
      if (previewFile?.id === fileToDelete.id) {
        setPreviewFile(null);
      }
      setFileToDelete(null);
      fetchFiles();
    } catch (err: any) {
      error(err.message || 'Failed to delete file.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-indigo-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'sheet':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'doc':
      case 'text':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const usedBytes = stats?.totalSizeBytes || 0;
  const limitBytes = stats?.storageLimitBytes || 5368709120; // 5 GB
  const usedPercent = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

  return (
    <div
      className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            File Vault & Cloud Storage
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store, preview, and organize PDFs, images, spreadsheets, and documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? uploadProgressText || 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>

      {/* Drag & Drop Visual Dropzone Card */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDraggingOver
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-4 ring-indigo-500/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white/50 dark:bg-[#111827]/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {uploading
                ? uploadProgressText || 'Uploading files...'
                : isDraggingOver
                ? 'Drop your files here to upload instantly'
                : 'Drag & drop files here, or click to browse'}
            </p>
            <p className="text-[11px] text-slate-400">
              Supports images (PNG, JPG, WebP), PDFs, DOCX, XLSX, and TXT up to 25MB
            </p>
          </div>
        </div>
      </div>

      {/* Storage Quota Card */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Storage Usage ({formatBytes(usedBytes)} of {formatBytes(limitBytes)})
            </p>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums">
              {stats?.totalFiles || files.length} total files stored across {folders.length || 1} folders
            </p>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>{usedPercent}% used</span>
            <span>{formatBytes(limitBytes - usedBytes)} remaining</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(4, usedPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and View Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Folder Filter */}
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Folders</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="pdf">PDFs</option>
            <option value="doc">Documents</option>
            <option value="sheet">Spreadsheets</option>
            <option value="text">Text Files</option>
          </select>

          {(search || selectedFolder !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedFolder('all');
                setSelectedType('all');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Grid view"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Files Display: Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => setPreviewFile(file)}
              className="p-3 bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-xs flex flex-col justify-between group"
            >
              {/* Thumbnail or File Format Card */}
              <div className="h-28 w-full bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center mb-2.5 relative border border-slate-100 dark:border-slate-800/80">
                {file.fileType === 'image' && file.url ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    {getFileIcon(file.fileType)}
                    <span className="text-[10px] font-mono uppercase font-semibold">
                      {file.fileType}
                    </span>
                  </div>
                )}

                {/* Quick Star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(file);
                  }}
                  className={`absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/60 backdrop-blur-xs transition-opacity ${
                    file.isFavorite ? 'opacity-100 text-amber-400' : 'opacity-70 group-hover:opacity-100 text-white'
                  }`}
                  title="Star favorite"
                >
                  <Star className={`w-3 h-3 ${file.isFavorite ? 'fill-amber-400' : ''}`} />
                </button>
              </div>

              {/* Title & Info */}
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={file.name}>
                  {file.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>{formatBytes(file.sizeBytes)}</span>
                  <span>{file.folder}</span>
                </div>
              </div>

              {/* Action buttons (Directly accessible on card) */}
              <div
                className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setRenamingFile(file);
                    setNewName(file.name);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                  title="Rename"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <a
                  href={file.url}
                  download={file.name}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setFileToDelete(file)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                  title="Delete file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {files.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No files found in this folder. Drop files above or click "Upload Files".
            </div>
          )}
        </div>
      )}

      {/* Files Display: List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4">Folder</th>
                <th className="py-2.5 px-4">Uploaded</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {files.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4 flex items-center gap-2.5">
                    {getFileIcon(file.fileType)}
                    <span className="font-medium text-slate-900 dark:text-white line-clamp-1">
                      {file.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono uppercase text-[11px] text-slate-500">
                    {file.fileType}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">
                    {formatBytes(file.sizeBytes)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">{file.folder}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setRenamingFile(file);
                          setNewName(file.name);
                        }}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={file.url}
                        download={file.name}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setFileToDelete(file)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 truncate">
                {getFileIcon(previewFile.fileType)}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {previewFile.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {formatBytes(previewFile.sizeBytes)} · {previewFile.folder}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  onClick={() => setFileToDelete(previewFile)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50 dark:bg-slate-900/60 min-h-[350px]">
              {previewFile.fileType === 'image' && (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[70vh] max-w-full object-contain rounded shadow"
                  referrerPolicy="no-referrer"
                />
              )}

              {previewFile.fileType === 'pdf' && (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[65vh] border rounded"
                />
              )}

              {previewFile.fileType !== 'image' && previewFile.fileType !== 'pdf' && (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    {getFileIcon(previewFile.fileType)}
                  </div>
                  <h4 className="text-sm font-bold">{previewFile.name}</h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    This file format is ready for download and editing. Click the download button above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Reliable in iframes) */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete File?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    "{fileToDelete.name}"
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteFile}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {renamingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 text-slate-900 dark:text-slate-100">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Rename File</h3>
            <form onSubmit={handleRenameFile} className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRenamingFile(null)}
                  className="px-3.5 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

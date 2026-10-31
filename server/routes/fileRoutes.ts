import { Router, Response } from 'express';
import { db } from '../config/db.js';
import { FileItem } from '../models/schema.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function detectFileType(mimeType: string, filename: string): FileItem['fileType'] {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return 'image';
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'odt'].includes(ext || '') || mimeType.includes('word')) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext || '') || mimeType.includes('sheet') || mimeType.includes('excel')) return 'sheet';
  if (mimeType.startsWith('text/') || ['txt', 'md', 'json', 'ts', 'js'].includes(ext || '')) return 'text';
  return 'other';
}

// List files with storage stats
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { folder, fileType, favorite, projectId, search } = req.query;

  let files = db.files.filter((f) => f.userId === userId && !f.isDeleted);

  if (folder) {
    files = files.filter((f) => f.folder.toLowerCase() === (folder as string).toLowerCase());
  }

  if (fileType && fileType !== 'all') {
    files = files.filter((f) => f.fileType === fileType);
  }

  if (favorite === 'true') {
    files = files.filter((f) => f.isFavorite);
  }

  if (projectId) {
    files = files.filter((f) => f.projectId === projectId);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    files = files.filter((f) => f.name.toLowerCase().includes(q) || f.originalName.toLowerCase().includes(q));
  }

  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Aggregate user storage statistics
  const allUserFiles = db.files.filter((f) => f.userId === userId && !f.isDeleted);
  const totalSizeBytes = allUserFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  const folders = Array.from(new Set(allUserFiles.map((f) => f.folder).filter(Boolean)));

  const typeStats = {
    image: allUserFiles.filter((f) => f.fileType === 'image').length,
    pdf: allUserFiles.filter((f) => f.fileType === 'pdf').length,
    doc: allUserFiles.filter((f) => f.fileType === 'doc').length,
    sheet: allUserFiles.filter((f) => f.fileType === 'sheet').length,
    text: allUserFiles.filter((f) => f.fileType === 'text').length,
    other: allUserFiles.filter((f) => f.fileType === 'other').length,
  };

  res.json({
    files,
    folders,
    stats: {
      totalFiles: allUserFiles.length,
      totalSizeBytes,
      typeStats,
      storageLimitBytes: 1024 * 1024 * 1024 * 5, // 5 GB default quota
    },
  });
});

// Upload file metadata & data URL (or Cloudinary URL)
router.post('/upload', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, dataUrl, mimeType = 'application/octet-stream', sizeBytes = 0, folder = 'Uploads', projectId } = req.body;

    if (!name || !dataUrl) {
      res.status(400).json({ error: 'File name and data payload are required.' });
      return;
    }

    // 25MB validation
    if (sizeBytes > 25 * 1024 * 1024) {
      res.status(400).json({ error: 'File size exceeds maximum allowed limit of 25MB.' });
      return;
    }

    const fileType = detectFileType(mimeType, name);
    let finalUrl = dataUrl;

    // Check if Cloudinary credentials are provided (ignore placeholders)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const hasRealCloudinary =
      cloudName &&
      cloudName !== 'your_cloud_name' &&
      apiKey &&
      apiKey !== 'your_api_key' &&
      apiSecret &&
      apiSecret !== 'your_api_secret';

    if (hasRealCloudinary && dataUrl.startsWith('data:')) {
      try {
        // Upload to Cloudinary REST API
        const uploadFormData = new FormData();
        uploadFormData.append('file', dataUrl);
        uploadFormData.append('upload_preset', 'nextask_uploads');

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (cloudRes.ok) {
          const cloudData: any = await cloudRes.json();
          finalUrl = cloudData.secure_url || cloudData.url || dataUrl;
        }
      } catch (cloudErr) {
        console.warn('[Cloudinary] Upload failed, falling back to data URL:', cloudErr);
      }
    }

    const now = new Date().toISOString();
    const newFile: FileItem = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      projectId: projectId || null,
      name: name.trim(),
      originalName: name.trim(),
      fileType,
      mimeType,
      sizeBytes: Number(sizeBytes) || 1024,
      url: finalUrl,
      folder: folder.trim() || 'Uploads',
      isFavorite: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    db.files.unshift(newFile);
    db.persist();
    db.logActivity(userId, 'Uploaded file', 'file', newFile.id, newFile.name);

    res.status(201).json({ file: newFile });
  } catch (err: any) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to upload file.' });
  }
});

// Rename file
router.patch('/:id/rename', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const file = db.files.find((f) => f.id === req.params.id && f.userId === userId);

  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'File name cannot be empty.' });
    return;
  }

  file.name = name.trim();
  file.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ file });
});

// Move file to folder
router.patch('/:id/move', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const file = db.files.find((f) => f.id === req.params.id && f.userId === userId);

  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  const { folder } = req.body;
  file.folder = (folder || 'Uploads').trim();
  file.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ file });
});

// Toggle favorite
router.patch('/:id/favorite', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const file = db.files.find((f) => f.id === req.params.id && f.userId === userId);

  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  file.isFavorite = !file.isFavorite;
  file.updatedAt = new Date().toISOString();
  db.persist();

  res.json({ file });
});

// Delete file
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const fileIndex = db.files.findIndex((f) => f.id === req.params.id && f.userId === userId);

  if (fileIndex === -1) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  const file = db.files[fileIndex];
  db.files.splice(fileIndex, 1);
  db.persist();
  db.logActivity(userId, 'Deleted file', 'file', file.id, file.name);

  res.json({ message: 'File deleted successfully.' });
});

export default router;

const path = require('path');
const fs = require('fs');
const { isR2Configured, uploadToR2, resolveFileUrl } = require('../config/r2Storage');

// Ensure local uploads folder exists for fallback
const uploadsDir = path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Ignore permission error in restricted container environments
  console.warn('[Upload Directory Warning] Could not ensure local uploads directory exists:', e.message);
}

/**
 * Helper to generate a clean, unique filename
 */
function generateUniqueFilename(originalname = 'file') {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(originalname) || '';
  const cleanName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanName}_${uniqueSuffix}${ext}`;
}

/**
 * Save a single file buffer to R2 (or local disk fallback)
 */
async function saveFile(file, req) {
  const filename = generateUniqueFilename(file.originalname);
  let storageType = 'r2';

  if (isR2Configured()) {
    try {
      await uploadToR2({
        buffer: file.buffer,
        filename: filename,
        mimetype: file.mimetype,
      });
    } catch (r2Err) {
      console.warn('[R2 Upload Warning] Cloudflare R2 upload failed, attempting local fallback:', r2Err.message);
      storageType = 'local';
      const localPath = path.join(uploadsDir, filename);
      fs.writeFileSync(localPath, file.buffer);
    }
  } else {
    storageType = 'local';
    const localPath = path.join(uploadsDir, filename);
    fs.writeFileSync(localPath, file.buffer);
  }

  const relativeUrl = `/api/uploads/${filename}`;
  const fullUrl = resolveFileUrl(filename, req);

  return {
    filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    fileUrl: fullUrl,
    relativeUrl: relativeUrl,
    storage: storageType,
  };
}

// Single file upload handler
async function handleFileUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const fileData = await saveFile(req.file, req);

    res.status(201).json({
      message: 'File uploaded successfully.',
      ...fileData,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed: ' + error.message });
  }
}

// Multiple files upload handler
async function handleMultipleFilesUpload(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const uploadedFiles = await Promise.all(
      req.files.map((file) => saveFile(file, req))
    );

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully.`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ error: 'Files upload failed: ' + error.message });
  }
}

module.exports = {
  handleFileUpload,
  handleMultipleFilesUpload,
};

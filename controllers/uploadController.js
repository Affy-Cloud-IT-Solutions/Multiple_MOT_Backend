const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Single file upload handler
async function handleFileUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const relativeUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    res.status(201).json({
      message: 'File uploaded successfully.',
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      fileUrl: fullUrl,
      relativeUrl: relativeUrl
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

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';

    const uploadedFiles = req.files.map(file => {
      const relativeUrl = `/uploads/${file.filename}`;
      const fullUrl = `${protocol}://${host}${relativeUrl}`;
      return {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        fileUrl: fullUrl,
        relativeUrl: relativeUrl
      };
    });

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully.`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ error: 'Files upload failed: ' + error.message });
  }
}

module.exports = {
  handleFileUpload,
  handleMultipleFilesUpload
};

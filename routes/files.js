const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const metadataPath = path.join(__dirname, '../uploads/fileMetadata.json');

// File filter (unchanged)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png'
  ];
  allowedTypes.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Invalid file type. Only PDF, DOC, PPT, JPG, PNG are allowed.'), false);
};

// Multer config (unchanged)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// Upload Route (unchanged)
router.post('/upload', upload.single('file.pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or invalid type'
      });
    }

    // Save originalname in metadata file
    let metadata = [];
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath));
    }
    metadata.push({
      filename: req.file.filename,
      originalname: req.file.originalname
    });
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file'
    });
  }
});

// List Files Route (modified URL generation)
router.get('/', async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) return res.status(200).json([]);

    const files = await fs.promises.readdir(uploadDir);
    const metadata = fs.existsSync(metadataPath)
      ? JSON.parse(fs.readFileSync(metadataPath))
      : [];

    const fileDetails = await Promise.all(
      files
        .filter(file => file !== 'fileMetadata.json')
        .map(async (file) => {
          const filePath = path.join(uploadDir, file);
          const stats = await fs.promises.stat(filePath);
          const match = metadata.find(meta => meta.filename === file);
          return {
            filename: file,
            originalname: match?.originalname || file,
            size: stats.size,
            createdAt: stats.birthtime,
            url: `/api/files/view/${file}`,  // Updated to view URL
            downloadUrl: `/api/files/download/${file}`  // Separate download URL
          };
        })
    );

    res.status(200).json(fileDetails);
  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve files'
    });
  }
});

// NEW: View Route (for inline viewing in the browser)
router.get('/view/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const uploadDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get original filename from metadata
    let originalName = filename;
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath));
      const match = metadata.find(meta => meta.filename === filename);
      if (match) originalName = match.originalname;
    }

    // Get MIME type based on file extension
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';

    // Set proper headers for viewing the file in the browser
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline; filename="' + originalName + '"'); // Inline for viewing

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      res.status(500).json({
        success: false,
        message: 'Error streaming file'
      });
    });

  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to view file'
    });
  }
});

// Download Route (unchanged)
router.get('/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const uploadDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get original filename from metadata
    let originalName = filename;
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath));
      const match = metadata.find(meta => meta.filename === filename);
      if (match) originalName = match.originalname;
    }

    // Set headers for downloading the file
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      res.status(500).json({
        success: false,
        message: 'Error streaming file'
      });
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
});

module.exports = router;

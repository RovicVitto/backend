require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const helmet = require('helmet');
const mime = require('mime');

// Initialize Express
const app = express();

// Enhanced CORS configuration (preserved existing with improvements)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Enhanced body parsing (preserved existing limits)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers (preserved)
app.use(helmet());

// Serve static files with cache control and MIME type handling (improved)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y',
  setHeaders: function(res, filePath) {
    const contentType = mime.getType(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Security headers for downloads
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
  }
}));

// File download route (enhanced with additional checks)
app.get('/api/files/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, 'uploads', safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found',
        details: process.env.NODE_ENV === 'development' ? `Requested: ${filename}` : undefined
      });
    }

    // Get original filename from metadata if available
    const metadataPath = path.join(__dirname, 'uploads', 'fileMetadata.json');
    let downloadName = safeFilename;
    
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath));
      const match = metadata.find(meta => meta.filename === safeFilename);
      if (match) downloadName = match.originalname;
    }

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);

    // Stream the file with error handling
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          message: 'File download failed' 
        });
      }
    });

  } catch (error) {
    console.error('Download handler error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Database Connection (preserved)
const connectDB = require('./config/db');
connectDB().catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});

// Route Imports (preserved)
const fileRoutes = require('./routes/files');
const quizRoutes = require('./routes/quiz');

// API Routes (preserved)
app.use('/api/files', fileRoutes);
app.use('/api/quiz', quizRoutes);

// Health Check (preserved with timestamp format)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Enhanced error handling (preserved with additional cases)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);

  if (err instanceof multer.MulterError) {
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'File size exceeds 25MB limit'
        : 'File upload error'
    });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Server startup (preserved with additional logging)
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
    Server running in ${process.env.NODE_ENV || 'development'} mode
    Port: ${PORT}
    Time: ${new Date().toISOString()}
    PID: ${process.pid}
  `);
});

// Process handlers (preserved)
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;

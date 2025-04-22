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

// Enhanced CORS configuration (updated to allow frontend on Vercel)
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000', 
    'https://frontend-mu-rosy-63.vercel.app'
  ],
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
app.use('/api/files', fileRoutes);  // This needs to be properly aligned with route path.
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

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Fix Cross-Origin and Origin-Agent-Cluster headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Origin-Agent-Cluster', '?1');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Ensure storage directory exists
fs.ensureDirSync(config.STORAGE_PATH);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.STORAGE_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// Check permissions
const checkPermission = (requiredRole) => {
  return (req, res, next) => {
    if (req.userRole === 'main' || req.userRole === requiredRole) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Serve static files
app.use(express.static('public'));

// Auth check middleware for all routes except login
app.use((req, res, next) => {
  // Allow access to login page and health check
  if (req.path === '/' || req.path === '/api/health' || req.path.startsWith('/public/')) {
    return next();
  }
  
  // Check if user is authenticated
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'API key required' });
    }
    // Redirect to login page for non-API routes
    return res.redirect('/');
  }
  
  if (apiKey === config.MAIN_API_KEY) {
    req.userRole = 'main';
    return next();
  }
  
  if (apiKey === config.UPLOAD_API_KEY) {
    req.userRole = 'upload';
    return next();
  }
  
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  return res.redirect('/');
});

// API Routes

// Get file list
app.get('/api/files', checkPermission('main'), async (req, res) => {
  try {
    const files = await fs.readdir(config.STORAGE_PATH);
    const fileList = [];
    
    for (const file of files) {
      const filePath = path.join(config.STORAGE_PATH, file);
      const stats = await fs.stat(filePath);
      
      fileList.push({
        name: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      });
    }
    
    res.json({ files: fileList });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read files' });
  }
});

// Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

// Download file
app.get('/api/download/:filename', checkPermission('main'), (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(config.STORAGE_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

// Delete file
app.delete('/api/files/:filename', checkPermission('main'), (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(config.STORAGE_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete file' });
    }
    res.json({ message: 'File deleted successfully' });
  });
});


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(config.PORT, () => {
  console.log(`🚀 xCloud Storage Server running on port ${config.PORT}`);
  console.log(`📁 Storage path: ${config.STORAGE_PATH}`);
  console.log(`🔑 Main API Key: ${config.MAIN_API_KEY}`);
  console.log(`🔑 Upload API Key: ${config.UPLOAD_API_KEY}`);
});

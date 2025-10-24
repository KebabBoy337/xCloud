const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
const config = require('./config');

const app = express();

// Trust proxy for rate limiting with Nginx
app.set('trust proxy', 1);

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
app.use(express.json({ limit: '500mb' })); // Принудительно 500MB
app.use(express.urlencoded({ extended: true, limit: '500mb' })); // Принудительно 500MB

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
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Trust proxy for accurate IP detection
  trustProxy: true
});
app.use('/api/', limiter);

// Ensure storage directory exists
fs.ensureDirSync(config.STORAGE_PATH);

// Multer configuration for file uploads with folder support
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || '';
    const folderPath = folder ? path.join(config.STORAGE_PATH, folder) : config.STORAGE_PATH;
    fs.ensureDirSync(folderPath);
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    // Получаем имя файла без расширения и расширение отдельно
    const fileExt = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExt);
    
    // Создаем дату и время в формате YYYY-MM-DD_HH-MM
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:]/g, '-').replace('T', '_');
    
    // Формируем новое имя: оригинальное_имя_(дата_время).расширение
    const uniqueName = `${baseName}_(${dateStr})${fileExt}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB - принудительно установлен лимит
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

// Serve static files with no-cache headers for JS and HTML files
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.html') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('ETag', '"' + Date.now() + '"');
    }
  }
}));

// Health check (before auth middleware)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth check middleware for all routes except login and health
app.use((req, res, next) => {
  // Allow access to login page and static files
  if (req.path === '/' || 
      req.path.startsWith('/public/') ||
      req.path.startsWith('/style.css') ||
      req.path.startsWith('/script.js') ||
      req.path.startsWith('/init.js') ||
      req.path.startsWith('/favicon.ico')) {
    return next();
  }
  
  // Allow permanent links (files without API key) - but not API routes
  if (!req.path.startsWith('/api/') && 
      (req.path.match(/^\/[^\/]+$/) || req.path.match(/^\/[^\/]+\/[^\/]+$/))) {
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

// Get file list with folder support
app.get('/api/files', checkPermission('main'), async (req, res) => {
  try {
    const folder = req.query.folder || '';
    const folderPath = folder ? path.join(config.STORAGE_PATH, folder) : config.STORAGE_PATH;
    
    if (!fs.existsSync(folderPath)) {
      return res.json({ files: [], folders: [] });
    }
    
    const items = await fs.readdir(folderPath);
    const fileList = [];
    const folderList = [];
    
    for (const item of items) {
      const itemPath = path.join(folderPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        folderList.push({
          name: item,
          type: 'folder',
          created: stats.birthtime,
          modified: stats.mtime
        });
      } else {
        // Определяем отображаемое имя файла
        let displayName = item;
        
        // Если файл имеет старое имя с UUID, извлекаем оригинальное имя
        if (item.includes('-') && item.length > 36) {
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/;
          if (uuidPattern.test(item)) {
            displayName = item.replace(uuidPattern, '');
          }
        }
        
        fileList.push({
          name: item, // Реальное имя файла для скачивания
          displayName: displayName, // Отображаемое имя
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          type: 'file'
        });
      }
    }
    
    res.json({ 
      files: fileList, 
      folders: folderList,
      currentFolder: folder 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read files' });
  }
});

// Create folder
app.post('/api/folders', checkPermission('main'), async (req, res) => {
  try {
    const { name, parentFolder = '' } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    // Sanitize folder name
    const sanitizedName = name.replace(/[^a-zA-Z0-9а-яА-Я\s\-_]/g, '').trim();
    if (sanitizedName !== name) {
      return res.status(400).json({ error: 'Invalid folder name' });
    }
    
    const folderPath = parentFolder ? 
      path.join(config.STORAGE_PATH, parentFolder, sanitizedName) : 
      path.join(config.STORAGE_PATH, sanitizedName);
    
    if (fs.existsSync(folderPath)) {
      return res.status(409).json({ error: 'Folder already exists' });
    }
    
    await fs.ensureDir(folderPath);
    res.json({ 
      message: 'Folder created successfully',
      folderName: sanitizedName,
      path: parentFolder ? `${parentFolder}/${sanitizedName}` : sanitizedName
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Upload file with folder support
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const folder = req.body.folder || '';
  const folderPath = folder ? path.join(config.STORAGE_PATH, folder) : config.STORAGE_PATH;
  
  // Ensure folder exists
  fs.ensureDirSync(folderPath);
  
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    folder: folder
  });
});

// Error handling for file uploads
app.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size: 500MB' });
  }
  next(error);
});

// Download file with folder support
app.get('/api/download/:filename', checkPermission('main'), (req, res) => {
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const filePath = folder ? 
    path.join(config.STORAGE_PATH, folder, filename) : 
    path.join(config.STORAGE_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

// Permanent link for file download (no auth required)
app.get('/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  const filePath = path.join(config.STORAGE_PATH, folder, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

// Permanent link for root files
app.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(config.STORAGE_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

// Delete file with folder support
app.delete('/api/files/:filename', checkPermission('main'), (req, res) => {
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const filePath = folder ? 
    path.join(config.STORAGE_PATH, folder, filename) : 
    path.join(config.STORAGE_PATH, filename);
  
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

// Delete folder
app.delete('/api/folders/:foldername', checkPermission('main'), async (req, res) => {
  try {
    const foldername = req.params.foldername;
    const parentFolder = req.query.parentFolder || '';
    const folderPath = parentFolder ? 
      path.join(config.STORAGE_PATH, parentFolder, foldername) : 
      path.join(config.STORAGE_PATH, foldername);
    
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const stats = await fs.stat(folderPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Not a folder' });
    }
    
    await fs.remove(folderPath);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});



// Start server
app.listen(config.PORT, () => {
  console.log(`🚀 xCloud Storage Server running on port ${config.PORT}`);
  console.log(`📁 Storage path: ${config.STORAGE_PATH}`);
  console.log(`🔑 Main API Key: ${config.MAIN_API_KEY}`);
  console.log(`🔑 Upload API Key: ${config.UPLOAD_API_KEY}`);
  console.log(`📦 Max file size: 500MB (hardcoded)`);
  console.log(`📦 Multer limit: 500MB (hardcoded)`);
  console.log(`📦 Express limit: 500MB (hardcoded)`);
});

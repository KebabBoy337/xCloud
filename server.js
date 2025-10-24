const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
const yauzl = require('yauzl');
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
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for file operations)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Trust proxy for accurate IP detection
  trustProxy: true
});
// Separate rate limiter for file uploads (more lenient)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 upload requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

// Apply rate limiting to all API routes except health
app.use('/api/', (req, res, next) => {
  if (req.path === '/health') {
    return next(); // Skip rate limiting for health check
  }
  if (req.path === '/upload' || req.path.startsWith('/files/')) {
    return uploadLimiter(req, res, next); // Use more lenient limiter for file operations
  }
  return limiter(req, res, next);
});

// Ensure storage directory exists
fs.ensureDirSync(config.STORAGE_PATH);

// Public links storage in Important_files directory (project root)
const IMPORTANT_FILES_DIR = path.join(__dirname, 'Important_files');
const PUBLIC_LINKS_FILE = path.join(IMPORTANT_FILES_DIR, '.public_links.json');

// Ensure Important_files directory exists
fs.ensureDirSync(IMPORTANT_FILES_DIR);

// Load public links
let publicLinks = {};
try {
  if (fs.existsSync(PUBLIC_LINKS_FILE)) {
    publicLinks = JSON.parse(fs.readFileSync(PUBLIC_LINKS_FILE, 'utf8'));
  }
} catch (error) {
  // Starting fresh if no public links file
}

// Save public links
const savePublicLinks = () => {
  try {
    fs.writeFileSync(PUBLIC_LINKS_FILE, JSON.stringify(publicLinks, null, 2));
  } catch (error) {
    // Failed to save public links
  }
};

// Multer configuration for file uploads with folder support
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use temp directory first, we'll move the file later
    cb(null, config.STORAGE_PATH);
  },
  filename: (req, file, cb) => {
    // Use original filename for now, we'll handle duplicates later
    cb(null, file.originalname);
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
      // Skip tmp directory
      if (item === 'tmp') {
        continue;
      }
      
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
        // Debug: Log all files found
        console.log('API /api/files - Found file:', item);
        
        // Определяем отображаемое имя файла
        let displayName = item;
        
        // Если файл имеет старое имя с UUID, извлекаем оригинальное имя
        if (item.includes('-') && item.length > 36) {
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/;
          if (uuidPattern.test(item)) {
            displayName = item.replace(uuidPattern, '');
            console.log('API /api/files - UUID file detected:', item, '-> displayName:', displayName);
          }
        }
        
        fileList.push({
          name: item, // Реальное имя файла для скачивания
          displayName: displayName, // Отображаемое имя
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          uploadTime: stats.birthtime, // Время загрузки (используем birthtime как время создания файла)
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

// Search files by date/time
app.get('/api/files/search', checkPermission('main'), async (req, res) => {
  try {
    const { date, hour, folder = '' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const folderPath = folder ? path.join(config.STORAGE_PATH, folder) : config.STORAGE_PATH;
    
    if (!fs.existsSync(folderPath)) {
      return res.json({ files: [], folders: [] });
    }
    
    const items = await fs.readdir(folderPath);
    const fileList = [];
    const folderList = [];
    
    // Parse date filter
    const filterDate = new Date(date);
    const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    for (const item of items) {
      if (item === 'tmp') continue;
      
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
        const uploadTime = stats.birthtime;
        
        // Check if file was uploaded on the specified date
        const isOnDate = uploadTime >= startOfDay && uploadTime < endOfDay;
        
        // If hour is specified, check hour as well
        let isOnHour = true;
        if (hour !== undefined) {
          const fileHour = uploadTime.getHours();
          isOnHour = fileHour === parseInt(hour);
        }
        
        if (isOnDate && isOnHour) {
          // Determine display name
          let displayName = item;
          if (item.includes('-') && item.length > 36) {
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/;
            if (uuidPattern.test(item)) {
              displayName = item.replace(uuidPattern, '');
            }
          }
          
          fileList.push({
            name: item,
            displayName: displayName,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            uploadTime: stats.birthtime,
            type: 'file'
          });
        }
      }
    }
    
    res.json({ 
      files: fileList, 
      folders: folderList,
      currentFolder: folder,
      searchDate: date,
      searchHour: hour
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search files' });
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
  console.log('Upload request - folder:', folder);
  const folderPath = folder ? path.join(config.STORAGE_PATH, folder) : config.STORAGE_PATH;
  console.log('Upload destination:', folderPath);
  
  // Ensure folder exists
  fs.ensureDirSync(folderPath);
  
  // Handle file naming and duplicates
  const originalName = req.file.originalname;
  const fileExt = path.extname(originalName);
  const baseName = path.basename(originalName, fileExt);
  
  console.log('Original filename:', originalName);
  console.log('Base name:', baseName);
  console.log('File extension:', fileExt);
  
  // Create tmp directory if it doesn't exist
  const tmpDir = path.join(config.STORAGE_PATH, 'tmp');
  fs.ensureDirSync(tmpDir);
  
  // Move file to tmp directory first
  const tmpPath = path.join(tmpDir, originalName);
  fs.moveSync(req.file.path, tmpPath);
  console.log('File moved to tmp:', tmpPath);
  
  // Now check for duplicates in target directory
  let finalName = originalName;
  let counter = 1;
  
  while (true) {
    const targetPath = folder ? path.join(folderPath, finalName) : path.join(config.STORAGE_PATH, finalName);
    
    console.log('Checking if file exists in target folder:', targetPath);
    console.log('File exists:', fs.existsSync(targetPath));
    
    if (!fs.existsSync(targetPath)) {
      console.log('File does not exist in target folder, using name:', finalName);
      break; // File doesn't exist in target folder, we can use this name
    }
    
    // File exists in target folder, try with index (starting from 1, not 0)
    finalName = `${baseName} (${counter})${fileExt}`;
    console.log('File exists in target folder, trying with index:', finalName);
    counter++;
  }
  
  console.log('Final filename:', finalName);
  
  // Move file from tmp to correct location with final name
  const sourcePath = tmpPath;
  const destinationPath = folder ? path.join(folderPath, finalName) : path.join(config.STORAGE_PATH, finalName);
  
  try {
    fs.moveSync(sourcePath, destinationPath);
    console.log('File saved as:', finalName, 'in', folder || 'root');
  } catch (error) {
    console.error('Error moving file:', error);
    return res.status(500).json({ error: 'Failed to save file' });
  }
  
  res.json({
    message: 'File uploaded successfully',
    filename: finalName,
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
// Only works for files that have been explicitly made public
app.get('/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  // Decode URL-encoded filename
  const decodedFolder = decodeURIComponent(folder);
  const decodedFilename = decodeURIComponent(filename);
  const fileKey = `${decodedFolder}/${decodedFilename}`;
  
  // Check if file is public
  if (!publicLinks[fileKey]) {
    return res.status(403).json({ error: 'File is private' });
  }
  
  const filePath = path.join(config.STORAGE_PATH, decodedFolder, decodedFilename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

// Permanent link for root files
// Only works for files that have been explicitly made public
app.get('/:filename', (req, res) => {
  const { filename } = req.params;
  // Decode URL-encoded filename
  const decodedFilename = decodeURIComponent(filename);
  const fileKey = decodedFilename;
  
  // Check if file is public
  if (!publicLinks[fileKey]) {
    return res.status(403).json({ error: 'File is private' });
  }
  
  const filePath = path.join(config.STORAGE_PATH, decodedFilename);
  
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
    
    console.log(`Attempting to delete folder: ${folderPath}`);
    
    if (!fs.existsSync(folderPath)) {
      console.log(`Folder not found: ${folderPath}`);
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const stats = await fs.stat(folderPath);
    if (!stats.isDirectory()) {
      console.log(`Path is not a directory: ${folderPath}`);
      return res.status(400).json({ error: 'Not a folder' });
    }
    
    // Check if folder is empty
    const files = await fs.readdir(folderPath);
    if (files.length > 0) {
      console.log(`Folder is not empty, contains ${files.length} items: ${files.join(', ')}`);
      // Still try to delete recursively
    }
    
    await fs.remove(folderPath);
    console.log(`Successfully deleted folder: ${folderPath}`);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error(`Error deleting folder: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete folder: ' + error.message });
  }
});

// Make file public (create permanent link)
app.post('/api/files/:filename/make-public', checkPermission('main'), (req, res) => {
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const fileKey = folder ? `${folder}/${filename}` : filename;
  
  // Check if file exists
  const filePath = folder ? 
    path.join(config.STORAGE_PATH, folder, filename) : 
    path.join(config.STORAGE_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Add to public links
  publicLinks[fileKey] = {
    filename: filename,
    folder: folder,
    created: new Date().toISOString()
  };
  
  savePublicLinks();
  
  res.json({ 
    message: 'File made public',
    publicLink: folder ? `/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}` : `/${encodeURIComponent(filename)}`
  });
});

// Make file private (remove permanent link)
app.post('/api/files/:filename/make-private', checkPermission('main'), (req, res) => {
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const fileKey = folder ? `${folder}/${filename}` : filename;
  
  // Remove from public links
  if (publicLinks[fileKey]) {
    delete publicLinks[fileKey];
    savePublicLinks();
    res.json({ message: 'File made private' });
  } else {
    res.json({ message: 'File was already private' });
  }
});

// Check if file is public
app.get('/api/files/:filename/public-status', checkPermission('main'), (req, res) => {
  const filename = req.params.filename;
  const folder = req.query.folder || '';
  const fileKey = folder ? `${folder}/${filename}` : filename;
  
  const isPublic = !!publicLinks[fileKey];
  res.json({ isPublic, publicLink: isPublic ? (folder ? `/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}` : `/${encodeURIComponent(filename)}`) : null });
});

// Bulk delete files
app.post('/api/bulk-delete', checkPermission('main'), async (req, res) => {
  try {
    const { files, folder = '' } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Files array is required' });
    }
    
    const folderPath = folder ? path.join(config.STORAGE_PATH, folder) : config.STORAGE_PATH;
    const results = [];
    
    for (const filename of files) {
      const filePath = path.join(folderPath, filename);
      
      if (fs.existsSync(filePath)) {
        try {
          await fs.unlink(filePath);
          results.push({ filename, status: 'deleted' });
        } catch (error) {
          results.push({ filename, status: 'error', error: error.message });
        }
      } else {
        results.push({ filename, status: 'not_found' });
      }
    }
    
    res.json({ 
      message: 'Bulk delete completed',
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Bulk archive files and folders
app.post('/api/bulk-archive', checkPermission('main'), async (req, res) => {
  try {
    const { files = [], folders = [], folder = '', archiveName } = req.body;
    
    if ((!files || files.length === 0) && (!folders || folders.length === 0)) {
      return res.status(400).json({ error: 'Files or folders array is required' });
    }
    
    const folderPath = folder ? path.join(config.STORAGE_PATH, folder) : config.STORAGE_PATH;
    
    // Use custom name or generate default
    let finalArchiveName;
    if (archiveName && archiveName.trim()) {
      const cleanName = archiveName.trim().replace(/[^a-zA-Z0-9а-яА-Я\s\-_]/g, '');
      finalArchiveName = cleanName.endsWith('.zip') ? cleanName : `${cleanName}.zip`;
    } else {
      finalArchiveName = `archive_${Date.now()}.zip`;
    }
    
    const archivePath = path.join(folderPath, finalArchiveName);
    
    // Create archive
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      res.json({
        message: 'Archive created successfully',
        archiveName: finalArchiveName,
        size: archive.pointer()
      });
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    
    // Add files to archive
    for (const filename of files) {
      const filePath = path.join(folderPath, filename);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: filename });
      }
    }
    
    // Add folders to archive
    for (const folderName of folders) {
      const folderFullPath = path.join(folderPath, folderName);
      if (fs.existsSync(folderFullPath)) {
        archive.directory(folderFullPath, folderName);
      }
    }
    
    await archive.finalize();
  } catch (error) {
    res.status(500).json({ error: 'Archive creation failed: ' + error.message });
  }
});

// Bulk unarchive files
app.post('/api/bulk-unarchive', checkPermission('main'), async (req, res) => {
  try {
    const { files, folder = '' } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Files array is required' });
    }
    
    const folderPath = folder ? path.join(config.STORAGE_PATH, folder) : config.STORAGE_PATH;
    const results = [];
    
    for (const filename of files) {
      const filePath = path.join(folderPath, filename);
      
      if (fs.existsSync(filePath) && path.extname(filename).toLowerCase() === '.zip') {
        try {
          await new Promise((resolve, reject) => {
            yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
              if (err) return reject(err);
              
              zipfile.readEntry();
              zipfile.on('entry', (entry) => {
                if (/\/$/.test(entry.fileName)) {
                  // Directory entry
                  zipfile.readEntry();
                } else {
                  // File entry
                  zipfile.openReadStream(entry, (err, readStream) => {
                    if (err) return reject(err);
                    
                    const extractPath = path.join(folderPath, entry.fileName);
                    const extractDir = path.dirname(extractPath);
                    
                    fs.ensureDirSync(extractDir);
                    
                    const writeStream = fs.createWriteStream(extractPath);
                    readStream.pipe(writeStream);
                    
                    writeStream.on('close', () => {
                      zipfile.readEntry();
                    });
                  });
                }
              });
              
              zipfile.on('end', () => {
                results.push({ filename, status: 'extracted' });
                resolve();
              });
            });
          });
        } catch (error) {
          results.push({ filename, status: 'error', error: error.message });
        }
      } else {
        results.push({ filename, status: 'not_found_or_not_zip' });
      }
    }
    
    res.json({
      message: 'Bulk unarchive completed',
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Bulk unarchive failed: ' + error.message });
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

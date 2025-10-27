class xCloudStorage {
    constructor() {
        this.apiKey = '';
        this.files = [];
        this.folders = [];
        this.currentFolder = '';
        this.version = '1.5.1'; // Application version
        this.selectedFiles = new Set(); // Track selected files
        this.selectedFolders = new Set(); // Track selected folders
        this.currentTextSearch = ''; // Current text search
        this.iconCache = new Map(); // Cache for file icons
        this.sizeCache = new Map(); // Cache for file sizes
        this.searchTimeout = null; // Timer for search debounce
        this.statsCache = null; // Cache for statistics
        this.breadcrumbCache = null; // Cache for breadcrumb
        this.publicStatusCache = new Map(); // Cache for public file status
        this.apiCache = new Map(); // Cache for API responses
        this.elementCache = new Map(); // Cache for DOM elements
        this.globalStats = null; // Global storage statistics
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    checkAuthStatus() {
        const stored = localStorage.getItem('xcloud_api_key');
        if (stored && stored.trim() !== '') {
            this.apiKey = stored;
            // Check if API key actually works
            this.verifyApiKey(stored);
        } else {
            this.showLoginScreen();
        }
    }

    async verifyApiKey(apiKey) {
        try {
            const response = await fetch('/api/health', {
                headers: {
                    'X-API-Key': apiKey
                }
            });

            if (response.ok) {
                this.showMainContent();
                this.loadFiles();
                this.loadGlobalStats(); // Load global stats on startup
            } else {
                // API key doesn't work, clear localStorage
                localStorage.removeItem('xcloud_api_key');
                this.showLoginScreen();
            }
        } catch (error) {
            // Network error, clear localStorage
            localStorage.removeItem('xcloud_api_key');
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.authenticate();
            });
        }

        // Login input Enter key
        const loginApiKey = document.getElementById('loginApiKey');
        if (loginApiKey) {
            loginApiKey.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.authenticate();
                }
            });
        }

        // Upload button
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.openUploadModal();
            });
        }

        // Create folder button
        const createFolderBtn = document.getElementById('createFolderBtn');
        if (createFolderBtn) {
            createFolderBtn.addEventListener('click', () => {
                this.openCreateFolderModal();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadFiles(true); // Force refresh
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Home logo click
        const homeLogo = document.getElementById('homeLogo');
        if (homeLogo) {
            homeLogo.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToHome();
            });
        }

        // Modal controls
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeUploadModal();
            });
        }

        const cancelUpload = document.getElementById('cancelUpload');
        if (cancelUpload) {
            cancelUpload.addEventListener('click', () => {
                this.closeUploadModal();
            });
        }

        // Create folder modal controls
        const closeFolderModal = document.getElementById('closeFolderModal');
        if (closeFolderModal) {
            closeFolderModal.addEventListener('click', () => {
                this.closeCreateFolderModal();
            });
        }

        const cancelCreateFolder = document.getElementById('cancelCreateFolder');
        if (cancelCreateFolder) {
            cancelCreateFolder.addEventListener('click', () => {
                this.closeCreateFolderModal();
            });
        }

        const createFolder = document.getElementById('createFolder');
        if (createFolder) {
            createFolder.addEventListener('click', () => {
                this.createFolder();
            });
        }

        // Folder name input Enter key
        const folderName = document.getElementById('folderName');
        if (folderName) {
            folderName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.createFolder();
                }
            });
        }

        // Delete modal controls
        const closeDeleteModal = document.getElementById('closeDeleteModal');
        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        const cancelDelete = document.getElementById('cancelDelete');
        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        const confirmDelete = document.getElementById('confirmDelete');
        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => {
                this.confirmDelete();
            });
        }

        // Bulk delete modal controls
        const closeBulkDeleteModal = document.getElementById('closeBulkDeleteModal');
        if (closeBulkDeleteModal) {
            closeBulkDeleteModal.addEventListener('click', () => {
                this.closeBulkDeleteModal();
            });
        }

        const cancelBulkDelete = document.getElementById('cancelBulkDelete');
        if (cancelBulkDelete) {
            cancelBulkDelete.addEventListener('click', () => {
                this.closeBulkDeleteModal();
            });
        }

        const confirmBulkDelete = document.getElementById('confirmBulkDelete');
        if (confirmBulkDelete) {
            confirmBulkDelete.addEventListener('click', () => {
                this.confirmBulkDelete();
            });
        }

        // Archive name modal controls
        const closeArchiveNameModal = document.getElementById('closeArchiveNameModal');
        if (closeArchiveNameModal) {
            closeArchiveNameModal.addEventListener('click', () => {
                this.closeArchiveNameModal();
            });
        }

        const cancelArchiveName = document.getElementById('cancelArchiveName');
        if (cancelArchiveName) {
            cancelArchiveName.addEventListener('click', () => {
                this.closeArchiveNameModal();
            });
        }

        const confirmArchiveName = document.getElementById('confirmArchiveName');
        if (confirmArchiveName) {
            confirmArchiveName.addEventListener('click', () => {
                this.confirmArchiveName();
            });
        }

        // Archive name input Enter key
        const archiveName = document.getElementById('archiveName');
        if (archiveName) {
            archiveName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.confirmArchiveName();
                }
            });
        }

        // File input and drag & drop
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (uploadArea && fileInput) {
            // Only click on uploadArea opens file explorer
            uploadArea.addEventListener('click', (e) => {
                // Check that click is not on fileInput itself
                if (e.target !== fileInput) {
                    fileInput.click();
                }
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }

        // Drag and drop
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                this.handleFileSelect(e.dataTransfer.files);
            });
        }

        // Upload start
        const startUpload = document.getElementById('startUpload');
        if (startUpload) {
            startUpload.addEventListener('click', () => {
                this.startUpload();
            });
        }

        // Text search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleTextSearch(e.target.value.trim());
            });
        }

        // Date search functionality
        const searchByDateBtn = document.getElementById('searchByDateBtn');
        if (searchByDateBtn) {
            searchByDateBtn.addEventListener('click', () => {
                this.handleDateSearch();
            });
        }

        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearAllSearches();
            });
        }

        // Date search input Enter key
        const dateSearchInput = document.getElementById('dateSearchInput');
        if (dateSearchInput) {
            dateSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleDateSearch();
                }
            });
        }

        // Bulk action buttons
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                this.bulkDelete();
            });
        }

        const bulkArchiveBtn = document.getElementById('bulkArchiveBtn');
        if (bulkArchiveBtn) {
            bulkArchiveBtn.addEventListener('click', () => {
                this.bulkArchive();
            });
        }

        const bulkUnarchiveBtn = document.getElementById('bulkUnarchiveBtn');
        if (bulkUnarchiveBtn) {
            bulkUnarchiveBtn.addEventListener('click', () => {
                this.bulkUnarchive();
            });
        }

        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAll();
            });
        }

        // Close modal on outside click
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal) {
            uploadModal.addEventListener('click', (e) => {
                if (e.target.id === 'uploadModal') {
                    this.closeUploadModal();
                }
            });
        }

        // File actions (download/delete/link) - use event delegation (optimized)
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.addEventListener('click', (e) => {
                // Cache elements for better performance
                const downloadBtn = e.target.closest('.download-btn');
                const deleteBtn = e.target.closest('.delete-btn');
                const copyBtn = e.target.closest('.copy-link-btn');
                const unarchiveBtn = e.target.closest('.unarchive-btn');
                const slider = e.target.closest('.public-slider');
                const checkbox = e.target.closest('.file-select-checkbox');
                const folderItem = e.target.closest('.folder-item');
                
                if (downloadBtn) {
                    const filename = downloadBtn.dataset.filename;
                    this.downloadFile(filename);
                } else if (deleteBtn) {
                    const filename = deleteBtn.dataset.filename;
                    const folderName = deleteBtn.dataset.folder;
                    
                    if (filename) {
                        this.deleteFile(filename);
                    } else if (folderName) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.deleteFolder(folderName);
                    }
                } else if (copyBtn) {
                    const filename = copyBtn.dataset.filename;
                    this.copyPublicLink(filename);
                } else if (unarchiveBtn) {
                    const filename = unarchiveBtn.dataset.filename;
                    this.unarchiveFile(filename);
                } else if (slider) {
                    const filename = slider.dataset.filename;
                    const isPublic = e.target.checked;
                    if (isPublic) {
                        this.makeFilePublic(filename);
                    } else {
                        this.makeFilePrivate(filename);
                    }
                } else if (checkbox) {
                    const filename = e.target.dataset.filename;
                    const folder = e.target.dataset.folder;
                    const isChecked = e.target.checked;
                    
                    if (filename) {
                        this.toggleFileSelection(filename, isChecked);
                    } else if (folder) {
                        this.toggleFolderSelection(folder, isChecked);
                    }
                } else if (folderItem && !deleteBtn && !checkbox && !e.target.closest('.file-checkbox')) {
                    const folderName = folderItem.dataset.folder;
                    this.navigateToFolder(folderName);
                }
            });
        }

        // Breadcrumb navigation (optimized)
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.addEventListener('click', (e) => {
                const breadcrumbItem = e.target.closest('.breadcrumb-item');
                if (breadcrumbItem) {
                    const folder = breadcrumbItem.dataset.folder;
                    this.navigateToFolder(folder, true); // true indicates absolute path from breadcrumb
                }
            });
        }
    }


    async authenticate() {
        const apiKeyInput = document.getElementById('loginApiKey');
        this.apiKey = apiKeyInput.value.trim();

        if (!this.apiKey) {
            this.showToast('Enter API key', 'error');
            return;
        }

        try {
            const response = await fetch('/api/health', {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                // Save API key only if it works
                localStorage.setItem('xcloud_api_key', this.apiKey);
                this.showToast('Login successful', 'success');
                this.showMainContent();
                this.loadFiles();
                this.loadGlobalStats(); // Load global stats after login
            } else {
                // Clear localStorage on invalid key
                localStorage.removeItem('xcloud_api_key');
                throw new Error('Invalid API key');
            }
        } catch (error) {
            // Clear localStorage on error
            localStorage.removeItem('xcloud_api_key');
            this.showToast('Login error: ' + error.message, 'error');
        }
    }

    async loadFiles(forceRefresh = false) {
        if (!this.apiKey) return;

        this.showLoading(true);

        try {
            const url = this.currentFolder ? 
                `/api/files?folder=${encodeURIComponent(this.currentFolder)}` : 
                '/api/files';
            
            // Check API cache only if not force refresh
            const cacheKey = url;
            if (!forceRefresh && this.apiCache.has(cacheKey)) {
                const cachedData = this.apiCache.get(cacheKey);
                this.files = cachedData.files || [];
                this.folders = cachedData.folders || [];
                this.currentFolder = cachedData.currentFolder || '';
                this.renderFiles();
                this.updateBreadcrumb();
                this.loadPublicStatus();
                this.loadGlobalStats(); // Load global stats
                this.showLoading(false);
                return;
            }
            
            const response = await fetch(url, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.files = data.files || [];
                this.folders = data.folders || [];
                this.currentFolder = data.currentFolder || '';
                
                // Save to cache
                this.apiCache.set(cacheKey, data);
                
                this.renderFiles();
                this.updateBreadcrumb();
                this.loadPublicStatus();
                this.loadGlobalStats(); // Load global stats
            } else {
                throw new Error('Failed to load files');
            }
        } catch (error) {
            this.showToast('Failed to load files: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderFiles() {
        const fileList = document.getElementById('fileList');
        
        if (this.files.length === 0 && this.folders.length === 0) {
            fileList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <h3>No files</h3>
                    <p>Upload your first file to get started</p>
                </div>
            `;
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Sort folders alphabetically
        const sortedFolders = [...this.folders].sort((a, b) => a.name.localeCompare(b.name));
        // Sort files alphabetically
        const sortedFiles = [...this.files].sort((a, b) => {
            const nameA = a.displayName || a.name;
            const nameB = b.displayName || b.name;
            return nameA.localeCompare(nameB);
        });

        // Create elements directly in fragment
        sortedFolders.forEach(folder => {
            const folderElement = this.createFolderItem(folder);
            fragment.appendChild(folderElement);
        });
        
        sortedFiles.forEach(file => {
            const fileElement = this.createFileItem(file);
            fragment.appendChild(fileElement);
        });
        
        // Single DOM update
        fileList.innerHTML = '';
        fileList.appendChild(fragment);
    }

    createFolderItem(folder) {
        const createdDate = new Date(folder.created).toLocaleDateString('ru-RU');
        
        const folderDiv = document.createElement('div');
        folderDiv.className = 'file-item folder-item';
        folderDiv.dataset.folder = folder.name;
        
        folderDiv.innerHTML = `
            <div class="file-checkbox">
                <input type="checkbox" class="file-select-checkbox" data-folder="${folder.name}" id="select-folder-${folder.name}">
                <label for="select-folder-${folder.name}" class="checkbox-label"></label>
            </div>
            <div class="file-icon folder">
                <i class="fas fa-folder"></i>
            </div>
            <div class="file-info">
                <div class="file-name" title="${folder.name}">${folder.name}</div>
                <div class="file-meta">
                    <span>Folder</span>
                    <span>${createdDate}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="file-action danger delete-btn" data-folder="${folder.name}" title="Delete Folder">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return folderDiv;
    }

    createFileItem(file) {
        const displayName = file.displayName || file.name;
        const fileIcon = this.getFileIcon(displayName);
        const fileSize = this.formatFileSize(file.size);
        const uploadTime = file.uploadTime ? new Date(file.uploadTime).toLocaleString('en-US') : new Date(file.created).toLocaleString('en-US');
        
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.dataset.filename = file.name;
        
        fileDiv.innerHTML = `
            <div class="file-checkbox">
                <input type="checkbox" class="file-select-checkbox" data-filename="${file.name}" id="select-${file.name}">
                <label for="select-${file.name}" class="checkbox-label"></label>
            </div>
            <div class="file-icon ${fileIcon.class}">
                <i class="${fileIcon.icon}"></i>
            </div>
            <div class="file-info">
                <div class="file-name" title="${displayName}">${displayName}</div>
                <div class="file-meta">
                    <span>${fileSize} • Uploaded: ${uploadTime}</span>
                </div>
            </div>
            <div class="file-actions">
                <div class="file-controls">
                    ${this.isArchiveFile(displayName) ? `
                    <button class="file-action unarchive-btn" data-filename="${file.name}" title="Extract Archive">
                        <i class="fas fa-file-archive"></i>
                    </button>
                    ` : ''}
                    <div class="public-toggle">
                        <input type="checkbox" id="public-${file.name}" class="public-slider" data-filename="${file.name}">
                        <label for="public-${file.name}" class="slider-label">
                            <span class="slider-text">Private</span>
                        </label>
                    </div>
                    <button class="file-action copy-link-btn" data-filename="${file.name}" title="Copy Link" disabled>
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="file-buttons">
                    <button class="file-action download-btn" data-filename="${file.name}" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-action danger delete-btn" data-filename="${file.name}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        return fileDiv;
    }

    getFileIcon(filename) {
        // Check cache
        if (this.iconCache.has(filename)) {
            return this.iconCache.get(filename);
        }
        
        const ext = filename.split('.').pop().toLowerCase();
        
        const iconMap = {
            // Documents
            'pdf': { icon: 'fas fa-file-pdf', class: 'pdf' },
            'doc': { icon: 'fas fa-file-word', class: 'document' },
            'docx': { icon: 'fas fa-file-word', class: 'document' },
            'txt': { icon: 'fas fa-file-alt', class: 'document' },
            'rtf': { icon: 'fas fa-file-alt', class: 'document' },
            
            // Images
            'jpg': { icon: 'fas fa-file-image', class: 'image' },
            'jpeg': { icon: 'fas fa-file-image', class: 'image' },
            'png': { icon: 'fas fa-file-image', class: 'image' },
            'gif': { icon: 'fas fa-file-image', class: 'image' },
            'svg': { icon: 'fas fa-file-image', class: 'image' },
            'webp': { icon: 'fas fa-file-image', class: 'image' },
            
            // Videos
            'mp4': { icon: 'fas fa-file-video', class: 'video' },
            'avi': { icon: 'fas fa-file-video', class: 'video' },
            'mov': { icon: 'fas fa-file-video', class: 'video' },
            'wmv': { icon: 'fas fa-file-video', class: 'video' },
            'mkv': { icon: 'fas fa-file-video', class: 'video' },
            
            // Audio
            'mp3': { icon: 'fas fa-file-audio', class: 'audio' },
            'wav': { icon: 'fas fa-file-audio', class: 'audio' },
            'flac': { icon: 'fas fa-file-audio', class: 'audio' },
            'aac': { icon: 'fas fa-file-audio', class: 'audio' },
            
            // Archives
            'zip': { icon: 'fas fa-file-archive', class: 'archive' },
            'rar': { icon: 'fas fa-file-archive', class: 'archive' },
            '7z': { icon: 'fas fa-file-archive', class: 'archive' },
            'tar': { icon: 'fas fa-file-archive', class: 'archive' },
            'gz': { icon: 'fas fa-file-archive', class: 'archive' },
            
            // Code
            'js': { icon: 'fas fa-file-code', class: 'code' },
            'html': { icon: 'fas fa-file-code', class: 'code' },
            'css': { icon: 'fas fa-file-code', class: 'code' },
            'php': { icon: 'fas fa-file-code', class: 'code' },
            'py': { icon: 'fas fa-file-code', class: 'code' },
            'json': { icon: 'fas fa-file-code', class: 'code' },
        };
        
        const result = iconMap[ext] || { icon: 'fas fa-file', class: 'default' };
        
        // Save to cache
        this.iconCache.set(filename, result);
        
        return result;
    }

    isArchiveFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
    }

    formatFileSize(bytes) {
        // Check cache
        if (this.sizeCache.has(bytes)) {
            return this.sizeCache.get(bytes);
        }
        
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const result = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        
        // Save to cache
        this.sizeCache.set(bytes, result);
        
        return result;
    }


    async loadGlobalStats() {
        try {
            const response = await fetch('/api/stats', {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.globalStats = data;
                this.updateBreadcrumb();
            }
        } catch (error) {
            console.error('Failed to load global stats:', error);
        }
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const folderParts = this.currentFolder ? this.currentFolder.split('/') : [];
        
        // Check cache breadcrumb
        const cacheKey = this.currentFolder;
        if (this.breadcrumbCache && this.breadcrumbCache.key === cacheKey) {
            return; // Breadcrumb hasn't changed
        }
        
        let pathHtml = '<button class="breadcrumb-item" data-folder=""><i class="fas fa-home"></i><span>Root</span></button>';
        
        // Limit depth to 5 folders
        const maxDepth = 5;
        
        // If more than 5 folders - show only Root
        if (folderParts.length > maxDepth) {
            pathHtml = '<button class="breadcrumb-item" data-folder=""><i class="fas fa-home"></i><span>Root</span></button>';
        } else {
            // Show path up to 5 folders
            let currentPath = '';
            folderParts.forEach((part, index) => {
                currentPath += (currentPath ? '/' : '') + part;
                pathHtml += `<span class="breadcrumb-separator">/</span><button class="breadcrumb-item" data-folder="${currentPath}"><i class="fas fa-folder"></i><span>${part}</span></button>`;
            });
        }
        
        // Use global stats if available, otherwise use local stats
        const totalFiles = this.globalStats ? this.globalStats.totalFiles : this.files.length;
        const totalSize = this.globalStats ? this.globalStats.totalSize : this.files.reduce((sum, file) => sum + file.size, 0);
        const lastUpdate = new Date().toLocaleTimeString('en-US');
        
        // Calculate storage usage (assuming 300GB total)
        const totalStorageGB = 300;
        const usedStorageGB = totalSize / (1024 * 1024 * 1024);
        const storageUsage = `${this.formatFileSize(totalSize)} из ${totalStorageGB} GB`;
        
        const html = `
            <div class="breadcrumb-path">
                ${pathHtml}
            </div>
            <div class="breadcrumb-stats">
                <div class="stat-item">
                    <i class="fas fa-folder stat-icon"></i>
                    <div class="stat-content">
                        <span class="stat-value" id="totalFiles">${totalFiles}</span>
                        <span class="stat-label">Files</span>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-hdd stat-icon"></i>
                    <div class="stat-content">
                        <span class="stat-value" id="totalSize">${storageUsage}</span>
                        <span class="stat-label">Storage</span>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-clock stat-icon"></i>
                    <div class="stat-content">
                        <span class="stat-value" id="lastUpdate">${lastUpdate}</span>
                        <span class="stat-label">Updated</span>
                    </div>
                </div>
            </div>
        `;
        
        // Update cache
        this.breadcrumbCache = {
            key: cacheKey,
            html: html
        };
        
        breadcrumb.innerHTML = html;
    }

    navigateToFolder(folderName, isAbsolutePath = false) {
        // If this is navigation from breadcrumb - use passed path as absolute path
        // If this is navigation from folder - add to current path
        if (folderName === '') {
            this.currentFolder = '';
        } else if (isAbsolutePath) {
            // Breadcrumb navigation - use the path directly
            this.currentFolder = folderName;
        } else if (this.currentFolder === '') {
            this.currentFolder = folderName;
        } else {
            this.currentFolder = this.currentFolder + '/' + folderName;
        }
        this.loadFiles(true); // Force refresh on navigation
    }

    navigateToHome() {
        this.currentFolder = '';
        this.loadFiles(true); // Force refresh on navigation
    }

    openCreateFolderModal() {
        if (!this.apiKey) {
            this.showToast('Please login first', 'error');
            return;
        }

        const modal = document.getElementById('createFolderModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            document.getElementById('folderName').focus();
        }
    }

    closeCreateFolderModal() {
        document.getElementById('createFolderModal').classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('folderName').value = '';
    }

    async createFolder() {
        const folderName = document.getElementById('folderName').value.trim();
        
        if (!folderName) {
            this.showToast('Enter folder name', 'error');
            return;
        }

        try {
            const response = await fetch('/api/folders', {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: folderName,
                    parentFolder: this.currentFolder
                })
            });

            if (response.ok) {
                this.showToast('Folder created successfully', 'success');
                this.closeCreateFolderModal();
                this.loadFiles(true); // Force refresh after creation
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create folder');
            }
        } catch (error) {
            this.showToast('Create folder error: ' + error.message, 'error');
        }
    }


    async makeFilePublic(filename) {
        try {
            const url = this.currentFolder ? 
                `/api/files/${encodeURIComponent(filename)}/make-public?folder=${encodeURIComponent(this.currentFolder)}` : 
                `/api/files/${encodeURIComponent(filename)}/make-public`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                this.showToast('File made public', 'success');
                this.updateFilePublicStatus(filename, true);
            } else {
                throw new Error('Failed to make file public');
            }
        } catch (error) {
            this.showToast('Error making file public: ' + error.message, 'error');
            // Reset slider if failed
            const slider = document.querySelector(`#public-${filename}`);
            if (slider) slider.checked = false;
        }
    }

    async copyPublicLink(filename) {
        try {
            const url = this.currentFolder ? 
                `/api/files/${encodeURIComponent(filename)}/public-status?folder=${encodeURIComponent(this.currentFolder)}` : 
                `/api/files/${encodeURIComponent(filename)}/public-status`;
            
            const response = await fetch(url, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.isPublic && data.publicLink) {
                    const baseUrl = window.location.origin;
                    const link = `${baseUrl}${data.publicLink}`;
                    
                    navigator.clipboard.writeText(link).then(() => {
                        this.showToast('Link copied to clipboard', 'success');
                    }).catch(() => {
                        prompt('Public link (copy this):', link);
                    });
                } else {
                    this.showToast('File is not public', 'error');
                }
            } else {
                throw new Error('Failed to get public status');
            }
        } catch (error) {
            this.showToast('Error copying link: ' + error.message, 'error');
        }
    }

    async makeFilePrivate(filename) {
        try {
            const url = this.currentFolder ? 
                `/api/files/${encodeURIComponent(filename)}/make-private?folder=${encodeURIComponent(this.currentFolder)}` : 
                `/api/files/${encodeURIComponent(filename)}/make-private`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                this.showToast('File made private', 'success');
                this.updateFilePublicStatus(filename, false);
            } else {
                throw new Error('Failed to make file private');
            }
        } catch (error) {
            this.showToast('Error making file private: ' + error.message, 'error');
        }
    }

    async loadPublicStatus() {
        // Load public status for all files with caching
        const promises = this.files.map(async (file) => {
            // Check cache
            const cacheKey = `${file.name}-${this.currentFolder}`;
            if (this.publicStatusCache.has(cacheKey)) {
                this.updateFilePublicStatus(file.name, this.publicStatusCache.get(cacheKey));
                return;
            }
            
            try {
                const url = this.currentFolder ? 
                    `/api/files/${encodeURIComponent(file.name)}/public-status?folder=${encodeURIComponent(this.currentFolder)}` : 
                    `/api/files/${encodeURIComponent(file.name)}/public-status`;
                
                const response = await fetch(url, {
                    headers: {
                        'X-API-Key': this.apiKey
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Save to cache
                    this.publicStatusCache.set(cacheKey, data.isPublic);
                    this.updateFilePublicStatus(file.name, data.isPublic);
                }
            } catch (error) {
                // Silent fail for public status
            }
        });
        
        // Execute all requests in parallel
        await Promise.all(promises);
    }

    async updateFilePublicStatus(filename, isPublic) {
        // Update the slider and copy button based on public status
        const fileItem = document.querySelector(`[data-filename="${filename}"]`);
        if (fileItem) {
            const slider = fileItem.querySelector('.public-slider');
            const copyBtn = fileItem.querySelector('.copy-link-btn');
            const sliderText = fileItem.querySelector('.slider-text');
            
            if (slider) {
                slider.checked = isPublic;
            }
            
            if (copyBtn) {
                copyBtn.disabled = !isPublic;
                if (isPublic) {
                    copyBtn.classList.add('active');
                    copyBtn.title = 'Copy Public Link';
                } else {
                    copyBtn.classList.remove('active');
                    copyBtn.title = 'File is private';
                }
            }
            
            if (sliderText) {
                sliderText.textContent = isPublic ? 'Public' : 'Private';
            }
        }
        
        // Update cache
        const cacheKey = `${filename}-${this.currentFolder}`;
        this.publicStatusCache.set(cacheKey, isPublic);
    }

    // ===== OPTIMIZED SEARCH LOGIC =====
    
    // 1. Поиск по тексту (работает сразу с debounce)
    handleTextSearch(searchTerm) {
        this.currentTextSearch = searchTerm;
        
        // Очищаем предыдущий таймер
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Устанавливаем новый таймер для debounce (300ms)
        this.searchTimeout = setTimeout(() => {
            if (searchTerm === '') {
                this.showAllFiles();
            } else {
                this.filterFilesByName(searchTerm);
            }
        }, 300);
    }
    
    // 2. Поиск по дате (с кнопкой)
    handleDateSearch() {
        const dateInput = document.getElementById('dateSearchInput');
        const date = dateInput.value;
        
        if (!date) {
            this.showToast('Выберите дату для поиска', 'error');
            return;
        }
        
        this.searchByDate(date);
    }
    
    // 3. Комбинированный поиск
    async searchByDate(date) {
        this.showLoading(true);
        
        try {
            let url = `/api/files/search?date=${encodeURIComponent(date)}`;
            if (this.currentFolder) {
                url += `&folder=${encodeURIComponent(this.currentFolder)}`;
            }
            
            // Check cache поиска
            const cacheKey = url;
            if (this.apiCache.has(cacheKey)) {
                const cachedData = this.apiCache.get(cacheKey);
                this.files = cachedData.files || [];
                this.folders = cachedData.folders || [];
                this.renderFiles();
                this.updateStats();
                
                // Применяем текстовый поиск если есть
                if (this.currentTextSearch) {
                    this.filterFilesByName(this.currentTextSearch);
                }
                
                const dateStr = new Date(date).toLocaleDateString('ru-RU');
                this.showToast(`Найдено ${this.files.length} файлов за ${dateStr}`, 'info');
                this.showLoading(false);
                return;
            }
            
            const response = await fetch(url, {
                headers: { 'X-API-Key': this.apiKey }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.files = data.files || [];
                this.folders = data.folders || [];
                
                // Save to cache
                this.apiCache.set(cacheKey, data);
                
                this.renderFiles();
                this.updateStats();
                
                // Применяем текстовый поиск если есть
                if (this.currentTextSearch) {
                    this.filterFilesByName(this.currentTextSearch);
                }
                
                const dateStr = new Date(date).toLocaleDateString('ru-RU');
                this.showToast(`Найдено ${this.files.length} файлов за ${dateStr}`, 'info');
            } else {
                throw new Error('Failed to search files');
            }
        } catch (error) {
            this.showToast('Search error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // 4. Фильтрация по имени файла (оптимизированная)
    filterFilesByName(searchTerm) {
        const fileItems = document.querySelectorAll('.file-item');
        const term = searchTerm.toLowerCase();
        
        // Используем requestAnimationFrame для плавной анимации
        requestAnimationFrame(() => {
            fileItems.forEach(item => {
                const filename = item.dataset.filename ? item.dataset.filename.toLowerCase() : '';
                const displayNameElement = item.querySelector('.file-name');
                const displayName = displayNameElement ? displayNameElement.textContent.toLowerCase() : '';
                
                const isVisible = filename.includes(term) || displayName.includes(term);
                
                if (isVisible) {
                    item.style.setProperty('display', 'flex', 'important');
                } else {
                    item.style.setProperty('display', 'none', 'important');
                }
            });
        });
    }
    
    // 5. Показать все файлы (оптимизированная)
    showAllFiles() {
        const fileItems = document.querySelectorAll('.file-item');
        
        // Используем requestAnimationFrame для плавной анимации
        requestAnimationFrame(() => {
            fileItems.forEach(item => {
                item.style.setProperty('display', 'flex', 'important');
            });
        });
    }
    
    // 6. Очистить все поиски
    clearAllSearches() {
        // Очищаем таймер поиска
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Очищаем кэши
        this.iconCache.clear();
        this.sizeCache.clear();
        this.publicStatusCache.clear();
        this.apiCache.clear();
        this.elementCache.clear();
        this.statsCache = null;
        this.breadcrumbCache = null;
        
        document.getElementById('dateSearchInput').value = '';
        document.getElementById('searchInput').value = '';
        this.currentTextSearch = '';
        this.loadFiles(true); // Принудительное обновление при очистке поиска
    }

    openUploadModal() {
        if (!this.apiKey) {
            this.showToast('Please login first', 'error');
            return;
        }

        const modal = document.getElementById('uploadModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeUploadModal() {
        document.getElementById('uploadModal').classList.remove('active');
        document.body.style.overflow = '';
        this.resetUploadForm();
    }

    resetUploadForm() {
        document.getElementById('fileInput').value = '';
        document.getElementById('startUpload').disabled = true;
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        
        // Clear stored files reference
        this.selectedFiles.clear();
        
        // Remove file info display but preserve file input
        const uploadContent = document.querySelector('.upload-content');
        if (uploadContent) {
            const fileInfo = uploadContent.querySelector('.file-info-display');
            if (fileInfo) {
                fileInfo.remove();
            }
            
            // Restore original content if it was replaced
            if (!uploadContent.querySelector('i.fa-cloud-upload-alt')) {
                uploadContent.innerHTML = `
                    <i class="fas fa-cloud-upload-alt"></i>
                    <h4>Drag files here</h4>
                    <p>or click to select multiple files</p>
                `;
            }
        }
    }

    handleFileSelect(files) {
        if (files.length === 0) return;

        // Convert FileList to Array if needed
        const filesArray = Array.from(files);
        
        // Store all selected files
        this.selectedFiles.clear();
        filesArray.forEach(file => this.selectedFiles.add(file));
        
        const startUploadBtn = document.getElementById('startUpload');
        if (startUploadBtn) {
            startUploadBtn.disabled = false;
        }
        
        // Show files info
        const uploadContent = document.querySelector('.upload-content');
        if (uploadContent) {
            // Clear previous file info
            const existingInfo = uploadContent.querySelector('.file-info-display');
            if (existingInfo) {
                existingInfo.remove();
            }
            
            // Create new content for multiple files
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info-display';
            
            if (filesArray.length === 1) {
                const file = filesArray[0];
                fileInfo.innerHTML = `
                    <i class="fas fa-file"></i>
                    <h4>${file.name}</h4>
                    <p>${this.formatFileSize(file.size)}</p>
                `;
            } else {
                const totalSize = filesArray.reduce((sum, file) => sum + file.size, 0);
                fileInfo.innerHTML = `
                    <i class="fas fa-files"></i>
                    <h4>${filesArray.length} files selected</h4>
                    <p>Total size: ${this.formatFileSize(totalSize)}</p>
                `;
            }
            
            uploadContent.appendChild(fileInfo);
        }
    }

    async startUpload() {
        const modal = document.getElementById('uploadModal');
        if (!modal || !modal.classList.contains('active')) {
            this.showToast('Upload modal is not open', 'error');
            return;
        }

        const fileInput = document.getElementById('fileInput');
        if (!fileInput) {
            this.showToast('File input not found', 'error');
            return;
        }
        
        let files = Array.from(fileInput.files);

        // Fallback: use stored files reference if fileInput doesn't have files
        if (files.length === 0 && this.selectedFiles && this.selectedFiles.size > 0) {
            files = Array.from(this.selectedFiles);
        }

        if (files.length === 0) {
            this.showToast('Select files', 'error');
            return;
        }

        // Проверяем размер каждого файла (500MB = 500 * 1024 * 1024 bytes)
        const maxSize = 500 * 1024 * 1024; // 500MB
        for (const file of files) {
            if (file.size > maxSize) {
                this.showToast(`File "${file.name}" too large. Maximum size: 500MB`, 'error');
                return;
            }
        }

        this.showUploadProgress(true);

        try {
            // Upload files sequentially to avoid overwhelming the server
            const results = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);
                if (this.currentFolder) {
                    formData.append('folder', this.currentFolder);
                }

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'X-API-Key': this.apiKey
                    },
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    results.push(result);
                } else if (response.status === 413) {
                    throw new Error(`File "${file.name}" too large. Maximum size: 500MB`);
                } else {
                    throw new Error(`Upload failed for "${file.name}"`);
                }
            }

            if (results.length === 1) {
                this.showToast(`File "${results[0].originalName}" uploaded successfully`, 'success');
            } else {
                this.showToast(`${results.length} files uploaded successfully`, 'success');
            }
            
            this.closeUploadModal();
            this.loadFiles(true); // Принудительное обновление после загрузки
        } catch (error) {
            this.showToast('Upload error: ' + error.message, 'error');
        } finally {
            this.showUploadProgress(false);
        }
    }

    showUploadProgress(show) {
        const progress = document.getElementById('uploadProgress');
        progress.style.display = show ? 'block' : 'none';
        
        if (show) {
            // Simulate progress
            let progressValue = 0;
            const interval = setInterval(() => {
                progressValue += Math.random() * 30;
                if (progressValue > 90) progressValue = 90;
                
                document.getElementById('progressFill').style.width = progressValue + '%';
                document.getElementById('progressText').textContent = Math.round(progressValue) + '%';
                
                if (progressValue >= 90) {
                    clearInterval(interval);
                }
            }, 200);
        }
    }

    async downloadFile(filename) {
        if (!this.apiKey) {
            this.showToast('Please login first', 'error');
            return;
        }

        try {
            const url = this.currentFolder ? 
                `/api/download/${filename}?folder=${encodeURIComponent(this.currentFolder)}` : 
                `/api/download/${filename}`;
            
            const response = await fetch(url, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showToast('File downloaded', 'success');
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            this.showToast('Download error: ' + error.message, 'error');
        }
    }

    deleteFile(filename) {
        this.pendingDelete = {
            type: 'file',
            name: filename
        };
        this.showDeleteModal(`Delete file "${filename}"?`, `Are you sure you want to delete the file "${filename}"?`);
    }

    deleteFolder(folderName) {
        this.pendingDelete = {
            type: 'folder',
            name: folderName
        };
        this.showDeleteModal(`Delete folder "${folderName}"?`, `Are you sure you want to delete the folder "${folderName}" and all its contents?`);
    }

    showDeleteModal(title, message) {
        document.getElementById('deleteTitle').textContent = title;
        document.getElementById('deleteMessage').textContent = message;
        document.getElementById('deleteModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('active');
        document.body.style.overflow = '';
        this.pendingDelete = null;
    }

    showBulkDeleteModal(fileCount, folderCount) {
        const modal = document.getElementById('bulkDeleteModal');
        const title = document.getElementById('bulkDeleteTitle');
        const message = document.getElementById('bulkDeleteMessage');
        
        if (fileCount > 0 && folderCount > 0) {
            title.textContent = `Delete ${fileCount} files and ${folderCount} folders?`;
            message.textContent = `Are you sure you want to delete ${fileCount} files and ${folderCount} folders?`;
        } else if (fileCount > 0) {
            title.textContent = `Delete ${fileCount} files?`;
            message.textContent = `Are you sure you want to delete ${fileCount} files?`;
        } else if (folderCount > 0) {
            title.textContent = `Delete ${folderCount} folders?`;
            message.textContent = `Are you sure you want to delete ${folderCount} folders?`;
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeBulkDeleteModal() {
        document.getElementById('bulkDeleteModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    showArchiveNameModal() {
        const modal = document.getElementById('archiveNameModal');
        const input = document.getElementById('archiveName');
        
        // Generate default name with timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '-').replace('T', '_');
        input.value = `archive_${timestamp}`;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        input.focus();
        input.select();
    }

    closeArchiveNameModal() {
        document.getElementById('archiveNameModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    async confirmArchiveName() {
        const archiveName = document.getElementById('archiveName').value.trim();
        
        if (!archiveName) {
            this.showToast('Enter archive name', 'error');
            return;
        }

        this.closeArchiveNameModal();

        const fileList = Array.from(this.selectedFiles);
        const folderList = Array.from(this.selectedFolders);
        
        try {
            const response = await fetch('/api/bulk-archive', {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: fileList,
                    folders: folderList,
                    folder: this.currentFolder,
                    archiveName: archiveName
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast(`Archive "${result.archiveName}" created successfully`, 'success');
                this.selectedFiles.clear();
                this.selectedFolders.clear();
                this.updateBulkActions();
                this.loadFiles(true); // Force refresh after creation архива
            } else {
                throw new Error('Archive creation failed');
            }
        } catch (error) {
            this.showToast('Archive error: ' + error.message, 'error');
        }
    }

    async confirmBulkDelete() {
        this.closeBulkDeleteModal();
        
        const fileList = Array.from(this.selectedFiles);
        const folderList = Array.from(this.selectedFolders);

        try {
            // Delete files
            if (fileList.length > 0) {
                const response = await fetch('/api/bulk-delete', {
                    method: 'POST',
                    headers: {
                        'X-API-Key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        files: fileList,
                        folder: this.currentFolder
                    })
                });

                if (!response.ok) {
                    throw new Error('Bulk delete failed');
                }
            }

            // Delete folders
            for (const folderName of folderList) {
                await this.performFolderDelete(folderName);
            }

            this.showToast(`${fileList.length} files and ${folderList.length} folders deleted successfully`, 'success');
            this.selectedFiles.clear();
            this.selectedFolders.clear();
            this.updateBulkActions();
            this.loadFiles(true); // Принудительное обновление после массового удаления
        } catch (error) {
            this.showToast('Bulk delete error: ' + error.message, 'error');
        }
    }

    async confirmDelete() {
        if (!this.pendingDelete) return;

        const { type, name } = this.pendingDelete;
        this.closeDeleteModal();

        try {
            if (type === 'file') {
                await this.performFileDelete(name);
            } else if (type === 'folder') {
                await this.performFolderDelete(name);
            }
        } catch (error) {
            this.showToast('Delete error: ' + error.message, 'error');
        }
    }

    async performFileDelete(filename) {
        if (!this.apiKey) {
            this.showToast('Please login first', 'error');
            return;
        }

        const url = this.currentFolder ? 
            `/api/files/${encodeURIComponent(filename)}?folder=${encodeURIComponent(this.currentFolder)}` : 
            `/api/files/${encodeURIComponent(filename)}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'X-API-Key': this.apiKey
            }
        });

        if (response.ok) {
            this.showToast('File deleted', 'success');
            this.loadFiles(true); // Принудительное обновление после удаления
        } else {
            throw new Error('Delete failed');
        }
    }

    async performFolderDelete(folderName) {
        if (!this.apiKey) {
            this.showToast('Please login first', 'error');
            return;
        }

        try {
            const url = this.currentFolder ? 
                `/api/folders/${encodeURIComponent(folderName)}?parentFolder=${encodeURIComponent(this.currentFolder)}` : 
                `/api/folders/${encodeURIComponent(folderName)}`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                this.showToast('Folder deleted', 'success');
                this.loadFiles(true); // Force refresh после удаления
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Delete failed');
            }
        } catch (error) {
            this.showToast('Folder delete error: ' + error.message, 'error');
            throw error;
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainContent = document.getElementById('mainContent');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (mainContent) {
            mainContent.style.display = 'none';
            mainContent.classList.remove('authenticated');
        }
    }

    showMainContent() {
        const loginScreen = document.getElementById('loginScreen');
        const mainContent = document.getElementById('mainContent');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.classList.add('authenticated');
        }
    }

    logout() {
        localStorage.removeItem('xcloud_api_key');
        this.apiKey = null;
        this.files = [];
        this.showLoginScreen();
        this.showToast('Logged out', 'info');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-circle' : 
                    'fas fa-info-circle';
        
        toast.innerHTML = `
            <i class="toast-icon ${icon}"></i>
            <div class="toast-content">
                <div class="toast-title">${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    }

    // File selection methods
    toggleFileSelection(filename, isChecked) {
        if (isChecked) {
            this.selectedFiles.add(filename);
        } else {
            this.selectedFiles.delete(filename);
        }
        this.updateBulkActions();
    }

    toggleFolderSelection(folderName, isChecked) {
        if (isChecked) {
            this.selectedFolders.add(folderName);
        } else {
            this.selectedFolders.delete(folderName);
        }
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulkActions');
        const selectedCount = this.selectedFiles.size + this.selectedFolders.size;
        
        if (selectedCount > 0) {
            bulkActions.style.display = 'flex';
        } else {
            bulkActions.style.display = 'none';
        }
    }

    selectAll() {
        // Clear current selections
        this.selectedFiles.clear();
        this.selectedFolders.clear();
        
        // Select all files
        this.files.forEach(file => {
            this.selectedFiles.add(file.name);
        });
        
        // Select all folders
        this.folders.forEach(folder => {
            this.selectedFolders.add(folder.name);
        });
        
        // Update checkboxes visually
        this.updateCheckboxes();
        
        // Update bulk actions
        this.updateBulkActions();
        
        // Show toast
        const totalSelected = this.selectedFiles.size + this.selectedFolders.size;
        this.showToast(`${totalSelected} items selected`, 'success');
    }

    updateCheckboxes() {
        // Update file checkboxes
        this.selectedFiles.forEach(filename => {
            const checkbox = document.querySelector(`input[data-filename="${filename}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        // Update folder checkboxes
        this.selectedFolders.forEach(folderName => {
            const checkbox = document.querySelector(`input[data-folder="${folderName}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // Bulk operations
    async bulkDelete() {
        const totalSelected = this.selectedFiles.size + this.selectedFolders.size;
        if (totalSelected === 0) {
            this.showToast('No items selected', 'error');
            return;
        }

        const fileList = Array.from(this.selectedFiles);
        const folderList = Array.from(this.selectedFolders);
        
        // Show modal instead of confirm
        this.showBulkDeleteModal(fileList.length, folderList.length);
    }

    async bulkArchive() {
        const totalSelected = this.selectedFiles.size + this.selectedFolders.size;
        if (totalSelected === 0) {
            this.showToast('No items selected', 'error');
            return;
        }

        // Show archive name modal
        this.showArchiveNameModal();
    }

    async unarchiveFile(filename) {
        try {
            const response = await fetch('/api/bulk-unarchive', {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: [filename],
                    folder: this.currentFolder
                })
            });

            if (response.ok) {
                this.showToast(`Archive "${filename}" extracted successfully`, 'success');
                this.loadFiles(true); // Force refresh после извлечения
            } else {
                throw new Error('Extraction failed');
            }
        } catch (error) {
            this.showToast('Extraction error: ' + error.message, 'error');
        }
    }

    async bulkUnarchive() {
        if (this.selectedFiles.size === 0) {
            this.showToast('No files selected', 'error');
            return;
        }

        const fileList = Array.from(this.selectedFiles);
        
        try {
            const response = await fetch('/api/bulk-unarchive', {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: fileList,
                    folder: this.currentFolder
                })
            });

            if (response.ok) {
                this.showToast(`${fileList.length} files extracted successfully`, 'success');
                this.selectedFiles.clear();
                this.updateBulkActions();
                this.loadFiles(true); // Force refresh после массового извлечения
            } else {
                throw new Error('Extraction failed');
            }
        } catch (error) {
            this.showToast('Extraction error: ' + error.message, 'error');
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.xcloud = new xCloudStorage();
});

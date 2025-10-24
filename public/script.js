class xCloudStorage {
    constructor() {
        this.apiKey = '';
        this.files = [];
        this.folders = [];
        this.currentFolder = '';
        this.version = '1.0.232'; // Версия приложения
        console.log('xCloud Storage v' + this.version + ' initialized');
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
            // Проверяем, что API ключ действительно работает
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
            } else {
                // API ключ не работает, очищаем localStorage
                localStorage.removeItem('xcloud_api_key');
                this.showLoginScreen();
            }
        } catch (error) {
            // Ошибка сети, очищаем localStorage
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
                this.loadFiles();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
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

        // File input and drag & drop
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (uploadArea && fileInput) {
            // Только клик по uploadArea открывает проводник
            uploadArea.addEventListener('click', (e) => {
                // Проверяем, что клик не по самому fileInput
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

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterFiles(e.target.value);
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

        // File actions (download/delete/link) - use event delegation
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.addEventListener('click', (e) => {
                if (e.target.closest('.download-btn')) {
                    const filename = e.target.closest('.download-btn').dataset.filename;
                    this.downloadFile(filename);
                } else if (e.target.closest('.delete-btn')) {
                    const filename = e.target.closest('.delete-btn').dataset.filename;
                    this.deleteFile(filename);
                } else if (e.target.closest('.copy-link-btn')) {
                    const filename = e.target.closest('.copy-link-btn').dataset.filename;
                    this.copyPublicLink(filename);
                } else if (e.target.closest('.public-slider')) {
                    const filename = e.target.closest('.public-slider').dataset.filename;
                    const isPublic = e.target.checked;
                    if (isPublic) {
                        this.makeFilePublic(filename);
                    } else {
                        this.makeFilePrivate(filename);
                    }
                } else if (e.target.closest('.folder-item') && !e.target.closest('.folder-delete-btn')) {
                    const folderName = e.target.closest('.folder-item').dataset.folder;
                    this.navigateToFolder(folderName);
                } else if (e.target.closest('.folder-delete-btn')) {
                    const folderName = e.target.closest('.folder-delete-btn').dataset.folder;
                    this.deleteFolder(folderName);
                }
            });
        }

        // Breadcrumb navigation
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.addEventListener('click', (e) => {
                if (e.target.closest('.breadcrumb-item')) {
                    const folder = e.target.closest('.breadcrumb-item').dataset.folder;
                    this.navigateToFolder(folder);
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
                // Сохраняем API ключ только если он работает
                localStorage.setItem('xcloud_api_key', this.apiKey);
                this.showToast('Login successful', 'success');
                this.showMainContent();
                this.loadFiles();
            } else {
                // Очищаем localStorage при неверном ключе
                localStorage.removeItem('xcloud_api_key');
                throw new Error('Invalid API key');
            }
        } catch (error) {
            // Очищаем localStorage при ошибке
            localStorage.removeItem('xcloud_api_key');
            this.showToast('Login error: ' + error.message, 'error');
        }
    }

    async loadFiles() {
        if (!this.apiKey) return;

        this.showLoading(true);

        try {
            const url = this.currentFolder ? 
                `/api/files?folder=${encodeURIComponent(this.currentFolder)}` : 
                '/api/files';
            
            const response = await fetch(url, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Files loaded:', data.files);
                console.log('Folders loaded:', data.folders);
                this.files = data.files || [];
                this.folders = data.folders || [];
                this.currentFolder = data.currentFolder || '';
                this.renderFiles();
                this.updateBreadcrumb();
                this.updateStats();
                this.loadPublicStatus();
            } else {
                throw new Error('Failed to load files');
            }
        } catch (error) {
            console.error('Error loading files:', error);
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

        // Sort folders alphabetically
        const sortedFolders = [...this.folders].sort((a, b) => a.name.localeCompare(b.name));
        // Sort files alphabetically
        const sortedFiles = [...this.files].sort((a, b) => {
            const nameA = a.displayName || a.name;
            const nameB = b.displayName || b.name;
            return nameA.localeCompare(nameB);
        });

        const foldersHtml = sortedFolders.map(folder => this.createFolderItem(folder)).join('');
        const filesHtml = sortedFiles.map(file => this.createFileItem(file)).join('');
        
        fileList.innerHTML = foldersHtml + filesHtml;
    }

    createFolderItem(folder) {
        const createdDate = new Date(folder.created).toLocaleDateString('ru-RU');
        
        return `
            <div class="folder-item" data-folder="${folder.name}">
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
                    <div class="file-buttons">
                        <button class="file-action danger folder-delete-btn" data-folder="${folder.name}" title="Delete Folder">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createFileItem(file) {
        const displayName = file.displayName || file.name;
        const fileIcon = this.getFileIcon(displayName);
        const fileSize = this.formatFileSize(file.size);
        const createdDate = new Date(file.created).toLocaleDateString('ru-RU');
        
        return `
            <div class="file-item" data-filename="${file.name}">
                <div class="file-icon ${fileIcon.class}">
                    <i class="${fileIcon.icon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name" title="${displayName}">${displayName}</div>
                    <div class="file-meta">
                        <span>${fileSize}</span>
                        <span>${createdDate}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <div class="file-controls">
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
            </div>
        `;
    }

    getFileIcon(filename) {
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
        
        return iconMap[ext] || { icon: 'fas fa-file', class: 'default' };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateStats() {
        const totalFiles = this.files.length;
        const totalSize = this.files.reduce((sum, file) => sum + file.size, 0);
        const lastUpdate = new Date().toLocaleTimeString('ru-RU');

        document.getElementById('totalFiles').textContent = totalFiles;
        document.getElementById('totalSize').textContent = this.formatFileSize(totalSize);
        document.getElementById('lastUpdate').textContent = lastUpdate;
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const folderParts = this.currentFolder ? this.currentFolder.split('/') : [];
        
        let html = '<button class="breadcrumb-item" data-folder=""><i class="fas fa-home"></i><span>Root</span></button>';
        
        let currentPath = '';
        folderParts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            html += `<button class="breadcrumb-item" data-folder="${currentPath}"><i class="fas fa-folder"></i><span>${part}</span></button>`;
        });
        
        breadcrumb.innerHTML = html;
    }

    navigateToFolder(folderName) {
        this.currentFolder = folderName;
        this.loadFiles();
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
                this.loadFiles();
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
        // Load public status for all files
        for (const file of this.files) {
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
                    this.updateFilePublicStatus(file.name, data.isPublic);
                }
            } catch (error) {
                console.log('Failed to load public status for', file.name);
            }
        }
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
    }

    filterFiles(searchTerm) {
        const fileItems = document.querySelectorAll('.file-item');
        const term = searchTerm.toLowerCase();

        fileItems.forEach(item => {
            const filename = item.dataset.filename.toLowerCase();
            const isVisible = filename.includes(term);
            item.style.display = isVisible ? 'flex' : 'none';
        });
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
            console.log('Upload modal opened');
            
            // Ensure file input is accessible
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                console.log('File input found and accessible');
            } else {
                console.error('File input not found when opening modal');
            }
        } else {
            console.error('Upload modal not found');
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
        
        // Clear stored file reference
        this.selectedFile = null;
        
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
                    <h4>Drag file here</h4>
                    <p>or click to select</p>
                `;
            }
        }
    }

    handleFileSelect(files) {
        if (files.length === 0) return;

        const file = files[0];
        console.log('File selected:', file.name, 'Size:', file.size);
        
        // Store the file reference for later use
        this.selectedFile = file;
        
        const startUploadBtn = document.getElementById('startUpload');
        if (startUploadBtn) {
            startUploadBtn.disabled = false;
            console.log('Upload button enabled for file:', file.name);
        }
        
        // Show file info - but preserve the file input
        const uploadContent = document.querySelector('.upload-content');
        if (uploadContent) {
            // Create a new content div instead of replacing the entire content
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info-display';
            fileInfo.innerHTML = `
                <i class="fas fa-file"></i>
                <h4>${file.name}</h4>
                <p>${this.formatFileSize(file.size)}</p>
            `;
            
            // Clear previous file info and add new one
            const existingInfo = uploadContent.querySelector('.file-info-display');
            if (existingInfo) {
                existingInfo.remove();
            }
            uploadContent.appendChild(fileInfo);
        }
    }

    async startUpload() {
        console.log('startUpload called');
        
        // Debug: Check if modal is visible
        const modal = document.getElementById('uploadModal');
        if (!modal || !modal.classList.contains('active')) {
            this.showToast('Upload modal is not open', 'error');
            console.log('Modal not active');
            return;
        }

        const fileInput = document.getElementById('fileInput');
        console.log('File input element:', fileInput);
        
        if (!fileInput) {
            this.showToast('File input not found', 'error');
            console.error('File input element not found');
            console.log('Available elements:', document.querySelectorAll('input[type="file"]'));
            return;
        }
        
        console.log('File input found, files:', fileInput.files);
        let file = fileInput.files[0];

        // Fallback: use stored file reference if fileInput doesn't have files
        if (!file && this.selectedFile) {
            console.log('Using stored file reference:', this.selectedFile.name);
            file = this.selectedFile;
        }

        if (!file) {
            this.showToast('Select a file', 'error');
            console.log('No file selected');
            return;
        }

        console.log('Starting upload for file:', file.name);
        console.log('File size:', file.size, 'bytes');

        // Проверяем размер файла (500MB = 500 * 1024 * 1024 bytes)
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (file.size > maxSize) {
            this.showToast('File too large. Maximum size: 500MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (this.currentFolder) {
            formData.append('folder', this.currentFolder);
        }

        this.showUploadProgress(true);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showToast(`File "${result.originalName}" uploaded successfully`, 'success');
                this.closeUploadModal();
                this.loadFiles();
            } else if (response.status === 413) {
                throw new Error('File too large. Maximum size: 500MB');
            } else {
                throw new Error('Upload failed');
            }
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
            this.loadFiles();
        } else {
            throw new Error('Delete failed');
        }
    }

    async performFolderDelete(folderName) {
        if (!this.apiKey) {
            this.showToast('Please login first', 'error');
            return;
        }

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
            this.loadFiles();
        } else {
            throw new Error('Delete failed');
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
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.xcloud = new xCloudStorage();
});

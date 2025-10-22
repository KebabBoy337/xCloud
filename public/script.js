class xCloudStorage {
    constructor() {
        this.apiKey = '';
        this.files = [];
        this.version = '3.0'; // Версия для отладки
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

        // File input and drag & drop
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => {
                fileInput.click();
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

        // File actions (download/delete) - use event delegation
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.addEventListener('click', (e) => {
                if (e.target.closest('.download-btn')) {
                    const filename = e.target.closest('.download-btn').dataset.filename;
                    this.downloadFile(filename);
                } else if (e.target.closest('.delete-btn')) {
                    const filename = e.target.closest('.delete-btn').dataset.filename;
                    this.deleteFile(filename);
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
            const response = await fetch('/api/files', {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Files loaded:', data.files);
                this.files = data.files || [];
                this.renderFiles();
                this.updateStats();
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
        
        if (this.files.length === 0) {
            fileList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cloud-upload-alt"></i>
                            <h3>No files</h3>
                            <p>Upload your first file to get started</p>
                </div>
            `;
            return;
        }

        fileList.innerHTML = this.files.map(file => this.createFileItem(file)).join('');
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
                    <button class="file-action download-btn" data-filename="${file.name}" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-action danger delete-btn" data-filename="${file.name}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
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

        const formData = new FormData();
        formData.append('file', file);

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
            const response = await fetch(`/api/download/${filename}`, {
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

    async deleteFile(filename) {
        if (!this.apiKey) {
            this.showToast('Please login first', 'error');
            return;
        }

        if (!confirm(`Delete file "${filename}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/files/${filename}`, {
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
        } catch (error) {
            this.showToast('Delete error: ' + error.message, 'error');
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

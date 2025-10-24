# xCloud Storage v1.0.3 Stable

Modern file storage with beautiful glass interface, folder support, and public links.

## 🚀 Features

- **Modern Glass UI** - Beautiful interface in dark tones with glass effects
- **Folder Support** - Create and manage folders for organized storage
- **Public Links** - Generate permanent download links for files
- **Two-level Authorization** - Main key (full rights) and Upload key (upload only)
- **Drag & Drop** - Convenient file upload by dragging
- **Security** - Rate limiting, CORS, Helmet protection
- **Responsive Design** - Adaptive interface for all devices

## 🔑 API Keys

- **Main Key**: Full rights (upload, download, delete, view list)
- **Upload Key**: Upload files only

> ⚠️ **Important**: Change API keys in `Important_files/prod.env` before production deployment!

## 📦 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production
npm start
```

### Ubuntu Deployment

#### Option 1: Unified Manager (Recommended)
```bash
# Run the unified management script
./xcloud.sh
```

#### Option 2: Direct Deployment
```bash
# Run automatic deployment script
sudo ./deploy.sh
```

After deployment, the application will be available at `https://cloud.l0.mom`

## 📊 Management

### Unified Manager (Recommended)

Use the unified management script for all operations:

```bash
./xcloud.sh
```

**Available Operations:**
- 🚀 **Deploy** - Initial deployment
- 🔄 **Update** - Update from GitHub
- 🧹 **Cleanup** - Complete removal
- 🔄 **Restart** - Restart service (reload env)
- 📊 **Logs** - View service logs
- ⚙️ **Edit Config** - Edit prod.env
- 📈 **Status** - Check service status
- 🛑 **Stop** - Stop service
- ▶️ **Start** - Start service

### Manual Commands

```bash
sudo systemctl start xcloud     # Start service
sudo systemctl stop xcloud      # Stop service
sudo systemctl restart xcloud   # Restart service
sudo systemctl status xcloud    # Service status
sudo journalctl -u xcloud -f    # View logs
```

## 🛠 API Endpoints

### File Management
- `GET /api/files` - List files and folders (requires Main Key)
- `POST /api/upload` - Upload file (requires any key)
- `GET /api/files/:filename` - Download file (requires Main Key)
- `DELETE /api/files/:filename` - Delete file (requires Main Key)

### Folder Management
- `POST /api/folders` - Create folder (requires Main Key)
- `DELETE /api/folders/:foldername` - Delete folder (requires Main Key)

### Public Links
- `POST /api/files/:filename/make-public` - Make file public (requires Main Key)
- `POST /api/files/:filename/make-private` - Make file private (requires Main Key)
- `GET /api/files/:filename/public-status` - Check public status (requires Main Key)
- `GET /:folder/:filename` - Download public file (no auth required)
- `GET /:filename` - Download public file (no auth required)

### System
- `GET /api/health` - Health check (no auth required)

## 🔧 Configuration

### Environment Variables

Copy `example.env` to `Important_files/prod.env` and configure your settings:

```bash
mkdir -p Important_files
cp example.env Important_files/prod.env
nano Important_files/prod.env
```

Edit `Important_files/prod.env`:

```env
# API Keys (CHANGE THESE!)
MAIN_API_KEY=your_main_key_here
UPLOAD_API_KEY=your_upload_key_here

# Server Configuration
PORT=3000
NODE_ENV=production

# Storage Configuration
STORAGE_PATH=./storage
MAX_FILE_SIZE=100MB
```

> ⚠️ **Important**: Change API keys before production deployment!

## 📁 Project Structure

```
xCloud/
├── server.js              # Main server
├── config.js              # Configuration
├── package.json           # Dependencies
├── xcloud.sh              # Unified management script
├── example.env            # Environment template
├── public/                # Static files
│   ├── index.html         # Main page
│   ├── style.css          # Styles
│   ├── script.js          # JavaScript
│   └── init.js            # Initialization
├── storage/               # File storage (protected)
└── Important_files/       # Configuration files (protected)
    ├── prod.env           # Environment configuration
    └── .public_links.json # Public link states
```

## 🔒 Security

- **API Key Authorization** - All requests require valid API key
- **Rate Limiting** - Request limit (100/15min)
- **CORS Protection** - Configured CORS policies
- **Helmet** - Protection against XSS and other attacks
- **File Validation** - Size and type checking

## 🎨 Interface

- **Glass Effect** - Modern glassmorphism design
- **Dark Theme** - Beautiful dark tones with accents
- **Responsive** - Works on all devices
- **Animations** - Smooth transitions and effects
- **Notifications** - Toast notifications for feedback

## 📊 Monitoring

Logs are available in the following locations:
- Systemd logs: `journalctl -u xcloud -f`
- Nginx logs: `/var/log/nginx/`

## 🔄 Updates

### Automatic Update

To update the application from GitHub:

```bash
# Run the update script (from project directory)
sudo bash update.sh
```

This script will:
- Pull latest changes from GitHub
- Install new dependencies
- Restart all services
- Check service status

### Manual Update

```bash
cd /opt/xcloud
sudo -u xcloud git pull
sudo -u xcloud npm install --production
sudo systemctl restart xcloud
```

## 🧹 Complete Cleanup

To completely remove xCloud Storage from your system:

```bash
# Run the cleanup script
sudo ./cleanup.sh
```

This will remove:
- All systemd services and files
- Application directory and storage files
- Log files and temporary files
- Node.js modules and symlinks
- xcloud user account

⚠️ **Warning**: This will permanently delete all files and configurations!

## 📞 Support

If you encounter problems, check:
1. Service status: `sudo systemctl status xcloud`
2. Logs: `sudo journalctl -u xcloud -f`
3. Nginx configuration: `sudo nginx -t`
4. Port availability: `sudo netstat -tlnp | grep :3000`

## 📝 API Examples

### Upload a file to a folder
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "file=@document.pdf" \
  -F "folder=documents" \
  https://your-domain.com/api/upload
```

### Create a folder
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "documents"}' \
  https://your-domain.com/api/folders
```

### Make a file public
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  https://your-domain.com/api/files/document.pdf/make-public
```

### Download a public file
```bash
curl -O https://your-domain.com/documents/document.pdf
```

## 🚀 Performance

- **Systemd** - Node.js process management
- **Nginx** - Reverse proxy and static files
- **Optimization** - Compression, caching, rate limiting
- **Monitoring** - Logging and metrics

## 📈 Version History

- **1.0.3 Stable** - Clickable logo, version update, code cleanup, improved folder display, unified UI
- **1.0.233** - Code cleanup, improved folder display, unified UI
- **1.0.232** - Fixed folder styling and delete modal
- **1.0.231** - Added public link management
- **1.0.230** - Added folder support
- **1.0.228** - Initial release
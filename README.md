# xCloud Storage

Modern file storage with beautiful glass interface, folder support, and public links.

**Version:** 1.0.233

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

> ⚠️ **Important**: Change API keys in `config.js` before production deployment!

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

### Ubuntu Deployment (No PM2)

```bash
# Run automatic deployment script
sudo ./deploy.sh
```

After deployment, the application will be available at `https://cloud.l0.mom`

**Key Features:**
- **No PM2** - Direct Node.js execution via systemd
- **Automatic SSL** - Let's Encrypt certificates via Certbot
- **Environment-based config** - Uses `.env` files for configuration
- **Systemd service** - Automatic startup and restart

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

> 📖 **Full API Documentation**: See [API.md](API.md) for complete endpoint details

## 🔧 Configuration

### Environment Variables

Copy `example.env` to `prod.env` and configure your settings:

```bash
cp example.env prod.env
```

Edit `prod.env`:

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
├── ecosystem.config.js    # PM2 configuration
├── deploy.sh              # Deployment script
├── update.sh              # Update script
├── cleanup.sh             # Cleanup script
├── example.env            # Environment template
├── prod.env               # Production environment (not in git)
├── API.md                 # API documentation
├── README.md              # This file
├── USAGE.md               # Usage guide
├── public/                # Static files
│   ├── index.html         # Main page
│   ├── style.css          # Styles
│   ├── script.js          # JavaScript
│   └── init.js            # Initialization
├── storage/               # File storage (protected)
└── Important_files/       # Configuration files (protected)
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

After deployment, management commands are available:

```bash
xcloud start     # Start service
xcloud stop      # Stop service
xcloud restart   # Restart service
xcloud status    # Service status
xcloud logs      # View logs
```


## 🚀 Performance

- **PM2** - Node.js process management
- **Nginx** - Reverse proxy and static files
- **Optimization** - Compression, caching, rate limiting
- **Monitoring** - Logging and metrics

## 📝 Logs

Logs are available in the following locations:
- PM2 logs: `pm2 logs xcloud-storage`
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
sudo -u xcloud pm2 restart xcloud-storage
```

## 🧹 Complete Cleanup

To completely remove xCloud Storage from your system:

```bash
# Run the cleanup script
sudo ./cleanup.sh
```

This will remove:
- All PM2 processes and configurations
- Systemd service and files
- Application directory and storage files
- Log files and temporary files
- Cron jobs and environment variables
- Node.js modules and symlinks

⚠️ **Warning**: This will permanently delete all files and configurations!

## 📞 Support

If you encounter problems, check:
1. Service status: `xcloud status`
2. Logs: `xcloud logs`
3. Nginx configuration: `sudo nginx -t`
4. Port availability: `sudo netstat -tlnp | grep :3000`

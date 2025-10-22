# xCloud Storage

Modern file storage with beautiful glass interface in dark tones.

## 🚀 Features

- **Modern Glass UI** - Beautiful interface in dark tones with glass effects
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

### Ubuntu Deployment

```bash
# Run automatic deployment script
sudo ./deploy.sh
```

After deployment, the application will be available at `http://your-server-ip`

## 🛠 API Endpoints

### Main endpoints

- `GET /api/files` - File list (requires Main Key)
- `POST /api/upload` - File upload (requires any key)
- `GET /api/download/:filename` - File download (requires Main Key)
- `DELETE /api/files/:filename` - File deletion (requires Main Key)

### System endpoints

- `GET /api/health` - Health check

## 🔧 Configuration

Main settings in `config.js`:

```javascript
module.exports = {
  // API Keys
  MAIN_API_KEY: 'your_main_key',
  UPLOAD_API_KEY: 'your_upload_key',
  
  // Server
  PORT: 3000,
  
  // Storage
  STORAGE_PATH: './storage',
  MAX_FILE_SIZE: '100MB'
};
```

## 📁 Project Structure

```
xCloud/
├── server.js              # Main server
├── config.js              # Configuration
├── package.json           # Dependencies
├── ecosystem.config.js    # PM2 configuration
├── deploy.sh              # Deployment script
├── public/                # Static files
│   ├── index.html         # Main page
│   ├── style.css          # Styles
│   └── script.js          # JavaScript
└── storage/               # File storage
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

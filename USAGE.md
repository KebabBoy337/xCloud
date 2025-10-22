# 🚀 xCloud Storage - Usage Guide

## 🎯 Quick Start

### 1. Local Launch
```bash
# Install dependencies
npm install

# Start server
npm start

# Open in browser
open http://localhost:3000
```

### 2. Ubuntu Deployment
```bash
# Automatic deployment
sudo ./deploy.sh

# After deployment available at
http://your-server-ip
```

## 🔑 API Keys

| Key | Rights | Description |
|------|-------|----------|
| `YOUR_MAIN_KEY` | Full | Upload, download, delete, view |
| `YOUR_UPLOAD_KEY` | Upload only | Can only upload files |

## 🌐 Web Interface

1. Open browser and go to `http://localhost:3000`
2. Enter API key in "API Key" field
3. Click key button for authorization
4. Use interface for uploading and managing files

### Interface Features:
- **Drag & Drop** - Drag files to upload
- **Search** - Search files by name
- **Statistics** - View file count and size
- **Actions** - Download and delete files

## 📡 API Usage

### cURL Examples

```bash
# Health check
curl -H "X-API-Key: YOUR_MAIN_KEY" \
     http://localhost:3000/api/health

# File list
curl -H "X-API-Key: YOUR_MAIN_KEY" \
     http://localhost:3000/api/files

# Upload file
curl -X POST \
     -H "X-API-Key: upload_key_2024_secure_67890" \
     -F "file=@example.txt" \
     http://localhost:3000/api/upload

# Download file
curl -H "X-API-Key: YOUR_MAIN_KEY" \
     http://localhost:3000/api/download/filename.txt \
     -o downloaded.txt

# Delete file
curl -X DELETE \
     -H "X-API-Key: YOUR_MAIN_KEY" \
     http://localhost:3000/api/files/filename.txt
```

### JavaScript Examples

```javascript
// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/upload', {
  method: 'POST',
  headers: {
    'X-API-Key': 'upload_key_2024_secure_67890'
  },
  body: formData
});

// Get file list
fetch('/api/files', {
  headers: {
    'X-API-Key': 'YOUR_MAIN_KEY'
  }
})
.then(response => response.json())
.then(data => console.log(data.files));
```


## 🐧 Ubuntu Server Integration

### 1. Simple Upload via curl

```bash
#!/bin/bash
# Script for uploading files from Ubuntu server

XCLOUD_SERVER="http://your-xcloud-server:3000"
API_KEY="upload_key_2024_secure_67890"

# Upload logs
curl -X POST \
     -H "X-API-Key: $API_KEY" \
     -F "file=@/var/log/nginx/access.log" \
     $XCLOUD_SERVER/api/upload

# Upload configuration
curl -X POST \
     -H "X-API-Key: $API_KEY" \
     -F "file=@/etc/nginx/nginx.conf" \
     $XCLOUD_SERVER/api/upload
```

### 2. Automatic Backup

```bash
#!/bin/bash
# Automatic backup script

XCLOUD_SERVER="http://your-xcloud-server:3000"
API_KEY="upload_key_2024_secure_67890"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create archive
tar -czf "$BACKUP_DIR/server_backup_$DATE.tar.gz" /etc /var/log

# Upload to xCloud
curl -X POST \
     -H "X-API-Key: $API_KEY" \
     -F "file=@$BACKUP_DIR/server_backup_$DATE.tar.gz" \
     $XCLOUD_SERVER/api/upload

# Clean local files
rm "$BACKUP_DIR/server_backup_$DATE.tar.gz"
```

### 3. Monitoring and Logs

```bash
#!/bin/bash
# Script for sending logs to xCloud

XCLOUD_SERVER="http://your-xcloud-server:3000"
API_KEY="upload_key_2024_secure_67890"

# Send system logs
journalctl --since "1 hour ago" > /tmp/system.log
curl -X POST \
     -H "X-API-Key: $API_KEY" \
     -F "file=@/tmp/system.log" \
     $XCLOUD_SERVER/api/upload

# Send application logs
tail -n 1000 /var/log/nginx/access.log > /tmp/nginx.log
curl -X POST \
     -H "X-API-Key: $API_KEY" \
     -F "file=@/tmp/nginx.log" \
     $XCLOUD_SERVER/api/upload
```

## 🔒 Security

### Security Recommendations:

1. **Change API keys** in `config.js` before deployment
2. **Use HTTPS** in production
3. **Restrict access** to server via firewall
4. **Regularly update** dependencies
5. **Monitor logs** for suspicious activity

### SSL Setup (Let's Encrypt):

```bash
# After deployment
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📊 Monitoring

### Status Check:
```bash
# Service status
xcloud status

# View logs
xcloud logs

# Check Nginx
sudo systemctl status nginx

# Check ports
sudo netstat -tlnp | grep :3000
```

### Performance Metrics:
```bash
# Memory usage
pm2 monit

# Nginx logs
sudo tail -f /var/log/nginx/access.log

# System resources
htop
```

## 🛠 Troubleshooting

### Authorization Issues:
- Check API key correctness
- Ensure server is running
- Check logs: `xcloud logs`

### Upload Issues:
- Check file size (max 100MB)
- Ensure write permissions to storage folder
- Check available disk space

### Network Issues:
- Check Nginx status: `sudo systemctl status nginx`
- Check configuration: `sudo nginx -t`
- Check firewall: `sudo ufw status`

## 📈 Scaling

### For High Loads:

1. **Increase PM2 processes:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'xcloud-storage',
    script: 'server.js',
    instances: 'max', // Use all CPU
    exec_mode: 'cluster'
  }]
};
```

2. **Configure Nginx for load balancing:**
```nginx
upstream xcloud {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

3. **Use external storage:**
```javascript
// config.js - S3 configuration
AWS: {
  ACCESS_KEY_ID: 'your-aws-key',
  SECRET_ACCESS_KEY: 'your-aws-secret',
  REGION: 'us-east-1',
  BUCKET: 'your-s3-bucket'
}
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

## 🎉 Done!

Now you have a fully functional file storage with beautiful interface!

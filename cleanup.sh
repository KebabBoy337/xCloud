#!/bin/bash

# xCloud Storage - Complete Cleanup Script
# This script will remove all xCloud files, PM2 processes, and systemd services

echo "🧹 xCloud Storage - Complete Cleanup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. This will remove system-wide installations."
fi

# Stop and remove PM2 processes
print_status "Stopping PM2 processes..."
if command -v pm2 &> /dev/null; then
    pm2 stop xcloud-storage 2>/dev/null || true
    pm2 delete xcloud-storage 2>/dev/null || true
    pm2 save 2>/dev/null || true
    print_status "PM2 processes stopped and removed"
else
    print_warning "PM2 not found, skipping PM2 cleanup"
fi

# Stop and disable systemd service
print_status "Stopping systemd service..."
if systemctl is-active --quiet xcloud-storage; then
    sudo systemctl stop xcloud-storage 2>/dev/null || true
    print_status "xcloud-storage service stopped"
fi

if systemctl is-enabled --quiet xcloud-storage; then
    sudo systemctl disable xcloud-storage 2>/dev/null || true
    print_status "xcloud-storage service disabled"
fi

# Remove systemd service file
print_status "Removing systemd service file..."
sudo rm -f /etc/systemd/system/xcloud-storage.service 2>/dev/null || true
sudo systemctl daemon-reload 2>/dev/null || true
print_status "Systemd service file removed"

# Remove application directory
print_status "Removing application directory..."
if [ -d "/opt/xcloud-storage" ]; then
    sudo rm -rf /opt/xcloud-storage
    print_status "Application directory removed: /opt/xcloud-storage"
else
    print_warning "Application directory not found: /opt/xcloud-storage"
fi

# Remove storage directory
print_status "Removing storage directory..."
if [ -d "/opt/xcloud-storage/storage" ]; then
    sudo rm -rf /opt/xcloud-storage/storage
    print_status "Storage directory removed"
else
    print_warning "Storage directory not found"
fi

# Remove from PATH (if added)
print_status "Cleaning up PATH modifications..."
if [ -f "/etc/profile.d/xcloud.sh" ]; then
    sudo rm -f /etc/profile.d/xcloud.sh
    print_status "PATH modifications removed"
fi

# Remove any remaining processes
print_status "Killing any remaining xCloud processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "xcloud" 2>/dev/null || true
print_status "Process cleanup completed"

# Remove log files
print_status "Removing log files..."
sudo rm -f /var/log/xcloud-storage.log 2>/dev/null || true
sudo rm -f /var/log/xcloud-storage-error.log 2>/dev/null || true
print_status "Log files removed"

# Remove any backup files
print_status "Removing backup files..."
sudo rm -f /opt/xcloud-storage-backup-*.tar.gz 2>/dev/null || true
print_status "Backup files removed"

# Clean up any remaining files in /tmp
print_status "Cleaning temporary files..."
rm -f /tmp/xcloud-* 2>/dev/null || true
print_status "Temporary files cleaned"

# Remove any cron jobs
print_status "Removing cron jobs..."
crontab -l 2>/dev/null | grep -v "xcloud" | crontab - 2>/dev/null || true
print_status "Cron jobs removed"

# Remove any environment variables
print_status "Cleaning environment variables..."
unset XCLOUD_API_KEY 2>/dev/null || true
unset XCLOUD_PORT 2>/dev/null || true
print_status "Environment variables cleaned"

# Remove any remaining PM2 configurations
print_status "Cleaning PM2 configurations..."
pm2 kill 2>/dev/null || true
print_status "PM2 configurations cleaned"

# Remove any remaining Node.js modules (if in global location)
print_status "Cleaning Node.js modules..."
if [ -d "/usr/local/lib/node_modules/xcloud-storage" ]; then
    sudo rm -rf /usr/local/lib/node_modules/xcloud-storage
    print_status "Node.js modules removed"
fi

# Remove any remaining symlinks
print_status "Removing symlinks..."
sudo rm -f /usr/local/bin/xcloud 2>/dev/null || true
sudo rm -f /usr/bin/xcloud 2>/dev/null || true
print_status "Symlinks removed"

# Final cleanup
print_status "Performing final cleanup..."
sudo apt-get autoremove -y 2>/dev/null || true
sudo apt-get autoclean 2>/dev/null || true
print_status "Final cleanup completed"

echo ""
echo "🎉 xCloud Storage - Complete Cleanup Finished!"
echo "=============================================="
echo ""
echo "✅ Removed:"
echo "   - PM2 processes and configurations"
echo "   - Systemd service and files"
echo "   - Application directory (/opt/xcloud-storage)"
echo "   - Storage files and backups"
echo "   - Log files and temporary files"
echo "   - Cron jobs and environment variables"
echo "   - Node.js modules and symlinks"
echo ""
echo "⚠️  Note: This script removed ALL xCloud-related files and configurations."
echo "   If you want to reinstall, you'll need to run the deploy script again."
echo ""
echo "🔍 To verify cleanup, run:"
echo "   pm2 list"
echo "   systemctl status xcloud-storage"
echo "   ls -la /opt/xcloud-storage"
echo ""

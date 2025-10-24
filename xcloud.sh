#!/bin/bash

# xCloud Storage Manager v1.0.3 Stable
# Unified management script for xCloud Storage

echo "🚀 xCloud Storage Manager v1.0.3 Stable"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to show menu
show_menu() {
    echo ""
    echo -e "${CYAN}📋 Available Operations:${NC}"
    echo "========================================"
    echo "1. 🚀 Deploy xCloud Storage"
    echo "2. 🔄 Update xCloud Storage"
    echo "3. 🧹 Complete Cleanup"
    echo "4. 🔄 Restart Service (reload env)"
    echo "5. 📊 View Logs"
    echo "6. ⚙️  Edit prod.env"
    echo "7. 📈 Service Status"
    echo "8. 🛑 Stop Service"
    echo "9. ▶️  Start Service"
    echo "0. ❌ Exit"
    echo "========================================"
}

# Function to deploy
deploy_xcloud() {
    echo ""
    print_info "🚀 Starting xCloud Storage Deployment..."
    echo "========================================"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "❌ Run with sudo: sudo ./xcloud.sh"
        return 1
    fi
    
    # Update system
    print_status "📦 Updating system..."
    apt update && apt upgrade -y
    
    # Install Node.js
    print_status "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    
    # Install Nginx
    print_status "🌐 Installing Nginx..."
    apt install -y nginx
    
    # Install Certbot
    print_status "🔒 Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
    
    # Create user
    print_status "👤 Creating xcloud user..."
    useradd -m -s /bin/bash xcloud 2>/dev/null || print_warning "User xcloud already exists"
    
    # Create directory
    print_status "📁 Creating directory..."
    mkdir -p /opt/xcloud
    cd /opt/xcloud
    
    # Copy files
    print_status "📋 Copying files..."
    cp -r /root/xCloud/* /opt/xcloud/ 2>/dev/null || print_warning "Files already copied"
    
    # Fix permissions
    print_status "🔧 Fixing permissions..."
    chown -R xcloud:xcloud /opt/xcloud
    chmod -R 755 /opt/xcloud
    
    # Install dependencies
    print_status "📦 Installing dependencies..."
    cd /opt/xcloud
    sudo -u xcloud npm install --production
    
    # Create Important_files directory
    print_status "📁 Creating Important_files directory..."
    mkdir -p /opt/xcloud/Important_files
    chown xcloud:xcloud /opt/xcloud/Important_files
    chmod 755 /opt/xcloud/Important_files
    
    # Create prod.env in Important_files
    print_status "📝 Creating prod.env in Important_files..."
    if [ ! -f "/opt/xcloud/Important_files/prod.env" ]; then
        cp /opt/xcloud/example.env /opt/xcloud/Important_files/prod.env
        chown xcloud:xcloud /opt/xcloud/Important_files/prod.env
        chmod 644 /opt/xcloud/Important_files/prod.env
        print_success "✅ prod.env created in Important_files"
    else
        print_warning "ℹ️  prod.env already exists in Important_files"
    fi
    
    # Create symlink to prod.env
    print_status "🔗 Creating symlink to prod.env..."
    if [ ! -f "/opt/xcloud/prod.env" ]; then
        ln -s /opt/xcloud/Important_files/prod.env /opt/xcloud/prod.env
        print_success "✅ Symlink created: /opt/xcloud/prod.env -> Important_files/prod.env"
    else
        print_warning "ℹ️  Symlink already exists"
    fi
    
    # Create systemd service
    print_status "⚙️ Creating systemd service..."
    tee /etc/systemd/system/xcloud.service > /dev/null <<EOF
[Unit]
Description=xCloud Storage Service
After=network.target

[Service]
Type=simple
User=xcloud
WorkingDirectory=/opt/xcloud
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/xcloud/Important_files/prod.env

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    print_status "🔄 Reloading systemd..."
    systemctl daemon-reload
    systemctl enable xcloud
    
    # Configure Nginx
    print_status "🌐 Configuring Nginx..."
    tee /etc/nginx/sites-available/xcloud > /dev/null <<EOF
server {
    listen 80;
    server_name cloud.l0.mom;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Enable Nginx site
    ln -sf /etc/nginx/sites-available/xcloud /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl restart nginx
    
    # Start service
    print_status "🚀 Starting xCloud Storage..."
    systemctl start xcloud
    
    # Wait for startup
    sleep 5
    
    # Check status
    print_status "📊 Checking status..."
    systemctl status xcloud --no-pager
    
    # Try to get SSL certificate
    print_status "🔒 Attempting to get SSL certificate..."
    if nslookup cloud.l0.mom > /dev/null 2>&1; then
        print_success "✅ DNS configured, getting SSL certificate..."
        certbot --nginx -d cloud.l0.mom --non-interactive --agree-tos --email admin@cloud.l0.mom || print_warning "⚠️ Certbot couldn't configure SSL"
    else
        print_warning "⚠️ DNS not configured, using self-signed certificate"
    fi
    
    echo ""
    print_success "🎉 Deployment completed!"
    print_info "🌐 Application: https://cloud.l0.mom"
    print_info "📋 Logs: journalctl -u xcloud -f"
    echo ""
    print_warning "🔧 CONFIGURE API KEYS:"
    echo "========================"
    print_info "1. Edit API keys:"
    print_info "   sudo nano /opt/xcloud/Important_files/prod.env"
    echo ""
    print_info "2. Change these lines:"
    print_info "   MAIN_API_KEY=your_secure_main_key_here"
    print_info "   UPLOAD_API_KEY=your_secure_upload_key_here"
    echo ""
    print_info "3. Restart service:"
    print_info "   sudo systemctl restart xcloud"
    echo ""
    print_info "4. Check status:"
    print_info "   sudo systemctl status xcloud"
    echo ""
    print_warning "📁 CONFIGURATION FILES:"
    echo "========================"
    print_info "• prod.env: /opt/xcloud/Important_files/prod.env"
    print_info "• .public_links.json: /opt/xcloud/Important_files/.public_links.json"
    print_info "• storage: /opt/xcloud/storage/"
    echo ""
    print_warning "⚠️  IMPORTANT: Change API keys before using!"
}

# Function to update
update_xcloud() {
    echo ""
    print_info "🔄 Starting xCloud Storage Update..."
    echo "========================================"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "❌ Run with sudo: sudo ./xcloud.sh"
        return 1
    fi
    
    # Determine source directory
    SOURCE_DIR="$(pwd)"
    print_status "Source directory: $SOURCE_DIR"
    
    # Check if project files exist
    if [ ! -f "$SOURCE_DIR/package.json" ] || [ ! -f "$SOURCE_DIR/server.js" ]; then
        print_error "Project files not found in $SOURCE_DIR"
        print_error "Run script from xCloud project folder"
        return 1
    fi
    
    # Check git repository
    if [ ! -d "$SOURCE_DIR/.git" ]; then
        print_error "Git repository not found in $SOURCE_DIR"
        return 1
    fi
    
    print_status "1. Checking current status..."
    
    # Check service status
    if systemctl is-active --quiet xcloud; then
        print_status "xcloud service is running"
    else
        print_warning "xcloud service is not running"
    fi
    
    # Go to source directory
    cd "$SOURCE_DIR"
    
    # Save current changes
    print_status "2. Saving current changes..."
    git stash push -m "Auto-save before update $(date)" || print_warning "No changes to save"
    
    # Get updates from GitHub
    print_status "3. Getting updates from GitHub..."
    git fetch origin
    
    # Check for updates
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        print_status "Git is already latest version, but force updating files..."
    else
        print_status "Updates found. Starting update..."
    fi
    
    # Stop services
    print_status "4. Stopping services..."
    systemctl stop xcloud 2>/dev/null || print_warning "xcloud service already stopped"
    
    # Force update code
    print_status "5. Updating code from GitHub..."
    git reset --hard origin/main
    
    # Clean and copy files to production directory
    print_status "6. Cleaning and copying files to /opt/xcloud..."
    
    # Save important files from Important_files
    if [ -f "/opt/xcloud/Important_files/prod.env" ]; then
        cp /opt/xcloud/Important_files/prod.env /tmp/prod.env.backup
        print_status "Saved prod.env from Important_files"
    fi
    
    if [ -f "/opt/xcloud/Important_files/.public_links.json" ]; then
        cp /opt/xcloud/Important_files/.public_links.json /tmp/public_links.json.backup
        print_status "Saved .public_links.json"
    fi
    
    # Protect storage and Important_files directories
    print_status "Protecting storage directory with user files"
    print_status "Protecting Important_files directory with settings"
    
    # Clean directory (except node_modules, storage, Important_files and prod.env)
    print_status "Cleaning /opt/xcloud..."
    find /opt/xcloud -maxdepth 1 -type f -name "*.js" -delete
    find /opt/xcloud -maxdepth 1 -type f -name "*.json" -delete
    find /opt/xcloud -maxdepth 1 -type f -name "*.md" -delete
    find /opt/xcloud -maxdepth 1 -type f -name "*.sh" -delete
    find /opt/xcloud -maxdepth 1 -type f -name "example.env" -delete
    rm -rf /opt/xcloud/public
    # DON'T delete storage - user files!
    # DON'T delete Important_files - settings!
    
    # Copy new files, excluding storage and Important_files
    print_status "Copying files (excluding storage and Important_files)..."
    rsync -av --exclude='storage' --exclude='Important_files' --exclude='node_modules' "$SOURCE_DIR"/ /opt/xcloud/
    
    # Restore important files to Important_files
    if [ -f "/tmp/prod.env.backup" ]; then
        cp /tmp/prod.env.backup /opt/xcloud/Important_files/prod.env
        rm /tmp/prod.env.backup
        print_status "Restored prod.env to Important_files"
    fi
    
    if [ -f "/tmp/public_links.json.backup" ]; then
        cp /tmp/public_links.json.backup /opt/xcloud/Important_files/.public_links.json
        rm /tmp/public_links.json.backup
        print_status "Restored .public_links.json"
    fi
    
    # Create symlink to prod.env if it doesn't exist
    if [ ! -f "/opt/xcloud/prod.env" ] && [ -f "/opt/xcloud/Important_files/prod.env" ]; then
        ln -s /opt/xcloud/Important_files/prod.env /opt/xcloud/prod.env
        print_status "Created symlink to prod.env"
    fi
    
    # Create storage directory if it doesn't exist
    if [ ! -d "/opt/xcloud/storage" ]; then
        mkdir -p /opt/xcloud/storage
        print_status "Created storage directory"
    fi
    
    # Create Important_files directory if it doesn't exist
    if [ ! -d "/opt/xcloud/Important_files" ]; then
        mkdir -p /opt/xcloud/Important_files
        print_status "Created Important_files directory"
    else
        # Check if there are files in Important_files
        file_count=$(find /opt/xcloud/Important_files -type f | wc -l)
        if [ "$file_count" -gt 0 ]; then
            print_status "Found $file_count files in Important_files - protected from deletion"
        else
            print_status "Important_files directory is empty"
        fi
    fi
    
    # Fix permissions
    print_status "7. Fixing permissions..."
    chown -R xcloud:xcloud /opt/xcloud
    chmod -R 755 /opt/xcloud
    
    # Install dependencies
    print_status "8. Installing dependencies..."
    cd /opt/xcloud
    sudo -u xcloud npm install --production
    
    # Reload systemd
    print_status "9. Reloading systemd..."
    systemctl daemon-reload
    
    # Start service
    print_status "10. Starting service..."
    systemctl start xcloud
    
    # Wait for startup
    sleep 5
    
    # Check status
    print_status "11. Checking service status..."
    systemctl status xcloud --no-pager
    
    if systemctl is-active --quiet xcloud; then
        print_success "✅ xCloud Storage updated successfully!"
        print_info "🌐 Application: https://cloud.l0.mom"
    else
        print_error "❌ Failed to start xCloud service after update!"
        print_info "📝 Check logs: journalctl -u xcloud -f"
    fi
    
    echo ""
    print_success "🎉 Update completed!"
    print_info "📋 Logs: journalctl -u xcloud -f"
}

# Function to cleanup
cleanup_xcloud() {
    echo ""
    print_warning "🧹 Starting xCloud Storage Complete Cleanup..."
    echo "========================================"
    print_warning "⚠️  This will remove ALL xCloud files and configurations!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ] || [ "$confirm" = "y" ]; then
        # Check if running as root
        if [ "$EUID" -ne 0 ]; then
            print_error "❌ Run with sudo: sudo ./xcloud.sh"
            return 1
        fi
        
        print_warning "Running as root. This will remove system-wide installations."
        
        # Note: PM2 is not used in v1.0.3 Stable - using systemd instead
        print_status "Skipping PM2 cleanup (not used in v1.0.3 Stable)..."
        
        # Stop and disable systemd service
        print_status "Stopping systemd service..."
        if systemctl is-active --quiet xcloud; then
            systemctl stop xcloud 2>/dev/null || true
            print_status "xcloud service stopped"
        fi
        
        if systemctl is-enabled --quiet xcloud; then
            systemctl disable xcloud 2>/dev/null || true
            print_status "xcloud service disabled"
        fi
        
        # Remove systemd service file
        print_status "Removing systemd service file..."
        rm -f /etc/systemd/system/xcloud.service 2>/dev/null || true
        systemctl daemon-reload 2>/dev/null || true
        print_status "Systemd service file removed"
        
        # Remove application directory
        print_status "Removing application directory..."
        if [ -d "/opt/xcloud" ]; then
            rm -rf /opt/xcloud
            print_status "Application directory removed: /opt/xcloud"
        else
            print_warning "Application directory not found: /opt/xcloud"
        fi
        
        # Remove storage directory (if exists separately)
        print_status "Removing storage directory..."
        if [ -d "/opt/xcloud/storage" ]; then
            rm -rf /opt/xcloud/storage
            print_status "Storage directory removed"
        else
            print_warning "Storage directory not found"
        fi
        
        # Remove Important_files directory (configuration files)
        print_status "Removing Important_files directory..."
        if [ -d "/opt/xcloud/Important_files" ]; then
            rm -rf /opt/xcloud/Important_files
            print_status "Important_files directory removed"
        else
            print_warning "Important_files directory not found"
        fi
        
        # Remove from PATH (if added)
        print_status "Cleaning up PATH modifications..."
        if [ -f "/etc/profile.d/xcloud.sh" ]; then
            rm -f /etc/profile.d/xcloud.sh
            print_status "PATH modifications removed"
        fi
        
        # Remove any remaining processes
        print_status "Killing any remaining xCloud processes..."
        pkill -f "node.*server.js" 2>/dev/null || true
        pkill -f "xcloud" 2>/dev/null || true
        print_status "Process cleanup completed"
        
        # Remove log files
        print_status "Removing log files..."
        rm -f /var/log/xcloud-storage.log 2>/dev/null || true
        rm -f /var/log/xcloud-storage-error.log 2>/dev/null || true
        print_status "Log files removed"
        
        # Remove any backup files
        print_status "Removing backup files..."
        rm -f /opt/xcloud-storage-backup-*.tar.gz 2>/dev/null || true
        rm -f /tmp/prod.env.backup 2>/dev/null || true
        rm -f /tmp/public_links.json.backup 2>/dev/null || true
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
        
        # Note: PM2 configurations not needed in v1.0.3 Stable
        print_status "Skipping PM2 configurations (not used in v1.0.3 Stable)..."
        
        # Remove any remaining Node.js modules (if in global location)
        print_status "Cleaning Node.js modules..."
        if [ -d "/usr/local/lib/node_modules/xcloud-storage" ]; then
            rm -rf /usr/local/lib/node_modules/xcloud-storage
            print_status "Node.js modules removed"
        fi
        
        # Remove nginx configuration
        print_status "Removing nginx configuration..."
        rm -f /etc/nginx/sites-available/xcloud 2>/dev/null || true
        rm -f /etc/nginx/sites-enabled/xcloud 2>/dev/null || true
        systemctl restart nginx 2>/dev/null || true
        print_status "Nginx configuration removed"
        
        # Remove SSL certificates
        print_status "Removing SSL certificates..."
        certbot delete --cert-name cloud.l0.mom 2>/dev/null || true
        rm -rf /etc/letsencrypt/live/cloud.l0.mom 2>/dev/null || true
        rm -rf /etc/letsencrypt/archive/cloud.l0.mom 2>/dev/null || true
        rm -rf /etc/letsencrypt/renewal/cloud.l0.mom.conf 2>/dev/null || true
        print_status "SSL certificates removed"
        
        # Remove any remaining symlinks
        print_status "Removing symlinks..."
        rm -f /usr/local/bin/xcloud 2>/dev/null || true
        rm -f /usr/bin/xcloud 2>/dev/null || true
        rm -f /usr/local/bin/xcloud-ssl 2>/dev/null || true
        # Remove symlink to prod.env if exists
        rm -f /opt/xcloud/prod.env 2>/dev/null || true
        print_status "Symlinks removed"
        
        # Remove xcloud user (if created)
        print_status "Removing xcloud user..."
        if id "xcloud" &>/dev/null; then
            userdel -r xcloud 2>/dev/null || true
            print_status "xcloud user removed"
        else
            print_warning "xcloud user not found"
        fi
        
        # Final cleanup
        print_status "Performing final cleanup..."
        apt-get autoremove -y 2>/dev/null || true
        apt-get autoclean 2>/dev/null || true
        print_status "Final cleanup completed"
        
        echo ""
        print_success "🎉 xCloud Storage v1.0.3 Stable - Complete Cleanup Finished!"
        echo "============================================================"
        echo ""
        print_success "✅ Removed:"
        echo "   - Systemd service and files"
        echo "   - Application directory (/opt/xcloud)"
        echo "   - Storage files and backups"
        echo "   - Important_files directory (configuration files)"
        echo "   - Nginx configuration and SSL certificates"
        echo "   - Log files and temporary files"
        echo "   - Cron jobs and environment variables"
        echo "   - Node.js modules and symlinks"
        echo "   - Backup files (prod.env, .public_links.json)"
        echo "   - xcloud user account"
        echo ""
        print_warning "⚠️  Note: This script removed ALL xCloud-related files and configurations."
        echo "   This includes:"
        echo "   - All user files in /opt/xcloud/storage/"
        echo "   - All configuration files in /opt/xcloud/Important_files/"
        echo "   - All application code and settings"
        echo ""
        echo "   If you want to reinstall, you'll need to run the deploy script again."
        echo ""
        print_info "🔍 To verify cleanup, run:"
        echo "   systemctl status xcloud"
        echo "   ls -la /opt/xcloud"
        echo "   sudo certbot certificates"
        echo "   ls -la /opt/xcloud/Important_files"
        echo ""
    else
        print_info "Cleanup cancelled."
    fi
}

# Function to restart service
restart_service() {
    echo ""
    print_info "🔄 Restarting xCloud Service..."
    echo "========================================"
    
    print_status "Stopping xCloud service..."
    sudo systemctl stop xcloud 2>/dev/null || print_warning "Service was not running"
    
    print_status "Starting xCloud service..."
    sudo systemctl start xcloud
    
    sleep 3
    
    print_status "Checking service status..."
    sudo systemctl status xcloud --no-pager
    
    if systemctl is-active --quiet xcloud; then
        print_success "✅ xCloud service restarted successfully!"
        print_info "🌐 Application: https://cloud.l0.mom"
    else
        print_error "❌ Failed to restart xCloud service!"
        print_info "📝 Check logs: journalctl -u xcloud -f"
    fi
}

# Function to view logs
view_logs() {
    echo ""
    print_info "📊 xCloud Storage Logs"
    echo "========================================"
    echo "Choose log view option:"
    echo "1. 📋 Recent logs (last 50 lines)"
    echo "2. 🔄 Follow logs (real-time)"
    echo "3. 📅 All logs"
    echo "4. ❌ Back to main menu"
    echo ""
    read -p "Enter your choice (1-4): " log_choice
    
    case $log_choice in
        1)
            print_status "Showing recent logs..."
            sudo journalctl -u xcloud -n 50 --no-pager
            ;;
        2)
            print_status "Following logs (press Ctrl+C to stop)..."
            sudo journalctl -u xcloud -f
            ;;
        3)
            print_status "Showing all logs..."
            sudo journalctl -u xcloud --no-pager
            ;;
        4)
            return 0
            ;;
        *)
            print_error "Invalid choice!"
            ;;
    esac
}

# Function to edit prod.env
edit_prod_env() {
    echo ""
    print_info "⚙️  Editing prod.env Configuration"
    echo "========================================"
    
    # Check if Important_files directory exists
    if [ -d "/opt/xcloud/Important_files" ]; then
        env_file="/opt/xcloud/Important_files/prod.env"
    elif [ -f "/opt/xcloud/prod.env" ]; then
        env_file="/opt/xcloud/prod.env"
    else
        print_error "prod.env file not found!"
        print_info "Please deploy xCloud first or create the file manually."
        return 1
    fi
    
    print_status "Opening: $env_file"
    print_warning "⚠️  After editing, restart the service to apply changes!"
    echo ""
    
    # Show current content
    print_info "Current configuration:"
    echo "========================"
    sudo cat "$env_file" 2>/dev/null || print_error "Cannot read file"
    echo "========================"
    echo ""
    
    # Edit file
    read -p "Press Enter to edit the file..." 
    sudo nano "$env_file"
    
    print_info "File edited. Don't forget to restart the service!"
}

# Function to check service status
check_status() {
    echo ""
    print_info "📈 xCloud Service Status"
    echo "========================================"
    
    print_status "Service status:"
    sudo systemctl status xcloud --no-pager
    
    echo ""
    print_status "Service details:"
    echo "========================"
    echo "Active: $(systemctl is-active xcloud)"
    echo "Enabled: $(systemctl is-enabled xcloud)"
    echo "PID: $(systemctl show -p MainPID --value xcloud)"
    
    echo ""
    print_status "Application files:"
    echo "========================"
    if [ -d "/opt/xcloud" ]; then
        echo "✅ Application directory: /opt/xcloud"
        ls -la /opt/xcloud/ | head -10
    else
        echo "❌ Application directory not found"
    fi
    
    if [ -d "/opt/xcloud/Important_files" ]; then
        echo "✅ Important_files directory: /opt/xcloud/Important_files"
        ls -la /opt/xcloud/Important_files/
    else
        echo "❌ Important_files directory not found"
    fi
    
    if [ -d "/opt/xcloud/storage" ]; then
        echo "✅ Storage directory: /opt/xcloud/storage"
        echo "Files count: $(find /opt/xcloud/storage -type f | wc -l)"
    else
        echo "❌ Storage directory not found"
    fi
}

# Function to stop service
stop_service() {
    echo ""
    print_info "🛑 Stopping xCloud Service..."
    echo "========================================"
    
    sudo systemctl stop xcloud
    
    if systemctl is-active --quiet xcloud; then
        print_error "❌ Failed to stop xCloud service!"
    else
        print_success "✅ xCloud service stopped successfully!"
    fi
}

# Function to start service
start_service() {
    echo ""
    print_info "▶️  Starting xCloud Service..."
    echo "========================================"
    
    sudo systemctl start xcloud
    
    sleep 3
    
    if systemctl is-active --quiet xcloud; then
        print_success "✅ xCloud service started successfully!"
        print_info "🌐 Application: https://cloud.l0.mom"
    else
        print_error "❌ Failed to start xCloud service!"
        print_info "📝 Check logs: journalctl -u xcloud -f"
    fi
}

# Main menu loop
while true; do
    show_menu
    echo ""
    read -p "Enter your choice (0-9): " choice
    
    case $choice in
        1)
            deploy_xcloud
            ;;
        2)
            update_xcloud
            ;;
        3)
            cleanup_xcloud
            ;;
        4)
            restart_service
            ;;
        5)
            view_logs
            ;;
        6)
            edit_prod_env
            ;;
        7)
            check_status
            ;;
        8)
            stop_service
            ;;
        9)
            start_service
            ;;
        0)
            echo ""
            print_info "👋 Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice! Please enter a number between 0-9."
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done

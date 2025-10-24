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
    
    if [ -f "./deploy.sh" ]; then
        chmod +x ./deploy.sh
        sudo ./deploy.sh
    else
        print_error "deploy.sh not found in current directory!"
        return 1
    fi
}

# Function to update
update_xcloud() {
    echo ""
    print_info "🔄 Starting xCloud Storage Update..."
    echo "========================================"
    
    if [ -f "./update.sh" ]; then
        chmod +x ./update.sh
        sudo ./update.sh
    else
        print_error "update.sh not found in current directory!"
        return 1
    fi
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
        if [ -f "./cleanup.sh" ]; then
            chmod +x ./cleanup.sh
            sudo ./cleanup.sh
        else
            print_error "cleanup.sh not found in current directory!"
            return 1
        fi
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

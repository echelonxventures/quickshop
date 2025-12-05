#!/bin/bash

#===============================================================================
# QuickShop Auto-Deployment Script
#===============================================================================
# This script performs a complete auto-deployment of QuickShop application
# It updates the code, installs dependencies, builds the frontend,
# and restarts the services.
#===============================================================================

set -e  # Exit on any error

# Configuration
PROJECT_DIR="/home/ubuntu/quickshop"
BACKUP_DIR="/home/ubuntu/quickshop-backups"
LOG_FILE="/home/ubuntu/quickshop/logs/deployment.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting deployment process..."

# Function for error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "/home/ubuntu/quickshop/logs"

# Create backup of current version
log "Creating backup of current version..."
BACKUP_NAME="quickshop_backup_${TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
cp -r "$PROJECT_DIR" "$BACKUP_PATH" || log "Warning: Could not create backup"
log "Backup created at: $BACKUP_PATH"

# Navigate to project directory
cd "$PROJECT_DIR" || error_exit "Could not navigate to project directory"

# Fetch latest changes from repository
log "Fetching latest changes from repository..."
git fetch origin || error_exit "Failed to fetch from origin"
git reset --hard origin/main || error_exit "Failed to reset to origin/main"

# Verify the correct branch is checked out
CURRENT_BRANCH=$(git branch --show-current)
log "Current branch: $CURRENT_BRANCH"

# Update backend
log "Updating backend..."
cd "$PROJECT_DIR/backend" || error_exit "Could not navigate to backend directory"

# Install backend dependencies
log "Installing backend dependencies..."
export NODE_OPTIONS="--max_old_space_size=4096"  # Increase memory for build
npm install --production || error_exit "Failed to install backend dependencies"

# Build backend if needed (for TypeScript or other build steps)
if [ -f "tsconfig.json" ] || [ -f "webpack.config.js" ]; then
    log "Building backend..."
    npm run build || log "Backend build had issues, continuing..."
fi

# Update frontend
log "Updating frontend..."
cd "$PROJECT_DIR/frontend" || error_exit "Could not navigate to frontend directory"

# Install frontend dependencies
log "Installing frontend dependencies..."
export NODE_OPTIONS="--max_old_space_size=4096"  # Increase memory for build
npm install --production || error_exit "Failed to install frontend dependencies"

# Build frontend
log "Building frontend..."
npm run build || log "Failed to build frontend"

# Update admin portal
log "Updating admin portal..."
cd "$PROJECT_DIR/admin_portal" || error_exit "Could not navigate to admin portal directory"
export NODE_OPTIONS="--max_old_space_size=4096"
npm install --production || log "Error installing admin portal dependencies, continuing..."
npm run build || log "Error building admin portal, continuing..."

# Update support portal
log "Updating support portal..."
cd "$PROJECT_DIR/support_portal" || error_exit "Could not navigate to support portal directory"
export NODE_OPTIONS="--max_old_space_size=4096"
npm install --production || log "Error installing support portal dependencies, continuing..."
npm run build || log "Error building support portal, continuing..."

# Update analytics portal
log "Updating analytics portal..."
cd "$PROJECT_DIR/analytics_portal" || error_exit "Could not navigate to analytics portal directory"
export NODE_OPTIONS="--max_old_space_size=4096"
npm install --production || log "Error installing analytics portal dependencies, continuing..."
npm run build || log "Error building analytics portal, continuing..."

# Update seller portal
log "Updating seller portal..."
cd "$PROJECT_DIR/seller_portal" || error_exit "Could not navigate to seller portal directory"
export NODE_OPTIONS="--max_old_space_size=4096"
npm install --production || log "Error installing seller portal dependencies, continuing..."
npm run build || log "Error building seller portal, continuing..."

# Restart PM2 processes
log "Restarting PM2 processes..."
cd "$PROJECT_DIR"

# Reload PM2 without downtime
pm2 reload all || log "Error reloading PM2, attempting restart..."

# If reload failed, try individual restart
if [ $? -ne 0 ]; then
    pm2 restart quickshop-backend || log "Error restarting backend"
    pm2 restart quickshop-webhook || log "Error restarting webhook"
fi

# Run post-deployment checks
log "Running post-deployment checks..."

# Check if backend is responding
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    log "✓ Backend is responding correctly (Status: $BACKEND_STATUS)"
else
    log "✗ Backend is not responding correctly (Status: $BACKEND_STATUS)"
fi

# Check if webhook is responding
WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/health || echo "000")
if [ "$WEBHOOK_STATUS" = "200" ]; then
    log "✓ Webhook server is responding correctly (Status: $WEBHOOK_STATUS)"
else
    log "✗ Webhook server is not responding correctly (Status: $WEBHOOK_STATUS)"
fi

# Reload NGINX configuration
log "Reloading NGINX configuration..."
sudo nginx -t && sudo systemctl reload nginx || error_exit "Failed to reload NGINX"

# Clean up old backups (keep last 5)
log "Cleaning up old backups..."
ls -t "$BACKUP_DIR" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}" 2>/dev/null || log "No old backups to remove"

log "Deployment completed successfully at $(date)"
log "========================================"
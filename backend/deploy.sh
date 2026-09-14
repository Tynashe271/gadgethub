#!/bin/bash

# GadgetHub Backend Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Starting GadgetHub Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/gadgethub-api"
BACKUP_DIR="/var/backups/gadgethub"
LOG_FILE="/var/log/gadgethub-deploy.log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
log "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

if ! command_exists git; then
    print_error "git is not installed"
    exit 1
fi

print_status "All prerequisites installed"

# Create necessary directories
log "Creating directories..."
mkdir -p "$APP_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "/var/www/gadgethub-uploads"
mkdir -p "/var/log/gadgethub"
print_status "Directories created"

# Backup current deployment if exists
if [ -d "$APP_DIR" ]; then
    log "Backing up current deployment..."
    BACKUP_NAME="gadgethub-$(date +%Y%m%d-%H%M%S)"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$APP_DIR" . 2>/dev/null || true
    print_status "Backup created: $BACKUP_NAME"
fi

# Install dependencies
log "Installing dependencies..."
cd "$APP_DIR"
npm ci --production
print_status "Dependencies installed"

# Generate Prisma client
log "Generating Prisma client..."
npm run prisma:generate
print_status "Prisma client generated"

# Run database migrations
log "Running database migrations..."
npm run prisma:deploy
print_status "Database migrations completed"

# Build TypeScript
log "Building TypeScript..."
npm run build
print_status "TypeScript build completed"

# Seed database if needed (optional)
# log "Seeding database..."
# npm run db:seed
# print_status "Database seeded"

# Set permissions
log "Setting permissions..."
chown -R www-data:www-data "$APP_DIR"
chown -R www-data:www-data "/var/www/gadgethub-uploads"
chown -R www-data:www-data "/var/log/gadgethub"
chmod -R 755 "$APP_DIR"
print_status "Permissions set"

# Restart application with PM2
if command_exists pm2; then
    log "Restarting application with PM2..."
    
    if pm2 list | grep -q "gadgethub-api"; then
        pm2 reload gadgethub-api
    else
        pm2 start ecosystem.config.js
    fi
    
    pm2 save
    print_status "Application restarted with PM2"
else
    print_warning "PM2 not found, install it for process management"
    log "Starting application directly..."
    cd "$APP_DIR"
    nohup node dist/src/server.js > /var/log/gadgethub/app.log 2>&1 &
    echo $! > /var/run/gadgethub.pid
    print_status "Application started"
fi

# Cleanup old backups (keep last 7 days)
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "gadgethub-*.tar.gz" -mtime +7 -delete 2>/dev/null || true
print_status "Old backups cleaned up"

# Health check
log "Performing health check..."
sleep 5
if curl -f http://localhost:4000/api/v1/health > /dev/null 2>&1; then
    print_status "Health check passed"
else
    print_error "Health check failed"
    exit 1
fi

log "Deployment completed successfully!"
echo -e "${GREEN}🎉 GadgetHub Backend deployed successfully!${NC}"
echo "Application is running at: http://localhost:4000/api/v1"
#!/bin/bash

# ZipzyDeliver Production Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="zipzydeliver"
DEPLOY_ENV=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
LOG_FILE="./deploy_${TIMESTAMP}.log"

echo -e "${BLUE}🚀 ZipzyDeliver Deployment Script${NC}"
echo -e "${BLUE}Environment: ${DEPLOY_ENV}${NC}"
echo -e "${BLUE}Timestamp: ${TIMESTAMP}${NC}"
echo ""

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root (not recommended for Node.js apps)
if [[ $EUID -eq 0 ]]; then
   warn "Running as root is not recommended for Node.js applications"
fi

# Check prerequisites
log "Checking prerequisites..."
command -v node >/dev/null 2>&1 || error "Node.js is not installed"
command -v npm >/dev/null 2>&1 || error "npm is not installed"

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log "Node.js version: $NODE_VERSION"
log "npm version: $NPM_VERSION"

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    error ".env file not found. Please create one based on env.example"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup current deployment if exists
if [[ -d "dist" ]]; then
    log "Creating backup of current deployment..."
    tar -czf "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" dist/ || warn "Failed to create backup"
fi

# Install dependencies
log "Installing dependencies..."
npm ci --only=production || error "Failed to install dependencies"

# Build the application
log "Building application..."
if [[ "$DEPLOY_ENV" == "production" ]]; then
    log "Building for production..."
    npm run build || error "Build failed"
else
    log "Building for staging..."
    npm run build:mongodb || error "Build failed"
fi

# Verify build output
if [[ ! -d "dist" ]]; then
    error "Build failed - dist directory not found"
fi

log "Build completed successfully"

# Set environment variables
export NODE_ENV="$DEPLOY_ENV"
log "Set NODE_ENV to $DEPLOY_ENV"

# Create production .env if needed
if [[ "$DEPLOY_ENV" == "production" && -f "env.production" ]]; then
    log "Setting up production environment..."
    cp env.production .env.production.backup
    # You can add logic here to merge with your actual production values
fi

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    
    log "Performing health check..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:5000/health >/dev/null 2>&1; then
            log "✅ Health check passed! Application is running successfully"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, waiting 2 seconds..."
        sleep 2
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Start the application
log "Starting application..."
if [[ "$DEPLOY_ENV" == "production" ]]; then
    log "Starting production server..."
    nohup npm start > "logs/app_${TIMESTAMP}.log" 2>&1 &
    APP_PID=$!
else
    log "Starting staging server..."
    nohup npm run start:mongodb > "logs/app_${TIMESTAMP}.log" 2>&1 &
    APP_PID=$!
fi

# Wait a moment for the app to start
sleep 5

# Check if process is running
if ! kill -0 $APP_PID 2>/dev/null; then
    error "Application failed to start. Check logs/logs/app_${TIMESTAMP}.log"
fi

log "Application started with PID: $APP_PID"

# Perform health check
health_check

# Save PID to file for easy management
echo $APP_PID > .app.pid

# Final status
log "🎉 Deployment completed successfully!"
log "Application is running on http://localhost:5000"
log "Health endpoint: http://localhost:5000/health"
log "PID file: .app.pid"
log "Log file: logs/app_${TIMESTAMP}.log"
log "Deployment log: $LOG_FILE"

echo ""
echo -e "${GREEN}✅ Deployment Summary:${NC}"
echo -e "  Environment: ${DEPLOY_ENV}"
echo -e "  Status: Running"
echo -e "  PID: $APP_PID"
echo -e "  URL: http://localhost:5000"
echo -e "  Health: http://localhost:5000/health"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  Stop app: ./stop.sh"
echo -e "  Restart app: ./restart.sh"
echo -e "  View logs: tail -f logs/app_${TIMESTAMP}.log"
echo -e "  Check status: ./status.sh"

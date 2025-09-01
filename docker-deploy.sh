#!/bin/bash

# ZipzyDeliver Docker Production Deployment Script
# Usage: ./docker-deploy.sh [production|staging]

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
LOG_FILE="./docker-deploy_${TIMESTAMP}.log"

echo -e "${BLUE}🐳 ZipzyDeliver Docker Production Deployment${NC}"
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

# Check prerequisites
log "Checking Docker prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker is not installed"
command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"

DOCKER_VERSION=$(docker --version)
COMPOSE_VERSION=$(docker-compose --version)
log "Docker version: $DOCKER_VERSION"
log "Docker Compose version: $COMPOSE_VERSION"

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    error "Docker daemon is not running"
fi

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    error ".env file not found. Please create one based on env.production"
fi

# Create necessary directories
log "Creating necessary directories..."
mkdir -p logs backups uploads ssl

# Check SSL certificates
if [[ ! -f "ssl/cert.pem" ]] || [[ ! -f "ssl/key.pem" ]]; then
    warn "SSL certificates not found in ssl/ directory"
    warn "Creating self-signed certificates for development..."
    
    # Create self-signed certificate (for development only)
    openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" 2>/dev/null || {
        warn "Failed to create self-signed certificate. Please add your SSL certificates to ssl/ directory"
    }
fi

# Stop existing containers
log "Stopping existing containers..."
docker-compose down --remove-orphans || warn "No existing containers to stop"

# Remove old images (optional)
if [[ "$2" == "--clean" ]]; then
    log "Cleaning old images..."
    docker image prune -f
    docker system prune -f
fi

# Build and start services
log "Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 30

# Check service health
log "Checking service health..."
if docker-compose ps | grep -q "unhealthy"; then
    error "Some services are unhealthy. Check logs with: docker-compose logs"
fi

# Show service status
log "Service status:"
docker-compose ps

# Show logs
log "Recent logs:"
docker-compose logs --tail=20

# Health check
log "Performing health check..."
HEALTH_CHECK_URL="http://localhost/health"
if command -v curl >/dev/null 2>&1; then
    if curl -f -s "$HEALTH_CHECK_URL" >/dev/null; then
        log "✅ Health check passed"
    else
        warn "⚠️ Health check failed. Service might still be starting..."
    fi
else
    warn "curl not available, skipping health check"
fi

# Show final status
log "🚀 Deployment completed successfully!"
log "📱 Application is accessible at:"
log "   - HTTP:  http://localhost (redirects to HTTPS)"
log "   - HTTPS: https://localhost"
log "   - API:   https://localhost/api"
log "   - Health: https://localhost/health"

log "🔧 Useful commands:"
log "   - View logs: docker-compose logs -f"
log "   - Stop services: docker-compose down"
log "   - Restart services: docker-compose restart"
log "   - Update services: docker-compose pull && docker-compose up -d"

# Save deployment info
echo "Deployment completed at $(date)" >> "$LOG_FILE"
echo "Environment: $DEPLOY_ENV" >> "$LOG_FILE"
echo "Docker version: $DOCKER_VERSION" >> "$LOG_FILE"
echo "Compose version: $COMPOSE_VERSION" >> "$LOG_FILE"

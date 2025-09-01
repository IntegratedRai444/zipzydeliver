#!/bin/bash

# ZipzyDeliver Restart Script
# Stops the current application and redeploys it

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 ZipzyDeliver Restart Script${NC}"

# Get deployment environment from argument or use production
DEPLOY_ENV=${1:-production}

echo -e "${BLUE}Restarting application in ${DEPLOY_ENV} mode...${NC}"

# Stop the current application
echo -e "${YELLOW}Stopping current application...${NC}"
./stop.sh

# Wait a moment for cleanup
sleep 2

# Deploy the application again
echo -e "${YELLOW}Redeploying application...${NC}"
./deploy.sh "$DEPLOY_ENV"

echo -e "${GREEN}✅ Restart completed successfully!${NC}"

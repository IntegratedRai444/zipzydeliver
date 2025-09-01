#!/bin/bash

# ZipzyDeliver Stop Script
# Stops the running application gracefully

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 ZipzyDeliver Stop Script${NC}"

# Check if PID file exists
if [[ ! -f ".app.pid" ]]; then
    echo -e "${YELLOW}No PID file found. Application may not be running.${NC}"
    exit 0
fi

# Read PID from file
APP_PID=$(cat .app.pid)

# Check if process is running
if ! kill -0 $APP_PID 2>/dev/null; then
    echo -e "${YELLOW}Process $APP_PID is not running. Cleaning up PID file.${NC}"
    rm -f .app.pid
    exit 0
fi

echo -e "${BLUE}Stopping application with PID: $APP_PID${NC}"

# Try graceful shutdown first
kill -TERM $APP_PID

# Wait for graceful shutdown (up to 10 seconds)
for i in {1..10}; do
    if ! kill -0 $APP_PID 2>/dev/null; then
        echo -e "${GREEN}✅ Application stopped gracefully${NC}"
        rm -f .app.pid
        exit 0
    fi
    echo -e "${YELLOW}Waiting for graceful shutdown... ($i/10)${NC}"
    sleep 1
done

# Force kill if still running
echo -e "${YELLOW}Force killing application...${NC}"
kill -KILL $APP_PID

# Wait a moment and check
sleep 2
if ! kill -0 $APP_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Application force stopped${NC}"
    rm -f .app.pid
else
    echo -e "${RED}❌ Failed to stop application${NC}"
    exit 1
fi

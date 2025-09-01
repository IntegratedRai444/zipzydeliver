#!/bin/bash

# ZipzyDeliver Status Script
# Shows the current status of the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 ZipzyDeliver Status Check${NC}"
echo ""

# Check if PID file exists
if [[ ! -f ".app.pid" ]]; then
    echo -e "${RED}❌ Application Status: NOT RUNNING${NC}"
    echo "   No PID file found"
    exit 1
fi

# Read PID from file
APP_PID=$(cat .app.pid)

# Check if process is running
if ! kill -0 $APP_PID 2>/dev/null; then
    echo -e "${RED}❌ Application Status: NOT RUNNING${NC}"
    echo "   Process $APP_PID is not running"
    echo "   Cleaning up stale PID file..."
    rm -f .app.pid
    exit 1
fi

echo -e "${GREEN}✅ Application Status: RUNNING${NC}"
echo "   PID: $APP_PID"
echo "   Started: $(ps -o lstart= -p $APP_PID 2>/dev/null || echo 'Unknown')"

# Check memory usage
if command -v ps >/dev/null 2>&1; then
    MEMORY=$(ps -o rss= -p $APP_PID 2>/dev/null | awk '{print $1/1024}')
    if [[ -n "$MEMORY" ]]; then
        echo "   Memory: ${MEMORY} MB"
    fi
fi

# Check CPU usage
if command -v ps >/dev/null 2>&1; then
    CPU=$(ps -o %cpu= -p $APP_PID 2>/dev/null)
    if [[ -n "$CPU" ]]; then
        echo "   CPU: ${CPU}%"
    fi
fi

# Check uptime
if command -v ps >/dev/null 2>&1; then
    UPTIME=$(ps -o etime= -p $APP_PID 2>/dev/null)
    if [[ -n "$UPTIME" ]]; then
        echo "   Uptime: $UPTIME"
    fi
fi

echo ""

# Health check
echo -e "${BLUE}🏥 Health Check:${NC}"
if command -v curl >/dev/null 2>&1; then
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Health endpoint: OK${NC}"
    else
        echo -e "   ${RED}❌ Health endpoint: FAILED${NC}"
    fi
else
    echo "   ${YELLOW}⚠️  curl not available - cannot check health endpoint${NC}"
fi

# Check if port is listening
if command -v netstat >/dev/null 2>&1; then
    if netstat -tuln 2>/dev/null | grep ":5000 " >/dev/null; then
        echo -e "   ${GREEN}✅ Port 5000: LISTENING${NC}"
    else
        echo -e "   ${RED}❌ Port 5000: NOT LISTENING${NC}"
    fi
elif command -v ss >/dev/null 2>&1; then
    if ss -tuln 2>/dev/null | grep ":5000 " >/dev/null; then
        echo -e "   ${GREEN}✅ Port 5000: LISTENING${NC}"
    else
        echo -e "   ${RED}❌ Port 5000: NOT LISTENING${NC}"
    fi
else
    echo "   ${YELLOW}⚠️  netstat/ss not available - cannot check port status${NC}"
fi

echo ""

# Show recent logs
echo -e "${BLUE}📝 Recent Logs:${NC}"
if [[ -d "logs" ]]; then
    LATEST_LOG=$(ls -t logs/app_*.log 2>/dev/null | head -1)
    if [[ -n "$LATEST_LOG" ]]; then
        echo "   Latest log: $LATEST_LOG"
        echo "   Last 5 lines:"
        tail -5 "$LATEST_LOG" | sed 's/^/     /'
    else
        echo "   No log files found"
    fi
else
    echo "   Logs directory not found"
fi

echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "   Stop:     ./stop.sh"
echo "   Restart:  ./restart.sh"
echo "   Deploy:   ./deploy.sh [production|staging]"
echo "   Status:   ./status.sh"

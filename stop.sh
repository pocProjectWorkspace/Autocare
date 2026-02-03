#!/bin/bash

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=========================================="
echo "   AutoCare Platform - Stopping Services"
echo -e "==========================================${NC}"
echo ""

echo "[1/3] Stopping Backend API server..."
if [ -f ".pids/backend.pid" ]; then
    PID=$(cat .pids/backend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID > /dev/null 2>&1
        echo "Backend stopped (PID: $PID)"
    fi
    rm -f .pids/backend.pid
else
    # Try to kill by port
    PID=$(lsof -ti:8000)
    if [ ! -z "$PID" ]; then
        kill $PID > /dev/null 2>&1
        echo "Backend stopped"
    else
        echo "Backend not running"
    fi
fi

echo "[2/3] Stopping Web Dashboard..."
if [ -f ".pids/web.pid" ]; then
    PID=$(cat .pids/web.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID > /dev/null 2>&1
        echo "Web Dashboard stopped (PID: $PID)"
    fi
    rm -f .pids/web.pid
else
    # Try to kill by port
    PID=$(lsof -ti:3000)
    if [ ! -z "$PID" ]; then
        kill $PID > /dev/null 2>&1
        echo "Web Dashboard stopped"
    else
        echo "Web Dashboard not running"
    fi
fi

echo "[3/3] Stopping Docker services..."
docker-compose stop postgres redis minio > /dev/null 2>&1
echo "Docker services stopped."

echo ""
echo -e "${RED}=========================================="
echo "       All Services Stopped!"
echo -e "==========================================${NC}"
echo ""

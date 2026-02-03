#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "   AutoCare Platform - Starting Services"
echo -e "==========================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[ERROR] Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Create PID directory
mkdir -p .pids

echo "[1/4] Starting Docker services (PostgreSQL, Redis, MinIO)..."
docker-compose up -d postgres redis minio
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to start Docker services${NC}"
    exit 1
fi

echo "[2/4] Waiting for database to be ready..."
sleep 5

echo "[3/4] Starting Backend API server..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

# Start backend in background
nohup uvicorn app.main:app --reload --port 8000 > ../logs/backend.log 2>&1 &
echo $! > ../.pids/backend.pid
echo "Backend started (PID: $!)"

cd ..

echo "[4/4] Starting Web Dashboard..."
cd web

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
fi

# Create logs directory
mkdir -p ../logs

# Start web in background
nohup npm run dev > ../logs/web.log 2>&1 &
echo $! > ../.pids/web.pid
echo "Web Dashboard started (PID: $!)"

cd ..

echo ""
echo -e "${GREEN}=========================================="
echo "       All Services Started!"
echo -e "==========================================${NC}"
echo ""
echo "Backend API:     http://localhost:8000"
echo "API Docs:        http://localhost:8000/docs"
echo "Web Dashboard:   http://localhost:3000"
echo ""
echo "Logs available at: ./logs/"
echo ""
echo "To stop services, run: ./stop.sh"

#!/bin/bash

echo "=========================================="
echo "   AutoCare Platform - Development Setup"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker."
    exit 1
fi

echo "[1/4] Starting Docker services (PostgreSQL, Redis, MinIO)..."
docker-compose up -d postgres redis minio

echo ""
echo "[2/4] Waiting for services to be ready..."
sleep 10

echo ""
echo "[3/4] Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt -q

echo ""
echo "[4/4] Setting up Mobile App..."
cd ../mobile

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
fi

cd ..

echo ""
echo "=========================================="
echo "     Setup Complete!"
echo "=========================================="
echo ""
echo "To start the backend:"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  python -m app.seed   (first time only, seeds test data)"
echo "  uvicorn app.main:app --reload --port 8000"
echo ""
echo "To start the mobile app:"
echo "  cd mobile"
echo "  npx expo start"
echo ""
echo "API Documentation: http://localhost:8000/docs"
echo ""

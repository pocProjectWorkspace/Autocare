@echo off
title AutoCare Platform - Starting Services
color 0A

echo ==========================================
echo    AutoCare Platform - Starting Services
echo ==========================================
echo.

REM Check if Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/4] Starting Docker services (PostgreSQL, Redis, MinIO)...
docker-compose up -d postgres redis minio
if errorlevel 1 (
    echo [ERROR] Failed to start Docker services
    pause
    exit /b 1
)

echo [2/4] Waiting for database to be ready...
timeout /t 5 /nobreak > nul

echo [3/4] Starting Backend API server...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Start backend in a new window
start "AutoCare Backend" cmd /k "call venv\Scripts\activate && pip install -q -r requirements.txt && echo Starting FastAPI server... && uvicorn app.main:app --reload --port 8000"

cd ..

echo [4/4] Starting Web Dashboard...
cd web
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
)

REM Start web in a new window
start "AutoCare Web Dashboard" cmd /k "npm run dev"

cd ..

echo.
echo ==========================================
echo       All Services Started!
echo ==========================================
echo.
echo Backend API:     http://localhost:8000
echo API Docs:        http://localhost:8000/docs
echo Web Dashboard:   http://localhost:3000
echo.
echo Press any key to open the dashboard in browser...
pause > nul

start http://localhost:3000

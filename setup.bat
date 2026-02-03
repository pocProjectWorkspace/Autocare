@echo off
echo ==========================================
echo    AutoCare Platform - Development Setup
echo ==========================================
echo.

REM Check if Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo [1/4] Starting Docker services (PostgreSQL, Redis, MinIO)...
docker-compose up -d postgres redis minio

echo.
echo [2/4] Waiting for services to be ready...
timeout /t 10 /nobreak > nul

echo.
echo [3/4] Setting up Backend...
cd backend

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt -q

echo.
echo [4/4] Setting up Mobile App...
cd ..\mobile

if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

cd ..

echo.
echo ==========================================
echo      Setup Complete!
echo ==========================================
echo.
echo To start the backend:
echo   cd backend
echo   venv\Scripts\activate
echo   python -m app.seed   (first time only, seeds test data)
echo   uvicorn app.main:app --reload --port 8000
echo.
echo To start the mobile app:
echo   cd mobile
echo   npx expo start
echo.
echo API Documentation: http://localhost:8000/docs
echo.
pause

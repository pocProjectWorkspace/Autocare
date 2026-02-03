@echo off
title AutoCare Backend
color 0B

echo ==========================================
echo      AutoCare Backend - Starting
echo ==========================================
echo.

REM Start Docker services first
docker-compose up -d postgres redis minio

echo Waiting for database...
timeout /t 3 /nobreak > nul

cd backend

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate

echo Installing dependencies...
pip install -q -r requirements.txt

echo.
echo Starting FastAPI server on http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop
echo.

uvicorn app.main:app --reload --port 8000

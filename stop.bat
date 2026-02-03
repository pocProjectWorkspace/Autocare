@echo off
title AutoCare Platform - Stopping Services
color 0C

echo ==========================================
echo    AutoCare Platform - Stopping Services
echo ==========================================
echo.

echo [1/3] Stopping Backend API server...
REM Kill uvicorn processes
taskkill /F /FI "WINDOWTITLE eq AutoCare Backend*" > nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)
echo Backend stopped.

echo [2/3] Stopping Web Dashboard...
REM Kill vite/node processes for web
taskkill /F /FI "WINDOWTITLE eq AutoCare Web Dashboard*" > nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)
echo Web Dashboard stopped.

echo [3/3] Stopping Docker services...
docker-compose stop postgres redis minio > nul 2>&1
echo Docker services stopped.

echo.
echo ==========================================
echo       All Services Stopped!
echo ==========================================
echo.
pause

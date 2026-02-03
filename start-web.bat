@echo off
title AutoCare Web Dashboard
color 0D

echo ==========================================
echo     AutoCare Web Dashboard - Starting
echo ==========================================
echo.

cd web

if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
)

echo.
echo Starting Web Dashboard on http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo.

npm run dev

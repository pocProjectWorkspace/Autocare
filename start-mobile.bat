@echo off
title AutoCare Mobile App
color 0E

echo ==========================================
echo      AutoCare Mobile App - Starting
echo ==========================================
echo.

cd mobile

if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
)

echo.
echo Starting Expo development server...
echo.
echo Scan QR code with Expo Go app to run on device
echo Press 'w' to open in web browser
echo Press Ctrl+C to stop
echo.

npx expo start

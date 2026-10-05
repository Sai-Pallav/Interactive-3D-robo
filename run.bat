@echo off
title Interactive 3D Robo Studio
echo ===================================================
echo     Launching Interactive 3D Robo Studio...
echo ===================================================
echo.

if not exist "node_modules\" (
    echo [INFO] Installing required dependencies...
    call npm install
)

echo [INFO] Starting Vite development server...
start http://localhost:5180
npm run dev
pause

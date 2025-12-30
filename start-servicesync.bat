@echo off
title ServiceSync Launcher
color 0A

echo.
echo ========================================
echo       ServiceSync Development
echo ========================================
echo.

echo [1/2] Starting Backend Server (with auto-restart)...
echo Opening new window for backend...
start "ServiceSync Backend" cmd /k "cd /d %~dp0backend && echo Starting ServiceSync Backend with nodemon... && npm run dev"

echo.
echo [2/2] Waiting 3 seconds, then starting Frontend...
timeout /t 3 /nobreak >nul

echo Opening new window for frontend...
start "ServiceSync Frontend" cmd /k "cd /d %~dp0frontend\servicesync-frontend && echo Starting ServiceSync Frontend... && npm start"

echo.
echo ========================================
echo   ServiceSync is Starting Up!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Two new windows should have opened.
echo You can close this window now.
echo.
pause
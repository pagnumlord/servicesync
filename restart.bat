@echo off
echo ================================================
echo ServiceSync - Git Pull and Restart
echo ================================================
echo.

REM Navigate to project root
cd /d "%~dp0"

REM Git pull latest changes
echo [1/4] Pulling latest changes from git...
git pull
if errorlevel 1 (
    echo Error: Git pull failed!
    pause
    exit /b 1
)
echo.

REM Kill all running node processes
echo [2/4] Stopping all running instances...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo.

REM Start backend
echo [3/4] Starting backend server...
start "ServiceSync Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
echo.

REM Start frontend
echo [4/4] Starting frontend server...
start "ServiceSync Frontend" cmd /k "cd /d %~dp0frontend\servicesync-frontend && npm start"
echo.

echo ================================================
echo ServiceSync started successfully!
echo ================================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul

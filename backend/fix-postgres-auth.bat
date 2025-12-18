@echo off
REM PostgreSQL Authentication Fix Helper for Windows
REM This script helps diagnose and fix PostgreSQL authentication issues

echo ========================================
echo PostgreSQL Authentication Fix Helper
echo ========================================
echo.

REM Step 1: Test the connection
echo Step 1: Testing database connection...
echo.
node test-db-connection.js
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Database connection works!
    echo ========================================
    pause
    exit /b 0
)

echo.
echo ========================================
echo Connection failed. Let's fix it!
echo ========================================
echo.

REM Step 2: Find pg_hba.conf
echo Step 2: Locating PostgreSQL configuration...
echo.

set "PGHBA=C:\Program Files\PostgreSQL\17\data\pg_hba.conf"
if exist "%PGHBA%" (
    echo Found: %PGHBA%
    echo.
) else (
    echo pg_hba.conf not found at default location.
    echo Please locate it manually in your PostgreSQL installation.
    echo.
    pause
    exit /b 1
)

REM Step 3: Backup and show current config
echo Step 3: Backing up current configuration...
echo.
copy "%PGHBA%" "%PGHBA%.backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Backup created successfully!
) else (
    echo WARNING: Could not create backup. You may need to run as Administrator.
    echo Right-click this .bat file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)
echo.

REM Step 4: Instructions for manual fix
echo ========================================
echo MANUAL FIX REQUIRED
echo ========================================
echo.
echo Please follow these steps:
echo.
echo 1. Open Notepad as Administrator:
echo    - Press Windows key
echo    - Type "notepad"
echo    - Right-click Notepad
echo    - Select "Run as administrator"
echo.
echo 2. In Notepad, open: %PGHBA%
echo.
echo 3. Look for lines that start with "host" like:
echo    host    all    all    127.0.0.1/32    METHOD
echo    host    all    all    ::1/128         METHOD
echo.
echo 4. Change the METHOD at the end to "md5":
echo    host    all    all    127.0.0.1/32    md5
echo    host    all    all    ::1/128         md5
echo.
echo 5. Save the file
echo.
echo 6. Restart PostgreSQL:
echo    - Press Windows + R
echo    - Type: services.msc
echo    - Find "postgresql-x64-17"
echo    - Right-click and select "Restart"
echo.
echo 7. Run this script again to test the connection
echo.
pause

REM Offer to open files
echo.
echo Would you like to open the configuration file now? (Y/N)
set /p OPENFILE=
if /i "%OPENFILE%"=="Y" (
    echo Opening pg_hba.conf...
    notepad "%PGHBA%"
    echo.
    echo After making changes, restart PostgreSQL and run this script again.
    echo.
)

echo.
echo ========================================
echo After fixing, press any key to test again
echo ========================================
pause
node test-db-connection.js

@echo off
echo.
echo ========================================
echo   ServiceSync Schema Application
echo ========================================
echo.
echo This will apply all database schemas...
echo.

SET PGPASSWORD=SevenSins58!^&

"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d servicesync_dev -f init-all-schemas.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   SUCCESS! All schemas applied
    echo ========================================
    echo.
    echo You can now restart the backend server.
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR! Schema application failed
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause

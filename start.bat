@echo off
title Counselor Workbench
cd /d "%~dp0"

if not exist "backend\data" mkdir "backend\data"

echo ============================================
echo   Counselor Agent Workbench - Launcher
echo ============================================
echo.

echo [1/2] Checking Python dependencies...
python -c "import fastapi, openpyxl, pdfplumber" 2>nul
if errorlevel 1 (
    echo   First run: installing dependencies, please wait...
    python -m pip install -r backend\requirements.txt -q
    if errorlevel 1 (
        echo   [ERROR] Failed to install dependencies.
        echo   Please run manually:  python -m pip install -r backend\requirements.txt
        pause
        exit /b 1
    )
)

echo [2/2] Starting server on 0.0.0.0:8321 ...
start "counselor-server" /min cmd /c "cd /d %~dp0 && python backend\main.py > backend\data\server.log 2>&1"

echo   Waiting for server to be ready...
python backend\wait_health.py

if errorlevel 1 (
    echo   [ERROR] Server did not start. Check log: backend\data\server.log
    type backend\data\server.log 2>nul
    pause
    exit /b 1
)

start "" "http://127.0.0.1:8321"

echo.
echo   Server is running at http://127.0.0.1:8321
echo   Public entry (share with students): http://YOUR-IP:8321/#/public
echo   Stop server: close the minimized "counselor-server" window.
echo.
pause

@echo off
echo ========================================================
echo   AI Inventory Management System - Quick Launcher
echo ========================================================
echo.
echo Starting Backend on http://localhost:8000 ...
start "AI Inventory - Backend (Port 8000)" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Frontend on http://localhost:3000 ...
start "AI Inventory - Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All services launched!
echo - Frontend: http://localhost:3000
echo - Backend API Docs: http://localhost:8000/docs
echo - Backend Health:   http://localhost:8000/health
echo ========================================================

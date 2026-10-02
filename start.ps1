# AI Inventory Management System - PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   AI Inventory Management System - Quick Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`nStarting Backend on http://localhost:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir/backend'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "Starting Frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir/frontend'; npm run dev"

Write-Host "`nAll services launched!" -ForegroundColor Green
Write-Host "- Frontend:         http://localhost:3000"
Write-Host "- Backend API Docs: http://localhost:8000/docs"
Write-Host "- Backend Health:   http://localhost:8000/health"

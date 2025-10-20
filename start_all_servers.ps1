# PDF Editor - PowerShell Startup Script
# This script starts both backend and frontend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     PDF Editor Development Setup" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting both Backend and Frontend servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend will run on: http://localhost:5001" -ForegroundColor Green
Write-Host "Frontend will run on: http://localhost:3001" -ForegroundColor Green
Write-Host ""

# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'f:\CodeTests\PdfEditor\pdf-annotation-app\backend'; Write-Host 'PDF Editor Backend Server' -ForegroundColor Green; python app.py"

# Wait for backend to initialize
Start-Sleep -Seconds 3

# Start Frontend Server  
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'f:\CodeTests\PdfEditor\pdf-annotation-app\frontend'; Write-Host 'PDF Editor Frontend Server' -ForegroundColor Green; `$env:PORT='3001'; `$env:BROWSER='none'; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Both servers are starting in separate windows" -ForegroundColor Green
Write-Host "Backend: http://localhost:5001" -ForegroundColor Green  
Write-Host "Frontend: http://localhost:3001" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Yellow
Read-Host
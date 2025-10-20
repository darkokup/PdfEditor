@echo off
title PDF Editor - Start All Servers
echo ========================================
echo     PDF Editor Development Setup
echo ========================================
echo.
echo Starting both Backend and Frontend servers...
echo.
echo Backend will run on: http://localhost:5001
echo Frontend will run on: http://localhost:3001
echo.
echo Press any key to start both servers...
pause >nul

echo.
echo Starting Backend Server...
start "PDF Editor Backend" cmd /k "cd /d "f:\CodeTests\PdfEditor\pdf-annotation-app\backend" && python app.py"

echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend Server...
start "PDF Editor Frontend" cmd /k "cd /d "f:\CodeTests\PdfEditor\pdf-annotation-app\frontend" && set PORT=3001 && set BROWSER=none && npm start"

echo.
echo ========================================
echo Both servers are starting in separate windows
echo Backend: http://localhost:5001
echo Frontend: http://localhost:3001
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
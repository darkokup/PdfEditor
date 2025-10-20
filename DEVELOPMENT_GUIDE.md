# PDF Editor Development Setup

This project contains a PDF annotation application with React frontend and Flask backend.

## Quick Start

### Option 1: Start All Servers (Recommended)
Double-click one of these files:
- `start_all_servers.bat` - Batch file version
- `start_all_servers.ps1` - PowerShell version (run with "Run with PowerShell")

### Option 2: Start Servers Individually
- Backend: Double-click `start_backend.bat`
- Frontend: Double-click `start_frontend_simple.bat`

## Server URLs
- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:5001

## Features
- Default annotation borders: No Line
- Click annotation to show resize handles
- Double-click annotation to edit
- Icon-based menu (remove/settings)
- Proper boundary handling for resizing

## Manual Start (if needed)

### Backend
```bash
cd pdf-annotation-app/backend
python app.py
```

### Frontend  
```bash
cd pdf-annotation-app/frontend
set PORT=3001
set BROWSER=none
npm start
```

## Troubleshooting
- Make sure Python and Node.js are installed
- If ports are in use, close existing servers first
- Frontend requires port 3001, backend uses port 5001
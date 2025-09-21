# PDF Annotation Application

A web-based PDF annotation tool that allows users to add interactive controls (text boxes, date pickers) to PDF documents, save projects, and print annotated documents.

## Features

- Upload and view PDF documents
- Drag and drop text boxes and date controls onto PDF pages
- Save/load projects with PDF and annotation data
- Print annotated PDFs
- Local file storage for projects

## Architecture

- **Frontend**: React.js with react-pdf for PDF rendering
- **Backend**: Python Flask/FastAPI for PDF processing and file handling
- **Storage**: Local binary files containing project data

## Getting Started

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

## Project Structure

```
pdf-annotation-app/
├── frontend/           # React application
├── backend/           # Python Flask/FastAPI server
├── projects/          # Saved project files
└── README.md
```
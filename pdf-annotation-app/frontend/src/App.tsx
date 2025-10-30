import React, { useState } from 'react';
import CleanPDFViewer from './components/CleanPDFViewer';
import SimplePDFDisplay from './components/SimplePDFDisplay';
import ControlPalette from './components/ControlPalette';
import ProjectManager from './components/ProjectManager';
import FontLoader from './FontLoader';
import { Annotation, ProjectData } from './types';
import { api } from './api';
import './App.css';

const App: React.FC = () => {
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [isAddingControl, setIsAddingControl] = useState<'text' | 'date' | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const response = await api.uploadPdf(file);
      setPdfData(response.pdf_data);
      setPdfFilename(response.filename);
      setAnnotations([]);
      setCurrentProject(null);
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Error uploading PDF file: ${errorMessage}`);
    }
  };

  const handleAnnotationAdd = (annotation: Omit<Annotation, 'id' | 'created_at'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  };

  const handleAnnotationUpdate = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev =>
      prev.map(ann => ann.id === id ? { ...ann, ...updates } : ann)
    );
  };

  const handleAnnotationDelete = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const handleSaveProject = async () => {
    if (!pdfData) {
      alert('No PDF loaded to save');
      return;
    }

    try {
      const projectData = {
        pdf_data: pdfData,
        pdf_filename: pdfFilename,
        annotations,
        metadata: {
          saved_at: new Date().toISOString(),
        },
      };

      const response = await api.saveProject(projectData);
      alert(`Project saved successfully! ID: ${response.project_id}`);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project');
    }
  };

  const handleProjectLoad = (projectResponse: any) => {
    const { project_data, pdf_data } = projectResponse;
    setPdfData(pdf_data);
    setPdfFilename(project_data.pdf_filename);
    setAnnotations(project_data.annotations);
    setCurrentProject(project_data);
  };

  const handleNewProject = () => {
    setPdfData(null);
    setPdfFilename('');
    setAnnotations([]);
    setCurrentProject(null);
  };

  const handlePrint = async () => {
    if (!pdfData) {
      alert('No PDF to print');
      return;
    }

    try {
      const blob = await api.generatePdf(pdfData, annotations);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'annotated_document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF for print');
    }
  };

  const handleAddText = () => {
    setIsAddingControl('text');
  };

  const handleAddDate = () => {
    setIsAddingControl('date');
  };

  const handlePDFClick = (annotation: Omit<Annotation, 'id' | 'created_at'>) => {
    if (isAddingControl) {
      const newAnnotation = {
        ...annotation,
        type: isAddingControl,
        value: isAddingControl === 'text' ? 'Enter text...' : new Date().toLocaleDateString(),
      };
      handleAnnotationAdd(newAnnotation);
      setIsAddingControl(null);
    } else {
      handleAnnotationAdd(annotation);
    }
  };

  const handleInsertPageBefore = async (pageIndex: number) => {
    if (!pdfData) return;
    
    try {
      const response = await api.insertPage(pdfData, pageIndex, 'before');
      if (response.success) {
        setPdfData(response.pdfData);
      } else {
        console.error('Failed to insert page:', response.error);
        alert('Failed to insert page. Please try again.');
      }
    } catch (error) {
      console.error('Error inserting page:', error);
      alert('Error inserting page. Please try again.');
    }
  };

  const handleInsertPageAfter = async (pageIndex: number) => {
    if (!pdfData) return;
    
    try {
      const response = await api.insertPage(pdfData, pageIndex, 'after');
      if (response.success) {
        setPdfData(response.pdfData);
      } else {
        console.error('Failed to insert page:', response.error);
        alert('Failed to insert page. Please try again.');
      }
    } catch (error) {
      console.error('Error inserting page:', error);
      alert('Error inserting page. Please try again.');
    }
  };

  return (
    <div className="app">
      <FontLoader />
      <header className="app-header">
        <h1>PDF Annotation Tool</h1>
        <div className="header-controls">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            id="pdf-upload"
            className="hidden-input"
          />
          <label htmlFor="pdf-upload" className="upload-btn">
            📄 Upload PDF
          </label>
          
          {pdfData && (
            <>
              <button onClick={handleSaveProject} className="save-btn">
                💾 Save Project
              </button>
              <button onClick={handlePrint} className="print-btn">
                🖨️ Print PDF
              </button>
            </>
          )}
        </div>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <ProjectManager 
            onProjectLoad={handleProjectLoad}
            onNewProject={handleNewProject}
          />
          
          {pdfData && (
            <ControlPalette 
              onAddText={handleAddText}
              onAddDate={handleAddDate}
            />
          )}
          
          {currentProject && (
            <div className="project-info">
              <h4>Current Project</h4>
              <p><strong>File:</strong> {currentProject.pdf_filename}</p>
              <p><strong>Annotations:</strong> {annotations.length}</p>
              <p><strong>Created:</strong> {new Date(currentProject.created_at).toLocaleDateString()}</p>
            </div>
          )}
          
          {isAddingControl && (
            <div className="add-control-mode">
              <p>Click on the PDF to add a {isAddingControl} control</p>
              <button onClick={() => setIsAddingControl(null)}>Cancel</button>
            </div>
          )}
        </aside>

        <main className="main-content">
          {pdfData ? (
            <CleanPDFViewer
              pdfData={pdfData}
              annotations={annotations}
              onAnnotationAdd={handlePDFClick}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={handleAnnotationDelete}
              onInsertPageBefore={handleInsertPageBefore}
              onInsertPageAfter={handleInsertPageAfter}
            />
          ) : (
            <SimplePDFDisplay 
              pdfData={pdfData}
              filename={pdfFilename}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

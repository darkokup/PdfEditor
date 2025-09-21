import React, { useState } from 'react';
import { Annotation } from '../types';

interface WorkingPDFViewerProps {
  pdfData: string | null;
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Omit<Annotation, 'id' | 'created_at'>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
}

const WorkingPDFViewer: React.FC<WorkingPDFViewerProps> = ({
  pdfData,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
}) => {
  const [addMode, setAddMode] = useState(false);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!addMode) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const annotation = {
      type: 'text' as const,
      x: x,
      y: y,
      width: 120,
      height: 30,
      page: 1, // Default to page 1 for now
      value: 'New Text'
    };
    
    onAnnotationAdd(annotation);
    setAddMode(false); // Exit add mode after adding
  };

  const handleDownloadAnnotatedPDF = async () => {
    try {
      console.log('=== Frontend PDF Download ===');
      console.log('PDF data length:', pdfData ? pdfData.length : 'null');
      console.log('Number of annotations:', annotations.length);
      console.log('Annotations:', annotations);
      
      const response = await fetch('http://localhost:5001/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_data: pdfData,
          annotations: annotations
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const blob = await response.blob();
        console.log('Received blob size:', blob.size);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annotated_document.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('Download initiated');
      } else {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        alert('Error generating annotated PDF: ' + errorText);
      }
    } catch (error) {
      console.error('Error downloading annotated PDF:', error);
      alert('Error downloading annotated PDF: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (!pdfData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', border: '2px dashed #ccc' }}>
        <h3>No PDF loaded</h3>
        <p>Upload a PDF file to get started</p>
      </div>
    );
  }

  const pdfUrl = `data:application/pdf;base64,${pdfData}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc', backgroundColor: '#f8f9fa' }}>
        <h3>PDF Viewer</h3>
        <p>Annotations: {annotations.length}</p>
        <button 
          onClick={() => {
            setAddMode(!addMode);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: addMode ? '#28a745' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {addMode ? 'Cancel Add Mode' : 'Add Text Box'}
        </button>
        {addMode && (
          <p style={{ color: '#007bff', fontSize: '14px', margin: '5px 0' }}>
            Click on the PDF to add a text control
          </p>
        )}
        <button
          onClick={handleDownloadAnnotatedPDF}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            textDecoration: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          Download Annotated PDF
        </button>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        <object
          data={pdfUrl}
          type="application/pdf"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        >
          <p>Your browser doesn't support PDFs. 
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Click here to open the PDF in a new tab.
            </a>
          </p>
        </object>
        
        {/* Annotation overlay */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: addMode ? 'auto' : 'none',
            zIndex: 10,
            cursor: addMode ? 'crosshair' : 'default'
          }}
          onClick={addMode ? handleOverlayClick : undefined}
        >
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              style={{
                position: 'absolute',
                left: `${annotation.x}px`,
                top: `${annotation.y}px`,
                width: `${annotation.width}px`,
                height: `${annotation.height}px`,
                backgroundColor: 'rgba(255, 255, 0, 0.3)',
                border: '2px solid #ffeb3b',
                borderRadius: '4px',
                pointerEvents: 'auto',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              onClick={() => {
                const newValue = prompt('Edit annotation:', annotation.value);
                if (newValue !== null) {
                  onAnnotationUpdate(annotation.id, { value: newValue });
                }
              }}
            >
              {annotation.value}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnnotationDelete(annotation.id);
                }}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkingPDFViewer;
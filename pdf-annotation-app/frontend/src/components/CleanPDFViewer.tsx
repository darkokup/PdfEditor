import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Annotation } from '../types';
import AnnotationOverlaySimple from './AnnotationOverlaySimple';
import './PDFViewer.css';

// Set up PDF.js worker - using jsDelivr CDN which is more reliable
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfData: string | null;
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Omit<Annotation, 'id' | 'created_at'>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfData,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
  }, []);

  const handlePageDrop = useCallback((x: number, y: number, type: 'text' | 'date') => {
    const newAnnotation: Omit<Annotation, 'id' | 'created_at'> = {
      type,
      x,
      y,
      width: type === 'text' ? 200 : 150,
      height: 30,
      page: currentPage - 1,
      value: type === 'text' ? 'Enter text...' : new Date().toLocaleDateString(),
    };
    onAnnotationAdd(newAnnotation);
  }, [currentPage, onAnnotationAdd]);

  const handleAnnotationUpdate = useCallback((annotationId: string, value: string) => {
    onAnnotationUpdate(annotationId, { value });
  }, [onAnnotationUpdate]);

  const goToPrevious = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNext = () => {
    setCurrentPage(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  if (!pdfData) {
    return (
      <div className="pdf-viewer-placeholder">
        <div className="placeholder-content">
          <h3>No PDF loaded</h3>
          <p>Upload a PDF file to get started</p>
        </div>
      </div>
    );
  }

  const pdfBlob = new Blob([
    Uint8Array.from(atob(pdfData), c => c.charCodeAt(0))
  ], { type: 'application/pdf' });

  const pdfUrl = URL.createObjectURL(pdfBlob);

  const currentPageAnnotations = annotations.filter(ann => ann.page === currentPage - 1);

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <div className="navigation-controls">
          <button onClick={goToPrevious} disabled={currentPage <= 1}>
            Previous
          </button>
          <span>
            Page {currentPage} of {numPages}
          </span>
          <button onClick={goToNext} disabled={currentPage >= numPages}>
            Next
          </button>
        </div>
        
        <div className="zoom-controls">
          <button onClick={zoomOut} disabled={scale <= 0.5}>
            Zoom Out
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 3.0}>
            Zoom In
          </button>
        </div>
      </div>

      <div className="pdf-container">
        <div className="pdf-page-wrapper">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div>Loading PDF...</div>}
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          
          <AnnotationOverlaySimple
            annotations={currentPageAnnotations}
            scale={scale}
            onDrop={handlePageDrop}
            onAnnotationUpdate={handleAnnotationUpdate}
            onAnnotationDelete={onAnnotationDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
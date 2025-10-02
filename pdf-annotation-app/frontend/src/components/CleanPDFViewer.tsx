import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { Annotation } from '../types';
import AnnotationOverlaySimple from './AnnotationOverlaySimple';
import './PDFViewer.css';

// Import required CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
  const [pageInputValue, setPageInputValue] = useState<string>('1'); // For the page input box
  const [scale, setScale] = useState<number>(1.0);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState<boolean>(false);
  const [annotationMode, setAnnotationMode] = useState<'text' | 'date' | null>(null);

  // Configure PDF.js worker with multiple fallback methods
  useEffect(() => {
    const configureWorker = () => {
      // Method 1: Try global pdfjsLib
      if ((window as any).pdfjsLib && (window as any).pdfjsLib.GlobalWorkerOptions) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        console.log('PDF.js worker configured via global pdfjsLib');
        return true;
      }
      
      // Method 2: Try requiring pdfjs-dist directly
      try {
        const pdfjs = require('pdfjs-dist');
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          console.log('PDF.js worker configured via require');
          return true;
        }
      } catch (e) {
        console.log('require method failed:', e);
      }
      
      // Method 3: Try dynamic import
      import('pdfjs-dist').then(pdfjs => {
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          console.log('PDF.js worker configured via dynamic import');
        }
      }).catch(e => {
        console.log('dynamic import failed:', e);
      });
      
      return false;
    };
    
    // Try immediately
    if (!configureWorker()) {
      // Try again after a delay
      const timer = setTimeout(() => {
        configureWorker();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Ref to track the current blob URL for cleanup
  const pdfUrlRef = useRef<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Handle PDF data changes and create blob URL
  useEffect(() => {
    // Clean up the previous URL if it exists
    if (pdfUrlRef.current) {
      console.log('Cleaning up previous blob URL:', pdfUrlRef.current);
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }

    if (!pdfData) {
      console.log('No PDF data available');
      setPdfUrl(null);
      return;
    }
    
    console.log('Creating new blob URL from PDF data, length:', pdfData.length);
    
    // Validate base64 data
    try {
      // Test if it's valid base64
      const testDecode = atob(pdfData.substring(0, 100)); // Test first 100 chars
      console.log('Base64 decode test successful, first 10 bytes:', 
        Array.from(testDecode.substring(0, 10)).map(c => c.charCodeAt(0).toString(16)).join(' '));
    } catch (e) {
      console.error('Invalid base64 data:', e);
      setPdfUrl(null);
      return;
    }
    
    try {
      const pdfBlob = new Blob([
        Uint8Array.from(atob(pdfData), c => c.charCodeAt(0))
      ], { type: 'application/pdf' });

      console.log('PDF blob created, size:', pdfBlob.size);
      
      const url = URL.createObjectURL(pdfBlob);
      console.log('Blob URL created:', url);
      
      pdfUrlRef.current = url;
      setPdfUrl(url);
    } catch (error) {
      console.error('Error creating PDF blob:', error);
      setPdfUrl(null);
    }
  }, [pdfData]);

  // Clean up the blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, []); // Empty dependency array - only cleanup on unmount

  // Add keyboard and mouse wheel event listeners for zoom controls
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          setScale(prev => Math.min(3.0, prev + 0.2));
        } else if (e.key === '-') {
          e.preventDefault();
          setScale(prev => Math.max(0.5, prev - 0.2));
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY > 0) {
          // Scrolling down - zoom out
          setScale(prev => Math.max(0.5, prev - 0.1));
        } else {
          // Scrolling up - zoom in
          setScale(prev => Math.min(3.0, prev + 0.1));
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF document loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setCurrentPage(1);
    setPageInputValue('1'); // Reset page input to 1
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    console.log('PDF URL that failed:', pdfUrl);
    console.log('PDF data length:', pdfData?.length);
    // Don't reset state on error to avoid infinite reload loops
  }, [pdfUrl, pdfData]);

  const handlePageDrop = useCallback((x: number, y: number) => {
    // Only add annotation if a mode is selected
    if (!annotationMode) return;
    
    const newAnnotation: Omit<Annotation, 'id' | 'created_at'> = {
      type: annotationMode,
      x,
      y,
      width: annotationMode === 'text' ? 200 : 150,
      height: 30,
      page: currentPage - 1, // Convert to 0-based indexing for backend
      value: annotationMode === 'text' ? 'Enter text...' : new Date().toLocaleDateString(),
    };
    onAnnotationAdd(newAnnotation);
  }, [currentPage, onAnnotationAdd, annotationMode]);

  const handleAnnotationUpdate = useCallback((annotationId: string, updates: Partial<Annotation>) => {
    onAnnotationUpdate(annotationId, updates);
  }, [onAnnotationUpdate]);

  const goToPrevious = () => {
    setCurrentPage(prev => {
      const newPage = Math.max(1, prev - 1);
      setPageInputValue(newPage.toString());
      return newPage;
    });
  };

  const goToNext = () => {
    setCurrentPage(prev => {
      const newPage = Math.min(numPages, prev + 1);
      setPageInputValue(newPage.toString());
      return newPage;
    });
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for editing, or valid numbers within range
    if (value === '' || (/^\d+$/.test(value) && parseInt(value, 10) <= numPages)) {
      setPageInputValue(value);
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInputValue, 10);
    
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > numPages) {
      // Reset to current page if invalid
      setPageInputValue(currentPage.toString());
      return;
    }
    
    setCurrentPage(pageNumber);
  };

  const handlePageInputBlur = () => {
    handlePageInputSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const handlePageInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit(e as any);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const handleTextModeToggle = () => {
    setAnnotationMode(current => current === 'text' ? null : 'text');
  };

  const handleDateModeToggle = () => {
    setAnnotationMode(current => current === 'date' ? null : 'date');
  };

  if (!pdfData || !pdfUrl) {
    return (
      <div className="pdf-viewer-placeholder">
        <div className="placeholder-content">
          <h3>No PDF loaded</h3>
          <p>Upload a PDF file to get started</p>
        </div>
      </div>
    );
  }

  const currentPageAnnotations = annotations.filter(ann => ann.page === currentPage - 1);

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <div className="navigation-controls">
          <button onClick={goToPrevious} disabled={currentPage <= 1} title="Previous Page">
            ◀
          </button>
          <form onSubmit={handlePageInputSubmit} className="page-input-form">  
            <input
              type="text"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onBlur={handlePageInputBlur}
              onKeyDown={handlePageInputKeyPress}
              className="page-input"
              title="Enter page number"
            />
            <span>| {numPages}</span>
          </form>
          <button onClick={goToNext} disabled={currentPage >= numPages} title="Next Page">
            ▶
          </button>
        </div>
        
        <div className="annotation-controls">
          <button 
            onClick={handleTextModeToggle} 
            className={`annotation-mode-btn ${annotationMode === 'text' ? 'active' : ''}`}
            title="Add Text Annotation"
          >
            T
          </button>
          <button 
            onClick={handleDateModeToggle} 
            className={`annotation-mode-btn ${annotationMode === 'date' ? 'active' : ''}`}
            title="Add Date Annotation"
          >
            📅
          </button>
        </div>
        
        <div className="zoom-controls">
          <button onClick={zoomOut} disabled={scale <= 0.5} title="Zoom Out">
            -
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 3.0} title="Zoom In">
            +
          </button>
        </div>
      </div>

      <div className="pdf-container">
        <div className="pdf-content-wrapper">
          <div className="pdf-page-wrapper">
            {(() => {
              console.log('Rendering Document with URL:', pdfUrl);
              return null;
            })()}
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div>Loading PDF...</div>}
              key={pdfData ? 'pdf-loaded' : 'no-pdf'}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={<div>Loading page...</div>}
                error={<div>Error loading page</div>}
                onLoadSuccess={() => {/* Page loaded successfully */}}
                onLoadError={(error) => console.warn('Page load error:', error)}
              />
            </Document>
            
            <AnnotationOverlaySimple
              annotations={currentPageAnnotations}
              scale={scale}
              onDrop={handlePageDrop}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={onAnnotationDelete}
              isSettingsDialogOpen={isSettingsDialogOpen}
              onSettingsDialogOpenChange={setIsSettingsDialogOpen}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
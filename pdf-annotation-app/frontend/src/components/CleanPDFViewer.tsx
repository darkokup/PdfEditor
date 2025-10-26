import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { Annotation } from '../types';
import AnnotationOverlaySimple from './AnnotationOverlaySimple';
import InsertPageDialog from './InsertPageDialog';
import DeleteSelectedConfirmationDialog from './DeleteSelectedConfirmationDialog';
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
  onInsertPageBefore?: (pageIndex: number) => void;
  onInsertPageAfter?: (pageIndex: number) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfData,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  onInsertPageBefore,
  onInsertPageAfter,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInputValue, setPageInputValue] = useState<string>('1'); // For the page input box
  const [scale, setScale] = useState<number>(1.0);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState<boolean>(false);
  const [annotationMode, setAnnotationMode] = useState<'annotation' | null>(null);
  const [continuousScroll, setContinuousScroll] = useState<boolean>(true); // New state for continuous scrolling
  const containerRef = useRef<HTMLDivElement>(null); // Ref for scroll container
  const [showInsertPageDialog, setShowInsertPageDialog] = useState<boolean>(false); // Dialog for page insertion
  const [selectedAnnotations, setSelectedAnnotations] = useState<Set<string>>(new Set()); // Track selected annotation IDs
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false); // Dialog for delete confirmation

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

  // Add scroll listener to update current page in continuous mode
  useEffect(() => {
    if (!continuousScroll || !containerRef.current) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const pageHeight = 842 * scale + 20; // A4 height + margin
      const scrollTop = containerRef.current.scrollTop;
      const newCurrentPage = Math.floor(scrollTop / pageHeight) + 1;
      
      if (newCurrentPage !== currentPage && newCurrentPage >= 1 && newCurrentPage <= numPages) {
        setCurrentPage(newCurrentPage);
        setPageInputValue(newCurrentPage.toString());
      }
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [continuousScroll, scale, currentPage, numPages]);

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

  const handlePageDrop = useCallback((x: number, y: number, pageIndex?: number) => {
    // Only add annotation if a mode is selected
    if (!annotationMode) return;
    
    // Use provided pageIndex if available (for continuous mode), otherwise use currentPage
    const targetPage = pageIndex !== undefined ? pageIndex : currentPage - 1;
    
    const newAnnotation: Omit<Annotation, 'id' | 'created_at'> = {
      type: 'text', // Always default to text, user can change type in the annotation dialog
      x,
      y,
      width: 200,
      height: 30,
      page: targetPage, // Use calculated target page
      value: 'Annotation',
      borderStyle: 'none', // Default to "No Line" for new annotations
    };
    onAnnotationAdd(newAnnotation);
  }, [currentPage, onAnnotationAdd, annotationMode]);

  // Create a page-specific drop handler for continuous mode
  const createPageDropHandler = useCallback((pageIndex: number) => {
    return (x: number, y: number) => handlePageDrop(x, y, pageIndex);
  }, [handlePageDrop]);

  const handleAnnotationUpdate = useCallback((annotationId: string, updates: Partial<Annotation>) => {
    onAnnotationUpdate(annotationId, updates);
  }, [onAnnotationUpdate]);

  const goToPrevious = () => {
    if (continuousScroll) {
      // Smooth scroll to previous page
      const pageHeight = 842 * scale + 20; // A4 height + margin
      if (containerRef.current) {
        containerRef.current.scrollBy({
          top: -pageHeight,
          behavior: 'smooth'
        });
      }
    } else {
      // Instant page switch
      setCurrentPage(prev => {
        const newPage = Math.max(1, prev - 1);
        setPageInputValue(newPage.toString());
        return newPage;
      });
    }
  };

  const goToNext = () => {
    if (continuousScroll) {
      // Smooth scroll to next page
      const pageHeight = 842 * scale + 20; // A4 height + margin
      if (containerRef.current) {
        containerRef.current.scrollBy({
          top: pageHeight,
          behavior: 'smooth'
        });
      }
    } else {
      // Instant page switch
      setCurrentPage(prev => {
        const newPage = Math.min(numPages, prev + 1);
        setPageInputValue(newPage.toString());
        return newPage;
      });
    }
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
    
    if (continuousScroll) {
      // Smooth scroll to specific page
      const pageHeight = 842 * scale + 20; // A4 height + margin
      const targetScrollTop = (pageNumber - 1) * pageHeight;
      
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    } else {
      setCurrentPage(pageNumber);
    }
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

  const handleAnnotationModeToggle = () => {
    setAnnotationMode(current => current === 'annotation' ? null : 'annotation');
  };

  const toggleContinuousScroll = () => {
    setContinuousScroll(prev => !prev);
  };

  const handleInsertPageClick = () => {
    setShowInsertPageDialog(true);
  };

  const handleInsertBefore = () => {
    if (onInsertPageBefore) {
      onInsertPageBefore(currentPage - 1); // Convert to 0-based index
    }
  };

  const handleInsertAfter = () => {
    if (onInsertPageAfter) {
      onInsertPageAfter(currentPage - 1); // Convert to 0-based index
    }
  };

  const handleAnnotationDeleteMultiple = useCallback((ids: string[]) => {
    // Delete all annotations with the given IDs
    ids.forEach(id => onAnnotationDelete(id));
    // Clear selection after deleting
    setSelectedAnnotations(new Set());
  }, [onAnnotationDelete]);

  const handleRemoveFromSelection = useCallback((id: string) => {
    setSelectedAnnotations(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    const selectedIds = Array.from(selectedAnnotations);
    handleAnnotationDeleteMultiple(selectedIds);
    setShowDeleteConfirmation(false);
  }, [selectedAnnotations, handleAnnotationDeleteMultiple]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirmation(false);
  }, []);

  // Sort annotations by page number first, then by vertical position (y)
  const getSortedAnnotations = useCallback(() => {
    return [...annotations].sort((a, b) => {
      if (a.page !== b.page) {
        return a.page - b.page;
      }
      return a.y - b.y;
    });
  }, [annotations]);

  // Selection handlers
  const handleAnnotationSelect = useCallback((id: string, ctrlKey: boolean, shiftKey: boolean) => {
    if (shiftKey) {
      // Range selection mode: select from last selected to clicked annotation
      const sortedAnnotations = getSortedAnnotations();
      
      // Find the anchor (last selected annotation or first annotation)
      let anchorId: string;
      if (selectedAnnotations.size > 0) {
        const selectedIds = Array.from(selectedAnnotations);
        anchorId = selectedIds[selectedIds.length - 1];
      } else {
        // No selection - start from first annotation
        anchorId = sortedAnnotations[0]?.id;
      }
      
      if (anchorId) {
        const anchorIndex = sortedAnnotations.findIndex(ann => ann.id === anchorId);
        const clickedIndex = sortedAnnotations.findIndex(ann => ann.id === id);
        
        if (anchorIndex >= 0 && clickedIndex >= 0) {
          // Select all annotations between anchor and clicked (inclusive)
          const startIndex = Math.min(anchorIndex, clickedIndex);
          const endIndex = Math.max(anchorIndex, clickedIndex);
          const rangeIds = sortedAnnotations
            .slice(startIndex, endIndex + 1)
            .map(ann => ann.id);
          
          setSelectedAnnotations(new Set(rangeIds));
        }
      }
    } else if (ctrlKey) {
      // Toggle selection mode: add or remove from selection
      setSelectedAnnotations(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      // Single-select mode: select only this annotation
      setSelectedAnnotations(new Set([id]));
    }
  }, [selectedAnnotations, getSortedAnnotations]);

  const handleClearSelection = useCallback(() => {
    setSelectedAnnotations(new Set());
  }, []);

  // Keyboard shortcuts: DEL to delete selected annotations, ESC to clear selection
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Handle DEL key - show confirmation before deleting selected annotations
      if (e.key === 'Delete' && selectedAnnotations.size > 0) {
        e.preventDefault();
        setShowDeleteConfirmation(true);
        return;
      }
      
      // Handle ESC key
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedAnnotations.size > 0) {
          // Clear selection if annotations are selected
          handleClearSelection();
        } else if (annotationMode === 'annotation') {
          // Toggle off annotation mode if no selection
          setAnnotationMode(null);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [selectedAnnotations, handleClearSelection, annotationMode]);

  // Navigate to the next annotation
  const goToNextAnnotation = useCallback(() => {
    if (annotations.length === 0) return;
    
    const sortedAnnotations = getSortedAnnotations();
    let nextAnnotation: Annotation | undefined;

    // If there's a selected annotation, find the next one after it
    if (selectedAnnotations.size > 0) {
      const selectedIds = Array.from(selectedAnnotations);
      const lastSelectedId = selectedIds[selectedIds.length - 1];
      const currentIndex = sortedAnnotations.findIndex(ann => ann.id === lastSelectedId);
      
      if (currentIndex >= 0 && currentIndex < sortedAnnotations.length - 1) {
        nextAnnotation = sortedAnnotations[currentIndex + 1];
      } else {
        // Wrap around to first annotation
        nextAnnotation = sortedAnnotations[0];
      }
    } else {
      // No selection - start from first annotation
      nextAnnotation = sortedAnnotations[0];
    }
    
    if (nextAnnotation) {
      // Select only this annotation
      setSelectedAnnotations(new Set([nextAnnotation.id]));
      
      // Navigate to the page containing the annotation
      setCurrentPage(nextAnnotation.page + 1); // Convert from 0-based to 1-based
      setPageInputValue((nextAnnotation.page + 1).toString());
      
      // Scroll to the annotation if in continuous mode
      if (continuousScroll && containerRef.current) {
        setTimeout(() => {
          const annotationElement = document.querySelector(`[data-annotation-id="${nextAnnotation!.id}"]`);
          if (annotationElement) {
            annotationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [annotations, selectedAnnotations, continuousScroll, getSortedAnnotations]);

  // Navigate to the previous annotation
  const goToPreviousAnnotation = useCallback(() => {
    if (annotations.length === 0) return;
    
    const sortedAnnotations = getSortedAnnotations();
    let previousAnnotation: Annotation | undefined;

    // If there's a selected annotation, find the previous one before it
    if (selectedAnnotations.size > 0) {
      const selectedIds = Array.from(selectedAnnotations);
      const firstSelectedId = selectedIds[0];
      const currentIndex = sortedAnnotations.findIndex(ann => ann.id === firstSelectedId);
      
      if (currentIndex > 0) {
        previousAnnotation = sortedAnnotations[currentIndex - 1];
      } else {
        // Wrap around to last annotation
        previousAnnotation = sortedAnnotations[sortedAnnotations.length - 1];
      }
    } else {
      // No selection - start from last annotation
      previousAnnotation = sortedAnnotations[sortedAnnotations.length - 1];
    }
    
    if (previousAnnotation) {
      // Select only this annotation
      setSelectedAnnotations(new Set([previousAnnotation.id]));
      
      // Navigate to the page containing the annotation
      setCurrentPage(previousAnnotation.page + 1); // Convert from 0-based to 1-based
      setPageInputValue((previousAnnotation.page + 1).toString());
      
      // Scroll to the annotation if in continuous mode
      if (continuousScroll && containerRef.current) {
        setTimeout(() => {
          const annotationElement = document.querySelector(`[data-annotation-id="${previousAnnotation!.id}"]`);
          if (annotationElement) {
            annotationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [annotations, selectedAnnotations, continuousScroll, getSortedAnnotations]);

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
        
        <div className="view-controls">
          <button 
            onClick={toggleContinuousScroll}
            className={`view-mode-btn ${continuousScroll ? 'active' : ''}`}
            title="Toggle Continuous Scroll"
          >
            📄
          </button>
          <button 
            onClick={handleInsertPageClick}
            className="insert-page-btn"
            title="Insert Empty Page"
          >
            📄+
          </button>
        </div>
        
        <div className="annotation-controls">
          <button 
            onClick={handleAnnotationModeToggle} 
            className={`annotation-mode-btn ${annotationMode === 'annotation' ? 'active' : ''}`}
            title="Add Annotation"
          >
            📝
          </button>
          <button
            onClick={goToPreviousAnnotation}
            disabled={annotations.length === 0}
            title="Go to previous annotation"
            className="control-button"
          >
            ⬆️
          </button>
          <button
            onClick={goToNextAnnotation}
            disabled={annotations.length === 0}
            title="Go to next annotation"
            className="control-button"
          >
            ⬇️
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

      <div className="pdf-container" ref={containerRef}>
        <div className="pdf-content-wrapper">
          {continuousScroll ? (
            // Continuous scroll mode - render all pages
            <div className="pdf-pages-continuous">
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
                {Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="pdf-page-wrapper">
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={<div>Loading page {index + 1}...</div>}
                      error={<div>Error loading page {index + 1}</div>}
                    />
                    
                    <AnnotationOverlaySimple
                      annotations={annotations.filter(ann => ann.page === index)}
                      scale={scale}
                      onDrop={createPageDropHandler(index)}
                      onAnnotationUpdate={handleAnnotationUpdate}
                      onAnnotationDelete={onAnnotationDelete}
                      onAnnotationDeleteMultiple={handleAnnotationDeleteMultiple}
                      isSettingsDialogOpen={isSettingsDialogOpen}
                      onSettingsDialogOpenChange={setIsSettingsDialogOpen}
                      annotationMode={annotationMode}
                      selectedAnnotations={selectedAnnotations}
                      onAnnotationSelect={handleAnnotationSelect}
                      onClearSelection={handleClearSelection}
                      onRemoveFromSelection={handleRemoveFromSelection}
                    />
                  </div>
                ))}
              </Document>
            </div>
          ) : (
            // Single page mode - render current page only
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
                annotations={annotations.filter(ann => ann.page === currentPage - 1)}
                scale={scale}
                onDrop={(x, y) => handlePageDrop(x, y, currentPage - 1)}
                onAnnotationUpdate={handleAnnotationUpdate}
                onAnnotationDelete={onAnnotationDelete}
                onAnnotationDeleteMultiple={handleAnnotationDeleteMultiple}
                isSettingsDialogOpen={isSettingsDialogOpen}
                onSettingsDialogOpenChange={setIsSettingsDialogOpen}
                annotationMode={annotationMode}
                selectedAnnotations={selectedAnnotations}
                onAnnotationSelect={handleAnnotationSelect}
                onClearSelection={handleClearSelection}
                onRemoveFromSelection={handleRemoveFromSelection}
              />
            </div>
          )}
        </div>
      </div>
      
      <InsertPageDialog
        isOpen={showInsertPageDialog}
        currentPage={currentPage}
        onClose={() => setShowInsertPageDialog(false)}
        onInsertBefore={handleInsertBefore}
        onInsertAfter={handleInsertAfter}
      />
      
      <DeleteSelectedConfirmationDialog
        isOpen={showDeleteConfirmation}
        selectedCount={selectedAnnotations.size}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default PDFViewer;
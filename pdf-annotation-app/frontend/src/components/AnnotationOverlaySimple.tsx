import React, { useRef, useEffect, useState } from 'react';
import { Annotation } from '../types';
import SimpleAnnotation from './SimpleAnnotation';

interface AnnotationOverlayProps {
  annotations: Annotation[];
  scale: number;
  onDrop: (x: number, y: number) => void;
  onAnnotationUpdate: (annotationId: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (annotationId: string) => void;
  isSettingsDialogOpen?: boolean; // New prop to disable annotation adding
  onSettingsDialogOpenChange?: (isOpen: boolean) => void; // Callback for settings dialog state
  pageDimensions?: { width: number; height: number }; // Page dimensions for calculating max width/height
  annotationMode?: 'text' | 'date' | null; // Add annotation mode prop for cursor styling
}

const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  annotations,
  scale,
  onDrop,
  onAnnotationUpdate,
  onAnnotationDelete,
  isSettingsDialogOpen = false, // Default to false if not provided
  onSettingsDialogOpenChange,
  pageDimensions,
  annotationMode = null, // Default to null if not provided
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pdfCanvas, setPdfCanvas] = useState<HTMLCanvasElement | null>(null);
  const [calculatedPageDimensions, setCalculatedPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const lastClickTime = useRef(0);

  useEffect(() => {
    const findAndSyncWithCanvas = () => {
      if (!overlayRef.current) return;
      
      const parentElement = overlayRef.current.parentElement;
      if (!parentElement) return;
      
      const canvas = parentElement.querySelector('canvas');
      if (!canvas) return;
      
      if (canvas !== pdfCanvas) {
        setPdfCanvas(canvas);
        
        // Get canvas computed style (actual display size)
        const canvasStyle = window.getComputedStyle(canvas);
        const canvasWidth = parseFloat(canvasStyle.width);
        const canvasHeight = parseFloat(canvasStyle.height);
        
        // Make overlay exactly match the canvas
        overlayRef.current.style.width = `${canvasWidth}px`;
        overlayRef.current.style.height = `${canvasHeight}px`;
        overlayRef.current.style.position = 'absolute';
        overlayRef.current.style.top = '0';
        overlayRef.current.style.left = '0';
        overlayRef.current.style.pointerEvents = 'auto';
        overlayRef.current.style.zIndex = '1000';
        
        // Calculate page dimensions in PDF coordinates (unscaled)
        const pageDims = {
          width: canvasWidth / scale,
          height: canvasHeight / scale
        };
        setCalculatedPageDimensions(pageDims);
      }
    };

    // Initial sync
    findAndSyncWithCanvas();
    
    // Setup observer to watch for canvas changes
    const observer = new MutationObserver(() => {
      setTimeout(findAndSyncWithCanvas, 100); // Small delay to let canvas render
    });
    
    if (overlayRef.current?.parentElement) {
      observer.observe(overlayRef.current.parentElement, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        attributeFilter: ['style']
      });
    }

    // Also sync on scale changes
    const timeoutId = setTimeout(findAndSyncWithCanvas, 200);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [scale, pdfCanvas]);

  const suppressClick = () => {
    lastClickTime.current = Date.now();
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't add annotations if settings dialog is open
    if (isSettingsDialogOpen) {
      return;
    }

    // Simple debounce - if clicked very recently, ignore
    const now = Date.now();
    if (now - lastClickTime.current < 500) { // Increased from 200ms to 500ms
      return;
    }
    lastClickTime.current = now;

    if (!overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to PDF coordinates (unscaled)
    const pdfX = clickX / scale;
    const pdfY = clickY / scale;
    
    // Ensure coordinates are within bounds
    const maxWidth = 200;
    const maxHeight = 30;
    const boundedX = Math.max(0, Math.min(pdfX, (rect.width / scale) - maxWidth));
    const boundedY = Math.max(0, Math.min(pdfY, (rect.height / scale) - maxHeight));
    
    onDrop(boundedX, boundedY);
  };

  // Get cursor class based on annotation mode
  const getCursorClass = () => {
    if (!annotationMode) return '';
    
    switch (annotationMode) {
      case 'text':
        return 'text-mode';
      case 'date':
        return 'date-mode';
      default:
        return 'crosshair-mode';
    }
  };

  return (
    <div 
      ref={overlayRef}
      className={`annotation-overlay ${getCursorClass()}`}
      onClick={handleClick}
    >
      {annotations.map((annotation) => (
        <SimpleAnnotation
          key={annotation.id}
          annotation={annotation}
          scale={scale}
          onUpdate={(id, updates) => {
            onAnnotationUpdate(id, updates);
          }}
          onDelete={onAnnotationDelete}
          onDragStart={suppressClick}
          onDragEnd={suppressClick}
          onSettingsDialogOpenChange={onSettingsDialogOpenChange}
          pageDimensions={pageDimensions || calculatedPageDimensions || undefined}
        />
      ))}
    </div>
  );
};

export default AnnotationOverlay;
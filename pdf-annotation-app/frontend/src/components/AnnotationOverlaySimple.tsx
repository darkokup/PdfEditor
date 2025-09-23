import React, { useRef, useEffect, useState } from 'react';
import { Annotation } from '../types';
import SimpleAnnotation from './SimpleAnnotation';

interface AnnotationOverlayProps {
  annotations: Annotation[];
  scale: number;
  onDrop: (x: number, y: number, type: 'text' | 'date') => void;
  onAnnotationUpdate: (annotationId: string, value: string) => void;
  onAnnotationDelete: (annotationId: string) => void;
}

const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  annotations,
  scale,
  onDrop,
  onAnnotationUpdate,
  onAnnotationDelete,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pdfCanvas, setPdfCanvas] = useState<HTMLCanvasElement | null>(null);

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

  const handleClick = (e: React.MouseEvent) => {
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
    
    onDrop(boundedX, boundedY, 'text');
  };

  return (
    <div 
      ref={overlayRef}
      className="annotation-overlay"
      onClick={handleClick}
    >
      {annotations.map((annotation) => (
        <SimpleAnnotation
          key={annotation.id}
          annotation={annotation}
          scale={scale}
          onUpdate={(id, updates) => {
            if (updates.value !== undefined) {
              onAnnotationUpdate(id, updates.value);
            }
          }}
          onDelete={onAnnotationDelete}
        />
      ))}
    </div>
  );
};

export default AnnotationOverlay;
import React from 'react';
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
  const handleClick = (e: React.MouseEvent) => {
    // Add annotation on click
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    onDrop(x, y, 'text');
  };

  return (
    <div 
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
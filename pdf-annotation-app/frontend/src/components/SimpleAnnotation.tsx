import React, { useState, useRef } from 'react';
import { Annotation } from '../types';

interface SimpleAnnotationProps {
  annotation: Annotation;
  scale: number;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
}

const SimpleAnnotation: React.FC<SimpleAnnotationProps> = ({
  annotation,
  scale,
  onUpdate,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleDelete = () => {
    onDelete(annotation.id);
  };

  const handleEdit = () => {
    const newValue = prompt('Edit value:', annotation.value);
    if (newValue !== null) {
      onUpdate(annotation.id, { value: newValue });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === elementRef.current || (e.target as Element).classList.contains('simple-annotation-text')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - annotation.x * scale,
        y: e.clientY - annotation.y * scale,
      });
      e.preventDefault();
    }
  };

  React.useEffect(() => {
    const handleMouseMoveCallback = (e: MouseEvent) => {
      if (isDragging && elementRef.current) {
        const overlay = elementRef.current.parentElement;
        if (overlay) {
          const rect = overlay.getBoundingClientRect();
          let newX = (e.clientX - dragStart.x) / scale;
          let newY = (e.clientY - dragStart.y) / scale;
          
          // Constrain to overlay bounds
          const maxX = Math.max(0, (rect.width / scale) - annotation.width);
          const maxY = Math.max(0, (rect.height / scale) - annotation.height);
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          onUpdate(annotation.id, { x: newX, y: newY });
        }
      }
    };

    const handleMouseUpCallback = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMoveCallback);
      document.addEventListener('mouseup', handleMouseUpCallback);
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveCallback);
        document.removeEventListener('mouseup', handleMouseUpCallback);
      };
    }
  }, [isDragging, dragStart, annotation.id, annotation.width, annotation.height, scale, onUpdate]);

  const annotationStyle = {
    left: `${Math.max(0, annotation.x * scale)}px`,
    top: `${Math.max(0, annotation.y * scale)}px`,
    width: `${annotation.width * scale}px`,
    height: `${annotation.height * scale}px`,
    fontSize: `${Math.max(10, 12 * scale)}px`,
    minWidth: `${Math.max(60, 80 * scale)}px`,
    minHeight: `${Math.max(18, 20 * scale)}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const deleteButtonStyle = {
    top: `${-8 * scale}px`,
    right: `${-8 * scale}px`,
    width: `${Math.max(12, 16 * scale)}px`,
    height: `${Math.max(12, 16 * scale)}px`,
    fontSize: `${Math.max(8, 10 * scale)}px`,
  };

  return (
    <div 
      ref={elementRef}
      className="simple-annotation"
      style={annotationStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleEdit}
    >
      <button 
        className="simple-delete" 
        style={deleteButtonStyle}
        onClick={(e) => {
          e.stopPropagation();
          handleDelete();
        }}
      >
        ×
      </button>
      <span className="simple-annotation-text">
        {annotation.value || 'Click to edit'}
      </span>
    </div>
  );
};

export default SimpleAnnotation;
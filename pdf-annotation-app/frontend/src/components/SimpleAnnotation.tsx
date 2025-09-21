import React from 'react';
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
  const handleDelete = () => {
    onDelete(annotation.id);
  };

  const handleEdit = () => {
    const newValue = prompt('Edit value:', annotation.value);
    if (newValue !== null) {
      onUpdate(annotation.id, { value: newValue });
    }
  };

  return (
    <div 
      className="simple-annotation"
      style={{
        position: 'absolute',
        left: `${annotation.x * scale}px`,
        top: `${annotation.y * scale}px`,
        padding: '4px 8px',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        zIndex: 20,
        minWidth: '80px',
        minHeight: '20px'
      }}
      onClick={handleEdit}
    >
      <button 
        className="simple-delete" 
        onClick={(e) => {
          e.stopPropagation();
          handleDelete();
        }}
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '16px',
          height: '16px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: '#ff4444',
          color: 'white',
          cursor: 'pointer',
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ×
      </button>
      <span>{annotation.value || 'Click to edit'}</span>
    </div>
  );
};

export default SimpleAnnotation;
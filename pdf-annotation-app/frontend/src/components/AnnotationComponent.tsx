import React, { useState, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { Annotation } from '../types';
import 'react-datepicker/dist/react-datepicker.css';

interface AnnotationComponentProps {
  annotation: Annotation;
  scale: number;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
}

const AnnotationComponent: React.FC<AnnotationComponentProps> = ({
  annotation,
  scale,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleValueChange = (newValue: string) => {
    onUpdate(annotation.id, { value: newValue });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      onUpdate(annotation.id, { value: date.toLocaleDateString() });
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(annotation.id);
  };

  return (
    <div 
      className="annotation-item"
      onDoubleClick={handleDoubleClick}
    >
      <button className="annotation-delete" onClick={handleDelete} title="Delete annotation">
        ×
      </button>
      
      {isEditing ? (
        annotation.type === 'text' ? (
          <input
            ref={inputRef}
            type="text"
            value={annotation.value}
            onChange={(e) => handleValueChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyPress={handleKeyPress}
            className="annotation-edit-input"
            placeholder="Enter text"
            aria-label="Text annotation input"
          />
        ) : (
          <DatePicker
            selected={new Date(annotation.value)}
            onChange={handleDateChange}
            onBlur={() => setIsEditing(false)}
            autoFocus
            dateFormat="MM/dd/yyyy"
            className="annotation-edit-input"
          />
        )
      ) : (
        <span className="annotation-display">
          {annotation.value}
        </span>
      )}
    </div>
  );
};

export default AnnotationComponent;
/* eslint-disable react/forbid-dom-props */
import React, { useState, useRef, useEffect } from 'react';
import { Annotation } from '../types';
import AnnotationSettingsDialog from './AnnotationSettingsDialog';
import './SimpleAnnotation.css';

interface SimpleAnnotationProps {
  annotation: Annotation;
  scale: number;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onSettingsDialogOpenChange?: (isOpen: boolean) => void; // Callback for settings dialog state
  pageDimensions?: { width: number; height: number }; // Page dimensions for calculating max width/height
}

const SimpleAnnotation: React.FC<SimpleAnnotationProps> = ({
  annotation,
  scale,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onSettingsDialogOpenChange,
  pageDimensions,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleDelete = () => {
    onDelete(annotation.id);
    setShowMenu(false);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
    setShowMenu(false);
    onSettingsDialogOpenChange?.(true); // Notify that settings dialog is opening
  };

  const handleSettingsSave = (updates: Partial<Annotation>) => {
    onUpdate(annotation.id, updates);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent overlay from handling this click
    const newValue = prompt('Edit value:', annotation.value);
    if (newValue !== null) {
      onUpdate(annotation.id, { value: newValue });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent overlay from creating new annotation
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent overlay click
    if (e.target === elementRef.current || (e.target as Element).classList.contains('simple-annotation-text')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - annotation.x * scale,
        y: e.clientY - annotation.y * scale,
      });
      onDragStart?.(); // Suppress overlay clicks
      e.preventDefault();
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (elementRef.current && !elementRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

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
      if (isDragging) {
        onDragEnd?.(); // Suppress overlay clicks after drag
      }
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
  }, [isDragging, dragStart, annotation.id, annotation.width, annotation.height, scale, onUpdate, onDragEnd]);

  // Get CSS classes for styling
  const getBorderClass = () => {
    const borderStyle = annotation.borderStyle || 'solid';
    return `border-${borderStyle}`;
  };

  const getBackgroundClass = () => {
    return annotation.transparent ? 'transparent' : 'opaque';
  };

  const getTextClass = () => {
    return annotation.multiline ? 'multiline' : 'singleline';
  };

  return (
    <>
      <div 
        ref={elementRef}
        className={`simple-annotation ${getBorderClass()} ${getBackgroundClass()} ${showMenu ? 'menu-open' : ''}`}
        style={{
          left: `${Math.max(0, annotation.x * scale)}px`,
          top: `${Math.max(0, annotation.y * scale)}px`,
          width: `${annotation.width * scale}px`,
          height: `${annotation.height * scale}px`,
          fontSize: `${Math.max(10, 12 * scale)}px`,
          minWidth: `${Math.max(60, 80 * scale)}px`,
          minHeight: `${Math.max(18, 20 * scale)}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          borderColor: annotation.borderColor || '#007bff',
          borderWidth: `${(annotation.borderWidth || 1) * scale}px`,
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <button 
          className="simple-menu"
          style={{
            top: `${-8 * scale}px`,
            right: `${-8 * scale}px`,
            width: `${Math.max(12, 16 * scale)}px`,
            height: `${Math.max(12, 16 * scale)}px`,
            fontSize: `${Math.max(8, 10 * scale)}px`,
          }}
          onClick={handleMenuClick}
        >
          ☰
        </button>
        
        {showMenu && (
          <div 
            className="annotation-menu"
            style={{
              top: `${16 * scale}px`,
              right: '0px',
            }}
          >
            <button 
              className="simple-annotation-menu-item"
              onClick={handleSettingsClick}
            >
              Settings
            </button>
            <button 
              className="simple-annotation-menu-item remove"
              onClick={handleDelete}
            >
              Remove
            </button>
          </div>
        )}
        
        <span 
          className={`simple-annotation-text ${getTextClass()}`}
          onClick={handleEdit}
        >
          {annotation.value || 'Click to edit'}
        </span>
      </div>
      
      <AnnotationSettingsDialog
        annotation={annotation}
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          onSettingsDialogOpenChange?.(false); // Notify that settings dialog is closing
        }}
        onSave={handleSettingsSave}
        pageDimensions={pageDimensions}
      />
    </>
  );
};

export default SimpleAnnotation;
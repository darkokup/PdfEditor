/* eslint-disable react/forbid-dom-props */
import React, { useState, useRef, useEffect } from 'react';
import { Annotation } from '../types';
import AnnotationSettingsDialog from './AnnotationSettingsDialog';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import './SimpleAnnotation.css';

interface SimpleAnnotationProps {
  annotation: Annotation;
  scale: number;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
  onDeleteMultiple?: (ids: string[]) => void; // Callback to delete multiple annotations
  onRemoveFromSelection?: (id: string) => void; // Callback to remove from selection
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onSettingsDialogOpenChange?: (isOpen: boolean) => void; // Callback for settings dialog state
  pageDimensions?: { width: number; height: number }; // Page dimensions for calculating max width/height
  isSelected?: boolean; // Is this annotation selected
  onSelect?: (ctrlKey: boolean, shiftKey: boolean) => void; // Callback when annotation is clicked
  selectedAnnotationIds?: string[]; // All currently selected annotation IDs
}

const SimpleAnnotation: React.FC<SimpleAnnotationProps> = ({
  annotation,
  scale,
  onUpdate,
  onDelete,
  onDeleteMultiple,
  onRemoveFromSelection,
  onDragStart,
  onDragEnd,
  onSettingsDialogOpenChange,
  pageDimensions,
  isSelected = false,
  onSelect,
  selectedAnnotationIds = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'settings' | 'value'>('settings');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeDirection, setResizeDirection] = useState<'top' | 'right' | 'bottom' | 'left' | null>(null);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Clean border style calculation
  const getBorderStyle = () => {
    const borderWidth = (annotation.borderWidth || 1) * scale;
    const borderStyle = annotation.borderStyle || 'solid';
    const borderColor = annotation.borderColor || '#007bff';
    return `${borderWidth}px ${borderStyle} ${borderColor}`;
  };

  const handleDelete = () => {
    // Check if multiple annotations are selected
    if (selectedAnnotationIds.length > 1) {
      // Show confirmation dialog
      setShowDeleteConfirmation(true);
    } else {
      // Single annotation or not selected - delete directly
      onDelete(annotation.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent annotation selection
    handleDelete();
  };

  const handleDeleteAll = () => {
    if (onDeleteMultiple && selectedAnnotationIds.length > 0) {
      onDeleteMultiple(selectedAnnotationIds);
    }
    setShowDeleteConfirmation(false);
  };

  const handleDeleteOne = () => {
    onDelete(annotation.id);
    // Remove this annotation from selection
    onRemoveFromSelection?.(annotation.id);
    setShowDeleteConfirmation(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent annotation selection
    setSettingsInitialTab('settings');
    setShowSettings(true);
    onSettingsDialogOpenChange?.(true); // Notify that settings dialog is opening
  };

  const handleSettingsSave = (updates: Partial<Annotation>) => {
    onUpdate(annotation.id, updates);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent overlay from handling this click
    setSettingsInitialTab('value');
    setShowSettings(true);
    onSettingsDialogOpenChange?.(true); // Notify that settings dialog is opening
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent overlay from creating new annotation
    onSelect?.(e.ctrlKey, e.shiftKey); // Pass ctrl and shift key states to parent
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

  // Resize handle mouse down handler
  const handleResizeMouseDown = (e: React.MouseEvent, direction: 'top' | 'right' | 'bottom' | 'left') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: annotation.width,
      height: annotation.height,
    });
    // Store initial position for left and top resizing
    setInitialPosition({ x: annotation.x, y: annotation.y });
    onDragStart?.(); // Suppress overlay clicks
  };

  // Resize effect
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (isResizing && resizeDirection && elementRef.current) {
        const overlay = elementRef.current.parentElement;
        if (overlay) {
          const rect = overlay.getBoundingClientRect();
          const deltaX = (e.clientX - resizeStart.x) / scale;
          const deltaY = (e.clientY - resizeStart.y) / scale;
          
          // Calculate page boundaries
          const pageWidth = rect.width / scale;
          const pageHeight = rect.height / scale;
          
          let newWidth = resizeStart.width;
          let newHeight = resizeStart.height;
          let newX = initialPosition.x;
          let newY = initialPosition.y;
          
          switch (resizeDirection) {
            case 'top':
              // Calculate new height and position, constrained by page top boundary
              const proposedHeight = resizeStart.height - deltaY;
              const proposedY = initialPosition.y + deltaY;
              
              if (proposedY >= 0) {
                newHeight = Math.max(20, proposedHeight);
                newY = initialPosition.y + (resizeStart.height - newHeight);
              } else {
                // Hit top boundary - set position to 0 and adjust height
                newY = 0;
                newHeight = Math.max(20, initialPosition.y + resizeStart.height);
              }
              break;
              
            case 'right':
              // Calculate new width, constrained by page right boundary
              const proposedWidth = resizeStart.width + deltaX;
              const maxAllowedWidth = pageWidth - initialPosition.x;
              newWidth = Math.max(60, Math.min(proposedWidth, maxAllowedWidth));
              break;
              
            case 'bottom':
              // Calculate new height, constrained by page bottom boundary
              const proposedBottomHeight = resizeStart.height + deltaY;
              const maxAllowedHeight = pageHeight - initialPosition.y;
              newHeight = Math.max(20, Math.min(proposedBottomHeight, maxAllowedHeight));
              break;
              
            case 'left':
              // Calculate new width and position, constrained by page left boundary
              const proposedLeftWidth = resizeStart.width - deltaX;
              const proposedX = initialPosition.x + deltaX;
              
              if (proposedX >= 0) {
                newWidth = Math.max(60, proposedLeftWidth);
                newX = initialPosition.x + (resizeStart.width - newWidth);
              } else {
                // Hit left boundary - set position to 0 and adjust width
                newX = 0;
                newWidth = Math.max(60, initialPosition.x + resizeStart.width);
              }
              break;
          }
          
          // Final boundary check (should be redundant with above logic, but kept for safety)
          const maxX = Math.max(0, pageWidth - newWidth);
          const maxY = Math.max(0, pageHeight - newHeight);
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          onUpdate(annotation.id, { 
            x: Math.round(newX), 
            y: Math.round(newY), 
            width: Math.round(newWidth), 
            height: Math.round(newHeight) 
          });
        }
      }
    };

    const handleResizeUp = () => {
      if (isResizing) {
        onDragEnd?.();
      }
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeUp);
      };
    }
  }, [isResizing, resizeDirection, resizeStart, annotation.id, initialPosition, scale, onUpdate, onDragEnd]);

  const getBackgroundClass = () => {
    // Deprecated: kept for backward compatibility
    const bgColor = annotation.backgroundColor || (annotation.transparent ? 'transparent' : 'white');
    return bgColor === 'transparent' ? 'transparent' : 'opaque';
  };

  const getBackgroundStyle = () => {
    const bgColor = annotation.backgroundColor || (annotation.transparent ? 'transparent' : 'white');
    if (bgColor === 'transparent') {
      return 'transparent';
    } else if (bgColor === 'white') {
      return 'rgba(255, 255, 255, 0.95)';
    } else {
      // Custom color
      return bgColor;
    }
  };

  const getTextClass = () => {
    return annotation.multiline ? 'multiline' : 'singleline';
  };

  return (
    <>
      <div 
        ref={elementRef}
        data-annotation-id={annotation.id}
        className={`simple-annotation ${getBackgroundClass()}`}
        style={{
          left: `${Math.max(0, annotation.x * scale)}px`,
          top: `${Math.max(0, annotation.y * scale)}px`,
          width: `${annotation.width * scale}px`,
          height: `${annotation.height * scale}px`,
          fontSize: `${Math.max(10, 12 * scale)}px`,
          minWidth: `${Math.max(60, 80 * scale)}px`,
          minHeight: `${Math.max(18, 20 * scale)}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          border: getBorderStyle(),
          backgroundColor: getBackgroundStyle(),
        } as React.CSSProperties}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {/* Remove button - positioned at top right, aligned with top edge */}
        <button 
          className="simple-remove-btn"
          style={{
            position: 'absolute',
            top: `${-10 * scale}px`, // Align center with top edge
            right: `${-20 * scale}px`, // Move further right to avoid resize handle
            width: `${Math.max(16, 18 * scale)}px`, // Made bigger
            height: `${Math.max(16, 18 * scale)}px`, // Made bigger
            fontSize: `${Math.max(10, 12 * scale)}px`,
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
          onClick={handleDeleteClick}
          title="Remove annotation"
        >
          ×
        </button>
        
        {/* Settings button - positioned at bottom right, aligned with bottom edge */}
        <button 
          className="simple-settings-btn"
          style={{
            position: 'absolute',
            bottom: `${-10 * scale}px`, // Align center with bottom edge
            right: `${-20 * scale}px`, // Move further right to avoid resize handle
            width: `${Math.max(16, 18 * scale)}px`, // Made bigger
            height: `${Math.max(16, 18 * scale)}px`, // Made bigger
            fontSize: `${Math.max(8, 10 * scale)}px`,
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
          onClick={handleSettingsClick}
          title="Annotation settings"
        >
          ⋮
        </button>
        
        <span 
          className={`simple-annotation-text ${getTextClass()}`}
          onDoubleClick={handleEdit}
          style={{
            fontFamily: annotation.fontFamily || 'Arial',
            color: annotation.fontColor || '#000000',
            fontSize: `${annotation.fontSize || 12}px`,
          }}
        >
          {annotation.value || 'Double-click to edit'}
        </span>
        
        {/* Resize handles - only show when selected */}
        {isSelected && (
          <>
            {/* Top handle */}
            <div
              className="resize-handle resize-handle-top"
              style={{
                top: `${-4 * scale}px`,
                left: `${(annotation.width * scale) / 2 - 4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
            />
            
            {/* Right handle */}
            <div
              className="resize-handle resize-handle-right"
              style={{
                top: `${(annotation.height * scale) / 2 - 4 * scale}px`,
                right: `${-4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
            />
            
            {/* Bottom handle */}
            <div
              className="resize-handle resize-handle-bottom"
              style={{
                bottom: `${-4 * scale}px`,
                left: `${(annotation.width * scale) / 2 - 4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
            />
            
            {/* Left handle */}
            <div
              className="resize-handle resize-handle-left"
              style={{
                top: `${(annotation.height * scale) / 2 - 4 * scale}px`,
                left: `${-4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
            />
          </>
        )}
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
        initialTab={settingsInitialTab}
      />
      
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirmation}
        selectedCount={selectedAnnotationIds.length}
        onClose={handleCancelDelete}
        onDeleteAll={handleDeleteAll}
        onDeleteOne={handleDeleteOne}
      />
    </>
  );
};

export default SimpleAnnotation;
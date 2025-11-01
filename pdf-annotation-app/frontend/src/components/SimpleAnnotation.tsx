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
  onUpdateMultiple?: (updates: Array<{ id: string; changes: Partial<Annotation> }>) => void; // Callback to update multiple annotations
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
  allAnnotations?: Annotation[]; // All annotations for multi-drag
  isNewlyAdded?: boolean; // Is this a newly added annotation
  onClearNewlyAdded?: () => void; // Callback to clear newly added flag
}

const SimpleAnnotation: React.FC<SimpleAnnotationProps> = ({
  annotation,
  scale,
  onUpdate,
  onUpdateMultiple,
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
  allAnnotations = [],
  isNewlyAdded = false,
  onClearNewlyAdded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'settings' | 'value'>('settings');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeDirection, setResizeDirection] = useState<'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null>(null);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(annotation.value);
  const elementRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const justDraggedRef = useRef(false); // Track if annotation was just dragged
  const justResizedRef = useRef(false); // Track if annotation was just resized
  const hasMoved = useRef(false); // Track if annotation actually moved during drag
  const wasNewlyAddedRef = useRef(false); // Track if annotation was newly added when edit started

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

  const handleSaveEdit = () => {
    if (editValue !== annotation.value) {
      onUpdate(annotation.id, { value: editValue });
    }
    setIsEditing(false);
    // Clear the newly added flag since the user has saved their first edit
    wasNewlyAddedRef.current = false;
  };

  const handleCancelEdit = () => {
    setEditValue(annotation.value);
    setIsEditing(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      // If this was a newly added annotation and ESC is pressed, delete it
      if (wasNewlyAddedRef.current) {
        wasNewlyAddedRef.current = false; // Reset the flag
        onDelete(annotation.id);
        onClearNewlyAdded?.();
      } else {
        handleCancelEdit();
      }
    } else if (e.key === 'Enter' && !e.shiftKey && !annotation.multiline) {
      e.preventDefault();
      e.stopPropagation();
      handleSaveEdit();
    }
  };

  const handleEditBlur = () => {
    // Save changes when clicking outside
    handleSaveEdit();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent overlay from creating new annotation
    
    // Don't trigger selection if we just finished dragging or resizing
    if (justDraggedRef.current || justResizedRef.current) {
      justDraggedRef.current = false;
      justResizedRef.current = false;
      return;
    }
    
    // If already selected, start editing
    if (isSelected && !e.ctrlKey && !e.shiftKey) {
      setIsEditing(true);
      setEditValue(annotation.value);
      // Focus the input after state updates
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
    } else {
      // Not selected or using modifier keys - just select
      onSelect?.(e.ctrlKey, e.shiftKey);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent overlay click
    
    // Don't start dragging if in edit mode or clicking on textarea
    if (isEditing || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return;
    }
    
    if (e.target === elementRef.current || (e.target as Element).classList.contains('simple-annotation-text')) {
      hasMoved.current = false; // Reset movement tracking
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
          
          // Calculate delta for multi-drag
          const deltaX = newX - annotation.x;
          const deltaY = newY - annotation.y;
          
          // Mark as moved if there's any significant movement
          if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
            hasMoved.current = true;
          }
          
          // Constrain to overlay bounds
          const maxX = Math.max(0, (rect.width / scale) - annotation.width);
          const maxY = Math.max(0, (rect.height / scale) - annotation.height);
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          // If multiple annotations are selected and onUpdateMultiple is available
          if (isSelected && selectedAnnotationIds.length > 1 && onUpdateMultiple && allAnnotations.length > 0) {
            // Get all selected annotations on the same page
            const selectedOnSamePage = allAnnotations.filter(
              ann => selectedAnnotationIds.includes(ann.id) && ann.page === annotation.page
            );
            
            if (selectedOnSamePage.length > 1) {
              // Check if ANY annotation would go out of bounds with this delta
              const wouldExceedBounds = selectedOnSamePage.some(ann => {
                const updatedX = ann.x + deltaX;
                const updatedY = ann.y + deltaY;
                const annMaxX = (rect.width / scale) - ann.width;
                const annMaxY = (rect.height / scale) - ann.height;
                
                // Check if out of bounds
                return updatedX < 0 || updatedY < 0 || updatedX > annMaxX || updatedY > annMaxY;
              });
              
              // Only update if all annotations stay within bounds
              if (!wouldExceedBounds) {
                const updates = selectedOnSamePage.map(ann => ({
                  id: ann.id,
                  changes: { x: ann.x + deltaX, y: ann.y + deltaY }
                }));
                
                onUpdateMultiple(updates);
              }
              return;
            }
          }
          
          // Single annotation update
          onUpdate(annotation.id, { x: newX, y: newY });
        }
      }
    };

    const handleMouseUpCallback = () => {
      if (isDragging) {
        onDragEnd?.(); // Suppress overlay clicks after drag
        
        // Only mark as "just dragged" if there was actual movement
        if (hasMoved.current) {
          justDraggedRef.current = true;
          
          // Reset the flag after a short delay to allow click handler to check it
          setTimeout(() => {
            justDraggedRef.current = false;
          }, 50);
        }
        
        hasMoved.current = false; // Reset for next drag
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
  }, [isDragging, dragStart, annotation.id, annotation.width, annotation.height, annotation.x, annotation.y, annotation.page, scale, onUpdate, onUpdateMultiple, onDragEnd, isSelected, selectedAnnotationIds, allAnnotations]);

  // Resize handle mouse down handler
  const handleResizeMouseDown = (e: React.MouseEvent, direction: 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
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
              
            case 'top-left':
              // Resize both width and height from top-left corner
              const proposedTLHeight = resizeStart.height - deltaY;
              const proposedTLY = initialPosition.y + deltaY;
              const proposedTLWidth = resizeStart.width - deltaX;
              const proposedTLX = initialPosition.x + deltaX;
              
              // Handle Y (height)
              if (proposedTLY >= 0) {
                newHeight = Math.max(20, proposedTLHeight);
                newY = initialPosition.y + (resizeStart.height - newHeight);
              } else {
                newY = 0;
                newHeight = Math.max(20, initialPosition.y + resizeStart.height);
              }
              
              // Handle X (width)
              if (proposedTLX >= 0) {
                newWidth = Math.max(60, proposedTLWidth);
                newX = initialPosition.x + (resizeStart.width - newWidth);
              } else {
                newX = 0;
                newWidth = Math.max(60, initialPosition.x + resizeStart.width);
              }
              break;
              
            case 'top-right':
              // Resize both width and height from top-right corner
              const proposedTRHeight = resizeStart.height - deltaY;
              const proposedTRY = initialPosition.y + deltaY;
              const proposedTRWidth = resizeStart.width + deltaX;
              const maxTRWidth = pageWidth - initialPosition.x;
              
              // Handle Y (height)
              if (proposedTRY >= 0) {
                newHeight = Math.max(20, proposedTRHeight);
                newY = initialPosition.y + (resizeStart.height - newHeight);
              } else {
                newY = 0;
                newHeight = Math.max(20, initialPosition.y + resizeStart.height);
              }
              
              // Handle X (width)
              newWidth = Math.max(60, Math.min(proposedTRWidth, maxTRWidth));
              break;
              
            case 'bottom-left':
              // Resize both width and height from bottom-left corner
              const proposedBLHeight = resizeStart.height + deltaY;
              const maxBLHeight = pageHeight - initialPosition.y;
              const proposedBLWidth = resizeStart.width - deltaX;
              const proposedBLX = initialPosition.x + deltaX;
              
              // Handle Y (height)
              newHeight = Math.max(20, Math.min(proposedBLHeight, maxBLHeight));
              
              // Handle X (width)
              if (proposedBLX >= 0) {
                newWidth = Math.max(60, proposedBLWidth);
                newX = initialPosition.x + (resizeStart.width - newWidth);
              } else {
                newX = 0;
                newWidth = Math.max(60, initialPosition.x + resizeStart.width);
              }
              break;
              
            case 'bottom-right':
              // Resize both width and height from bottom-right corner
              const proposedBRHeight = resizeStart.height + deltaY;
              const maxBRHeight = pageHeight - initialPosition.y;
              const proposedBRWidth = resizeStart.width + deltaX;
              const maxBRWidth = pageWidth - initialPosition.x;
              
              // Handle Y (height)
              newHeight = Math.max(20, Math.min(proposedBRHeight, maxBRHeight));
              
              // Handle X (width)
              newWidth = Math.max(60, Math.min(proposedBRWidth, maxBRWidth));
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
        justResizedRef.current = true; // Mark that we just finished resizing
        
        // Reset the flag after a short delay to allow click handler to check it
        setTimeout(() => {
          justResizedRef.current = false;
        }, 50);
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

  // Auto-edit effect for newly added annotations
  useEffect(() => {
    if (isNewlyAdded && !isEditing) {
      wasNewlyAddedRef.current = true; // Mark that this annotation was newly added
      setIsEditing(true);
      setEditValue(annotation.value);
      // Focus the textarea after a brief delay to ensure it's rendered
      setTimeout(() => {
        if (editInputRef.current) {
          editInputRef.current.focus();
          editInputRef.current.select();
        }
      }, 50);
      // Clear the newly added flag since we've started editing
      onClearNewlyAdded?.();
    }
  }, [isNewlyAdded, isEditing, annotation.value, onClearNewlyAdded]);

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
          cursor: isEditing ? 'text' : (isDragging ? 'grabbing' : 'grab'),
          border: getBorderStyle(),
          backgroundColor: getBackgroundStyle(),
        } as React.CSSProperties}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {/* Remove button - positioned at top right, only visible when selected */}
        {isSelected && (
          <button 
            className="simple-remove-btn"
            style={{
              position: 'absolute',
              top: `${-10 * scale}px`, // Align center with top edge
              right: `${-23 * scale}px`, // Moved further right to avoid corner handle
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
        )}
        
        {/* Settings button - positioned below remove button with 3px gap, only visible when selected */}
        {isSelected && (
          <button 
            className="simple-settings-btn"
            style={{
              position: 'absolute',
              top: `${Math.max(16, 18 * scale) + 3 - 10 * scale}px`, // Below remove button with 3px gap
              right: `${-23 * scale}px`, // Aligned with remove button
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
        )}
        
        {/* Text display or edit mode */}
        {isEditing ? (
          <textarea
            ref={editInputRef}
            value={editValue}
            onChange={handleEditChange}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
            onClick={(e) => e.stopPropagation()}
            className={`simple-annotation-text simple-annotation-edit-textarea ${getTextClass()}`}
            style={{
              fontFamily: annotation.fontFamily || 'Arial',
              fontWeight: annotation.fontBold ? 'bold' : 'normal',
              fontStyle: annotation.fontItalic ? 'italic' : 'normal',
              textDecoration: annotation.fontStrikethrough ? 'line-through' : 'none',
              color: annotation.fontColor || '#000000',
              fontSize: `${(annotation.fontSize || 12) * scale}px`,
              border: '2px solid #007bff',
              outline: 'none',
              resize: 'none',
              padding: '2px 4px',
              boxSizing: 'border-box',
              background: 'white',
            }}
          />
        ) : (
          <span 
            className={`simple-annotation-text ${getTextClass()}`}
            onDoubleClick={handleEdit}
            style={{
              fontFamily: annotation.fontFamily || 'Arial',
              fontWeight: annotation.fontBold ? 'bold' : 'normal',
              fontStyle: annotation.fontItalic ? 'italic' : 'normal',
              textDecoration: annotation.fontStrikethrough ? 'line-through' : 'none',
              color: annotation.fontColor || '#000000',
              fontSize: `${(annotation.fontSize || 12) * scale}px`,
            }}
          >
            {annotation.value || 'Click to edit'}
          </span>
        )}
        
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
                top: '50%',
                transform: 'translateY(-50%)',
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
                top: '50%',
                transform: 'translateY(-50%)',
                left: `${-4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
            />
            
            {/* Top-Left corner handle */}
            <div
              className="resize-handle resize-handle-corner resize-handle-top-left"
              style={{
                top: `${-4 * scale}px`,
                left: `${-4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
                cursor: 'nwse-resize',
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
            />
            
            {/* Top-Right corner handle */}
            <div
              className="resize-handle resize-handle-corner resize-handle-top-right"
              style={{
                top: `${-4 * scale}px`,
                right: `${-4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
                cursor: 'nesw-resize',
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
            />
            
            {/* Bottom-Left corner handle */}
            <div
              className="resize-handle resize-handle-corner resize-handle-bottom-left"
              style={{
                bottom: `${-4 * scale}px`,
                left: `${-4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
                cursor: 'nesw-resize',
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
            />
            
            {/* Bottom-Right corner handle */}
            <div
              className="resize-handle resize-handle-corner resize-handle-bottom-right"
              style={{
                bottom: `${-4 * scale}px`,
                right: `${-4 * scale}px`,
                width: `${8 * scale}px`,
                height: `${8 * scale}px`,
                cursor: 'nwse-resize',
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
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
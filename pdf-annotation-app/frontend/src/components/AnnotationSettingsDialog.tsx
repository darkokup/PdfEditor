import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation } from '../types';
import './AnnotationSettingsDialog.css';

interface AnnotationSettingsDialogProps {
  annotation: Annotation;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Annotation>) => void;
  pageDimensions?: { width: number; height: number }; // Page dimensions for calculating max width/height
  initialTab?: 'settings' | 'value'; // Which tab to show initially
}

const AnnotationSettingsDialog: React.FC<AnnotationSettingsDialogProps> = ({
  annotation,
  isOpen,
  onClose,
  onSave,
  pageDimensions,
  initialTab = 'settings',
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'value'>(initialTab);
  const [settings, setSettings] = useState({
    width: annotation.width,
    height: annotation.height,
    multiline: annotation.multiline || false,
    transparent: annotation.transparent || false,
    borderStyle: annotation.borderStyle || 'solid',
    borderColor: annotation.borderColor || '#000000',
    borderWidth: annotation.borderWidth || 1,
  });

  const [annotationValue, setAnnotationValue] = useState({
    type: annotation.type,
    value: annotation.value,
  });

  const [dragState, setDragState] = useState({
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    position: { x: 0, y: 0 }
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSettings({
        width: annotation.width,
        height: annotation.height,
        multiline: annotation.multiline || false,
        transparent: annotation.transparent || false,
        borderStyle: annotation.borderStyle || 'solid',
        borderColor: annotation.borderColor || '#000000',
        borderWidth: annotation.borderWidth || 1,
      });
      setAnnotationValue({
        type: annotation.type,
        value: annotation.value,
      });
    }
  }, [annotation, isOpen, initialTab]);

  const handleSave = () => {
    onSave({
      ...settings,
      type: annotationValue.type,
      value: annotationValue.value,
    });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleValueChange = (key: string, value: any) => {
    setAnnotationValue(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrentDate = (): string => {
    const now = new Date();
    return now.toLocaleDateString('en-US'); // MM/DD/YYYY format
  };

  const handleAnnotationTypeChange = (newType: 'text' | 'date' | 'signature') => {
    let newValue = annotationValue.value;
    
    // Set appropriate default values based on type
    if (newType === 'date' && annotationValue.type !== 'date') {
      newValue = formatCurrentDate();
    } else if (newType === 'signature' && annotationValue.type !== 'signature') {
      newValue = '[Signature]';
    } else if (newType === 'text' && annotationValue.type !== 'text') {
      newValue = 'Text';
    }
    
    setAnnotationValue({
      type: newType,
      value: newValue,
    });
  };

  const validateIntegerInput = (value: string, min: number, max: number): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return min;
    return Math.max(min, Math.min(max, parsed));
  };

  const calculateMaxWidth = (): number => {
    if (!pageDimensions) {
      return 200; // Default fallback
    }
    // Maximum width is page width minus annotation's x position
    const maxWidth = Math.floor(pageDimensions.width - annotation.x);
    return Math.max(1, maxWidth); // Ensure minimum of 1
  };

  const calculateMaxHeight = (): number => {
    if (!pageDimensions) {
      return 200; // Default fallback  
    }
    // Maximum height is page height minus annotation's y position
    const maxHeight = Math.floor(pageDimensions.height - annotation.y);
    return Math.max(1, maxHeight); // Ensure minimum of 1
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (dialogRef.current) {
      const rect = dialogRef.current.getBoundingClientRect();
      setDragState({
        isDragging: true,
        dragOffset: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        },
        position: {
          x: rect.left,
          y: rect.top
        }
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.isDragging && dialogRef.current) {
      const newX = e.clientX - dragState.dragOffset.x;
      const newY = e.clientY - dragState.dragOffset.y;
      
      // Get viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dialogWidth = dialogRef.current.offsetWidth;
      const dialogHeight = dialogRef.current.offsetHeight;
      
      // Constrain to viewport bounds
      const constrainedX = Math.max(0, Math.min(newX, viewportWidth - dialogWidth));
      const constrainedY = Math.max(0, Math.min(newY, viewportHeight - dialogHeight));
      
      setDragState(prev => ({
        ...prev,
        position: { x: constrainedX, y: constrainedY }
      }));
      
      dialogRef.current.style.left = `${constrainedX}px`;
      dialogRef.current.style.top = `${constrainedY}px`;
      dialogRef.current.style.transform = 'none';
    }
  }, [dragState.isDragging, dragState.dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  }, []);

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  // Handle dialog positioning
  useEffect(() => {
    if (isOpen && dialogRef.current && (dragState.position.x !== 0 || dragState.position.y !== 0)) {
      dialogRef.current.style.position = 'fixed';
      dialogRef.current.style.left = `${dragState.position.x}px`;
      dialogRef.current.style.top = `${dragState.position.y}px`;
      dialogRef.current.style.transform = 'none';
    } else if (isOpen && dialogRef.current && dragState.position.x === 0 && dragState.position.y === 0) {
      dialogRef.current.style.position = '';
      dialogRef.current.style.left = '';
      dialogRef.current.style.top = '';
      dialogRef.current.style.transform = '';
    }
  }, [isOpen, dragState.position]);

  // Reset position when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDragState({
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
        position: { x: 0, y: 0 }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="annotation-settings-dialog-overlay">
      <div 
        className={`annotation-settings-dialog ${dragState.isDragging ? 'dragging' : ''}`}
        ref={dialogRef}
      >
        <div 
          className="dialog-header"
          onMouseDown={handleMouseDown}
        >
          <h3>Annotation</h3>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>
        
        <div className="dialog-content">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
            <button 
              className={`tab-button ${activeTab === 'value' ? 'active' : ''}`}
              onClick={() => setActiveTab('value')}
            >
              Value
            </button>
          </div>

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="width">Width (1-{calculateMaxWidth()}):</label>
                <input
                  type="number"
                  id="width"
                  min="1"
                  max={calculateMaxWidth()}
                  value={settings.width}
                  onChange={(e) => handleInputChange('width', validateIntegerInput(e.target.value, 1, calculateMaxWidth()))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="height">Height (1-{calculateMaxHeight()}):</label>
                <input
                  type="number"
                  id="height"
                  min="1"
                  max={calculateMaxHeight()}
                  value={settings.height}
                  onChange={(e) => handleInputChange('height', validateIntegerInput(e.target.value, 1, calculateMaxHeight()))}
                />
              </div>

              {annotationValue.type === 'text' && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.multiline}
                      onChange={(e) => handleInputChange('multiline', e.target.checked)}
                    />
                    Multiline
                  </label>
                </div>
              )}

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.transparent}
                    onChange={(e) => handleInputChange('transparent', e.target.checked)}
                  />
                  Transparent
                </label>
              </div>

              <div className="form-group">
                <label>Border Line:</label>
                <div className="custom-image-dropdown">
                  <div 
                    className="dropdown-selected"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <div className="selected-option">
                      {settings.borderStyle === 'none' && (
                        <svg width="40" height="16" viewBox="0 0 40 16">
                          <text x="20" y="12" textAnchor="middle" fontSize="10" fill="#666">None</text>
                        </svg>
                      )}
                      {settings.borderStyle === 'solid' && (
                        <svg width="40" height="16" viewBox="0 0 40 16">
                          <line x1="4" y1="8" x2="36" y2="8" stroke="#333" strokeWidth="1"/>
                        </svg>
                      )}
                      {settings.borderStyle === 'dashed' && (
                        <svg width="40" height="16" viewBox="0 0 40 16">
                          <line x1="4" y1="8" x2="36" y2="8" stroke="#333" strokeWidth="1" strokeDasharray="4,2"/>
                        </svg>
                      )}
                      {settings.borderStyle === 'dotted' && (
                        <svg width="40" height="16" viewBox="0 0 40 16">
                          <line x1="4" y1="8" x2="36" y2="8" stroke="#333" strokeWidth="1" strokeDasharray="1,2"/>
                        </svg>
                      )}
                    </div>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                  <div className={`dropdown-options ${isDropdownOpen ? 'open' : ''}`}>
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        handleInputChange('borderStyle', 'none');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <svg width="40" height="16" viewBox="0 0 40 16">
                        <text x="20" y="12" textAnchor="middle" fontSize="10" fill="#666">None</text>
                      </svg>
                      <span className="dropdown-spacer"></span>
                    </div>
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        handleInputChange('borderStyle', 'solid');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <svg width="40" height="16" viewBox="0 0 40 16">
                        <line x1="4" y1="8" x2="36" y2="8" stroke="#333" strokeWidth="1"/>
                      </svg>
                      <span className="dropdown-spacer"></span>
                    </div>
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        handleInputChange('borderStyle', 'dashed');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <svg width="40" height="16" viewBox="0 0 40 16">
                        <line x1="4" y1="8" x2="36" y2="8" stroke="#333" strokeWidth="1" strokeDasharray="4,2"/>
                      </svg>
                      <span className="dropdown-spacer"></span>
                    </div>
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        handleInputChange('borderStyle', 'dotted');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <svg width="40" height="16" viewBox="0 0 40 16">
                        <line x1="4" y1="8" x2="36" y2="8" stroke="#333" strokeWidth="1" strokeDasharray="1,2"/>
                      </svg>
                      <span className="dropdown-spacer"></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="borderColor">Border Color:</label>
                <input
                  type="color"
                  id="borderColor"
                  value={settings.borderColor}
                  onChange={(e) => handleInputChange('borderColor', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="borderWidth">Line Width (1-10):</label>
                <input
                  type="number"
                  id="borderWidth"
                  min="1"
                  max="10"
                  value={settings.borderWidth}
                  onChange={(e) => handleInputChange('borderWidth', validateIntegerInput(e.target.value, 1, 10))}
                />
              </div>
            </div>
          )}

          {/* Value Tab */}
          {activeTab === 'value' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="annotationType">Annotation Type:</label>
                <select
                  id="annotationType"
                  value={annotationValue.type}
                  onChange={(e) => handleAnnotationTypeChange(e.target.value as 'text' | 'date' | 'signature')}
                  className="type-dropdown"
                >
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="signature">Signature</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="annotationValue">Value:</label>
                {annotationValue.type === 'date' ? (
                  <input
                    type="date"
                    id="annotationValue"
                    value={(() => {
                      try {
                        const date = new Date(annotationValue.value);
                        if (isNaN(date.getTime())) {
                          return new Date().toISOString().split('T')[0];
                        }
                        return date.toISOString().split('T')[0];
                      } catch {
                        return new Date().toISOString().split('T')[0];
                      }
                    })()}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      handleValueChange('value', date.toLocaleDateString('en-US'));
                    }}
                    className="value-input"
                  />
                ) : (
                  <textarea
                    id="annotationValue"
                    value={annotationValue.value}
                    onChange={(e) => handleValueChange('value', e.target.value)}
                    className={`value-input ${annotationValue.type === 'text' && settings.multiline ? 'multiline' : 'singleline'}`}
                    rows={annotationValue.type === 'text' && settings.multiline ? 3 : 1}
                    placeholder={
                      annotationValue.type === 'signature' 
                        ? 'Enter signature text or use [Signature]'
                        : 'Enter annotation value'
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationSettingsDialog;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation } from '../types';
import { api } from '../api';
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
    multiline: true,  // Always true now since we allow multiline for all text-based annotations
    backgroundColor: annotation.backgroundColor || (annotation.transparent ? 'transparent' : 'white'),
    borderStyle: annotation.borderStyle || 'solid',
    borderColor: annotation.borderColor || '#000000',
    borderWidth: annotation.borderWidth || 1,
  });

  const [annotationValue, setAnnotationValue] = useState({
    type: annotation.type,
    value: annotation.value,
    fontFamily: annotation.fontFamily || 'Arial',
    fontBold: annotation.fontBold || false,
    fontItalic: annotation.fontItalic || false,
    fontStrikethrough: annotation.fontStrikethrough || false,
    fontColor: annotation.fontColor || '#000000',
    fontSize: annotation.fontSize || 12,
  });

  const [dragState, setDragState] = useState({
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    position: { x: 0, y: 0 }
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBgColorDropdownOpen, setIsBgColorDropdownOpen] = useState(false);
  const [customBgColor, setCustomBgColor] = useState('#FFFFFF');
  const [availableFonts, setAvailableFonts] = useState<string[]>([
    'Arial', 'Times New Roman', 'Courier New' // Default fallback fonts
  ]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const borderDropdownRef = useRef<HTMLDivElement>(null);
  const bgColorDropdownRef = useRef<HTMLDivElement>(null);

  // Load available fonts from backend on component mount
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const response = await api.getAvailableFonts();
        if (response.success && response.fonts.length > 0) {
          setAvailableFonts(response.fonts);
        }
      } catch (error) {
        console.error('Failed to load available fonts:', error);
        // Keep default fonts on error
      }
    };
    loadFonts();
  }, []);

  // Close dropdowns when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (borderDropdownRef.current && !borderDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (bgColorDropdownRef.current && !bgColorDropdownRef.current.contains(event.target as Node)) {
        setIsBgColorDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsBgColorDropdownOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const bgColor = annotation.backgroundColor || (annotation.transparent ? 'transparent' : 'white');
      setSettings({
        width: annotation.width,
        height: annotation.height,
        multiline: true,  // Always true now since we allow multiline for all text-based annotations
        backgroundColor: bgColor,
        borderStyle: annotation.borderStyle || 'solid',
        borderColor: annotation.borderColor || '#000000',
        borderWidth: annotation.borderWidth || 1,
      });
      setAnnotationValue({
        type: annotation.type,
        value: annotation.value,
        fontFamily: annotation.fontFamily || 'Arial',
        fontBold: annotation.fontBold || false,
        fontItalic: annotation.fontItalic || false,
        fontStrikethrough: annotation.fontStrikethrough || false,
        fontColor: annotation.fontColor || '#000000',
        fontSize: annotation.fontSize || 12,
      });
      // Initialize custom color if it's a custom color
      if (bgColor !== 'transparent' && bgColor !== 'white') {
        setCustomBgColor(bgColor);
      }
    }
  }, [annotation, isOpen, initialTab]);

  const handleSave = () => {
    onSave({
      ...settings,
      type: annotationValue.type,
      value: annotationValue.value,
      fontFamily: annotationValue.fontFamily,
      fontBold: annotationValue.fontBold,
      fontItalic: annotationValue.fontItalic,
      fontStrikethrough: annotationValue.fontStrikethrough,
      fontColor: annotationValue.fontColor,
      fontSize: annotationValue.fontSize,
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
      fontFamily: annotationValue.fontFamily,
      fontBold: annotationValue.fontBold,
      fontItalic: annotationValue.fontItalic,
      fontStrikethrough: annotationValue.fontStrikethrough,
      fontColor: annotationValue.fontColor,
      fontSize: annotationValue.fontSize,
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

              <div className="form-group">
                <label>Background Color:</label>
                <div className="custom-image-dropdown" ref={bgColorDropdownRef}>
                  <div 
                    className="dropdown-selected"
                    onClick={() => setIsBgColorDropdownOpen(!isBgColorDropdownOpen)}
                  >
                    <div className="selected-option">
                      {settings.backgroundColor === 'transparent' && <span>Transparent</span>}
                      {settings.backgroundColor === 'white' && <span>White</span>}
                      {settings.backgroundColor !== 'transparent' && settings.backgroundColor !== 'white' && (
                        <span>
                          Select Color 
                          <span 
                            style={{
                              display: 'inline-block',
                              width: '25px',
                              height: '16px',
                              backgroundColor: settings.backgroundColor,
                              border: '1px solid #ccc',
                              marginLeft: '8px',
                              verticalAlign: 'middle'
                            }}
                          />
                        </span>
                      )}
                    </div>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                  <div className={`dropdown-options ${isBgColorDropdownOpen ? 'open' : ''}`}>
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        handleInputChange('backgroundColor', 'transparent');
                        setIsBgColorDropdownOpen(false);
                      }}
                    >
                      <span>Transparent</span>
                    </div>
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        handleInputChange('backgroundColor', 'white');
                        setIsBgColorDropdownOpen(false);
                      }}
                    >
                      <span>White</span>
                    </div>
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        setIsBgColorDropdownOpen(false);
                      }}
                    >
                      <span>Select Color</span>
                      <input
                        type="color"
                        value={customBgColor}
                        onChange={(e) => {
                          setCustomBgColor(e.target.value);
                          handleInputChange('backgroundColor', e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Select custom background color"
                        style={{ marginLeft: '8px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Border Line:</label>
                <div className="custom-image-dropdown" ref={borderDropdownRef}>
                  <div 
                    className="dropdown-selected"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <div className="selected-option">
                      {settings.borderStyle === 'none' && (
                        <svg width="80" height="16" viewBox="0 0 80 16">
                          <text x="0" y="13" textAnchor="start" fontSize="13" fill="#000000">No Line</text>
                        </svg>
                      )}
                      {settings.borderStyle === 'solid' && (
                        <svg width="80" height="16" viewBox="0 0 80 16">
                          <line x1="4" y1="8" x2="76" y2="8" stroke="#000000" strokeWidth="2"/>
                        </svg>
                      )}
                      {settings.borderStyle === 'dashed' && (
                        <svg width="80" height="16" viewBox="0 0 80 16">
                          <line x1="4" y1="8" x2="76" y2="8" stroke="#000000" strokeWidth="2" strokeDasharray="4,2"/>
                        </svg>
                      )}
                      {settings.borderStyle === 'dotted' && (
                        <svg width="80" height="16" viewBox="0 0 80 16">
                          <line x1="4" y1="8" x2="76" y2="8" stroke="#000000" strokeWidth="2" strokeDasharray="1,2"/>
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
                      <svg width="80" height="16" viewBox="0 0 80 16">
                        <text x="40" y="13" textAnchor="middle" fontSize="13" fill="#000000">No Line</text>
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
                      <svg width="80" height="16" viewBox="0 0 80 16">
                        <line x1="4" y1="8" x2="76" y2="8" stroke="#000000" strokeWidth="2"/>
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
                      <svg width="80" height="16" viewBox="0 0 80 16">
                        <line x1="4" y1="8" x2="76" y2="8" stroke="#000000" strokeWidth="2" strokeDasharray="4,2"/>
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
                      <svg width="80" height="16" viewBox="0 0 80 16">
                        <line x1="4" y1="8" x2="76" y2="8" stroke="#000000" strokeWidth="2" strokeDasharray="1,2"/>
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
                <label htmlFor="borderWidth">Border Line Width (1-10):</label>
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

              {/* Font Controls Group */}
              <div className="form-group">
                <label>Font:</label>
                
                {/* Font Name */}
                <div style={{ marginBottom: '8px' }}>
                  <select
                    id="fontFamily"
                    value={annotationValue.fontFamily}
                    onChange={(e) => handleValueChange('fontFamily', e.target.value)}
                    className="type-dropdown"
                    style={{ fontFamily: annotationValue.fontFamily }}
                  >
                    {availableFonts.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Style Buttons and Color */}
                <div style={{ marginBottom: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleValueChange('fontBold', !annotationValue.fontBold)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      background: annotationValue.fontBold ? '#007bff' : 'white',
                      color: annotationValue.fontBold ? 'white' : '#333',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      minWidth: '40px',
                    }}
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => handleValueChange('fontItalic', !annotationValue.fontItalic)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      background: annotationValue.fontItalic ? '#007bff' : 'white',
                      color: annotationValue.fontItalic ? 'white' : '#333',
                      cursor: 'pointer',
                      fontStyle: 'italic',
                      fontSize: '14px',
                      minWidth: '40px',
                    }}
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => handleValueChange('fontStrikethrough', !annotationValue.fontStrikethrough)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      background: annotationValue.fontStrikethrough ? '#007bff' : 'white',
                      color: annotationValue.fontStrikethrough ? 'white' : '#333',
                      cursor: 'pointer',
                      textDecoration: 'line-through',
                      fontSize: '14px',
                      minWidth: '40px',
                    }}
                    title="Strikethrough"
                  >
                    S
                  </button>
                  <input
                    type="color"
                    id="fontColor"
                    value={annotationValue.fontColor}
                    onChange={(e) => handleValueChange('fontColor', e.target.value)}
                    style={{
                      marginLeft: '8px',
                      width: '40px',
                      height: '34px',
                      padding: '2px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    title="Font Color"
                  />
                  <select
                    id="fontSize"
                    value={annotationValue.fontSize}
                    onChange={(e) => handleValueChange('fontSize', parseInt(e.target.value, 10))}
                    className="type-dropdown"
                    style={{
                      marginLeft: '8px',
                      height: '34px',
                      width: '60px',
                      padding: '4px',
                    }}
                    title="Font Size"
                  >
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="18">18</option>
                    <option value="20">20</option>
                    <option value="22">22</option>
                    <option value="24">24</option>
                    <option value="28">28</option>
                    <option value="32">32</option>
                    <option value="36">36</option>
                    <option value="48">48</option>
                    <option value="72">72</option>
                  </select>
                </div>
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
                    className="value-input multiline"
                    rows={3}
                    wrap="off"
                    style={{
                      resize: 'vertical',
                      overflow: 'auto',
                      whiteSpace: 'pre',
                      fontFamily: annotationValue.fontFamily,
                      fontWeight: annotationValue.fontBold ? 'bold' : 'normal',
                      fontStyle: annotationValue.fontItalic ? 'italic' : 'normal',
                      textDecoration: annotationValue.fontStrikethrough ? 'line-through' : 'none',
                      color: annotationValue.fontColor,
                      fontSize: `${annotationValue.fontSize}px`,
                      backgroundColor: settings.backgroundColor === 'transparent' ? 'white' : settings.backgroundColor,
                    }}
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
import React from 'react';
import './InsertPageDialog.css';

interface InsertPageDialogProps {
  isOpen: boolean;
  currentPage: number;
  onClose: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
}

const InsertPageDialog: React.FC<InsertPageDialogProps> = ({
  isOpen,
  currentPage,
  onClose,
  onInsertBefore,
  onInsertAfter,
}) => {
  if (!isOpen) return null;

  const handleInsertBefore = () => {
    onInsertBefore();
    onClose();
  };

  const handleInsertAfter = () => {
    onInsertAfter();
    onClose();
  };

  return (
    <div className="insert-page-dialog-overlay">
      <div className="insert-page-dialog">
        <div className="dialog-header">
          <h3>Insert Empty Page</h3>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>
        
        <div className="dialog-content">
          <p>Insert empty page relative to current page {currentPage}:</p>
          
          <div className="insert-options">
            <button 
              className="insert-option-btn before"
              onClick={handleInsertBefore}
            >
              📄⬅️ Insert Before
              <small>New page will be page {currentPage}</small>
            </button>
            
            <button 
              className="insert-option-btn after"
              onClick={handleInsertAfter}
            >
              📄➡️ Insert After  
              <small>New page will be page {currentPage + 1}</small>
            </button>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default InsertPageDialog;
import React from 'react';
import './DeleteConfirmationDialog.css';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onDeleteAll: () => void;
  onDeleteOne: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  selectedCount,
  onClose,
  onDeleteAll,
  onDeleteOne,
}) => {
  if (!isOpen) return null;

  return (
    <div className="delete-confirmation-overlay">
      <div className="delete-confirmation-dialog">
        <h3>Delete Annotations</h3>
        <p>
          You have {selectedCount} annotation{selectedCount > 1 ? 's' : ''} selected.
          <br />
          Do you want to delete all selected annotations?
        </p>
        <div className="delete-confirmation-buttons">
          <button 
            className="delete-btn delete-all-btn" 
            onClick={onDeleteAll}
          >
            All Selected ({selectedCount})
          </button>
          <button 
            className="delete-btn delete-one-btn" 
            onClick={onDeleteOne}
          >
            Only Clicked
          </button>
          <button 
            className="delete-btn cancel-btn" 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;

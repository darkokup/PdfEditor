import React from 'react';
import './DeleteConfirmationDialog.css'; // Reuse the same styles

interface DeleteSelectedConfirmationDialogProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteSelectedConfirmationDialog: React.FC<DeleteSelectedConfirmationDialogProps> = ({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="delete-confirmation-overlay">
      <div className="delete-confirmation-dialog">
        <h3>Confirm Delete</h3>
        <p>
          {selectedCount > 1 ? (
            <>
              You have {selectedCount} annotations selected.
              <br />
              Do you want to delete all selected annotations?
            </>
          ) : (
            'Do you want to delete selected annotation?'
          )}
        </p>
        <div className="delete-confirmation-buttons">
          <button 
            className="delete-btn delete-all-btn"
            onClick={onConfirm}
          >
            Yes
          </button>
          <button 
            className="delete-btn cancel-btn"
            onClick={onClose}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteSelectedConfirmationDialog;

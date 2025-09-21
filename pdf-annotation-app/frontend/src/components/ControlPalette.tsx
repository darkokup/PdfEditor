import React from 'react';

interface ControlPaletteProps {
  onAddText: () => void;
  onAddDate: () => void;
}

const ControlPalette: React.FC<ControlPaletteProps> = ({ onAddText, onAddDate }) => {
  return (
    <div className="control-palette">
      <h3>Controls</h3>
      <div className="control-buttons">
        <button className="control-btn text-control" onClick={onAddText}>
          📝 Add Text Box
        </button>
        <button className="control-btn date-control" onClick={onAddDate}>
          📅 Add Date Picker
        </button>
      </div>
    </div>
  );
};

export default ControlPalette;
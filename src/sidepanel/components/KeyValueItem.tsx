import React, { useState, useEffect } from 'react';
import { KeyValueItem as KeyValueItemType, useJsonBuilderStore } from '../store';
import { startElementSelection } from '../elementSelection';

interface KeyValueItemProps {
  item: KeyValueItemType;
  onUpdateKey: (id: string, key: string) => void;
  onStartSelection: (id: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}

const KeyValueItem: React.FC<KeyValueItemProps> = ({
  item,
  onUpdateKey,
  onStartSelection,
  onRemove,
  disabled
}) => {
  const [key, setKey] = useState(item.key);
  const [isSelecting, setIsSelecting] = useState(false);
  const isSelectionActive = useJsonBuilderStore(state => state.isSelectionActive);
  
  // Reset isSelecting when item.value changes (selection completed)
  useEffect(() => {
    if (isSelecting && item.value) {
      setIsSelecting(false);
    }
  }, [item.value, isSelecting]);
  
  // Reset isSelecting when isSelectionActive becomes false (selection canceled)
  useEffect(() => {
    if (!isSelectionActive && isSelecting) {
      setIsSelecting(false);
    }
  }, [isSelectionActive, isSelecting]);
  
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKey(e.target.value);
  };
  
  const handleKeyBlur = () => {
    onUpdateKey(item.id, key.trim());
  };
  
  const handleSelectClick = async () => {
    if (key.trim() === '') {
      alert('Please enter a key name first');
      return;
    }
    
    setIsSelecting(true);
    onStartSelection(item.id);
    
    const success = await startElementSelection();
    if (!success) {
      setIsSelecting(false);
    }
  };
  
  const handleRemoveClick = () => {
    onRemove(item.id);
  };
  
  return (
    <div className="key-value-item">
      <input
        type="text"
        className="key-input"
        placeholder="Enter key name..."
        value={key}
        onChange={handleKeyChange}
        onBlur={handleKeyBlur}
        disabled={disabled || isSelecting}
      />
      <div className="value-display">
        {item.value || 'Click "Select" to choose a value'}
      </div>
      
      <div className="key-value-actions">
        <button
          className="select-button"
          onClick={handleSelectClick}
          disabled={disabled || isSelecting}
        >
          {isSelecting ? 'Selecting...' : 'Select'}
        </button>
        <button
          className="remove-button"
          onClick={handleRemoveClick}
          disabled={disabled || isSelecting}
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default KeyValueItem; 
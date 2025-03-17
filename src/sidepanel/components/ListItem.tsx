import React, { useState, useEffect } from 'react';
import { KeyValueItem as KeyValueItemType, useJsonBuilderStore } from '../store';
import { startElementSelection } from '../elementSelection';

interface ListItemProps {
  item: KeyValueItemType;
  onUpdateKey: (id: string, key: string) => void;
  onStartRootSelection: (id: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}

const ListItem: React.FC<ListItemProps> = ({
  item,
  onUpdateKey,
  onStartRootSelection,
  onRemove,
  disabled
}) => {
  const [key, setKey] = useState(item.key);
  const [isSelecting, setIsSelecting] = useState(false);
  const isRootSelectionActive = useJsonBuilderStore(state => state.isRootSelectionActive);
  
  // Reset isSelecting when isRootSelectionActive becomes false (selection canceled)
  useEffect(() => {
    if (!isRootSelectionActive && isSelecting) {
      setIsSelecting(false);
    }
  }, [isRootSelectionActive, isSelecting]);
  
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKey(e.target.value);
  };
  
  const handleKeyBlur = () => {
    onUpdateKey(item.id, key.trim());
  };
  
  const handleSelectRootClick = async () => {
    if (key.trim() === '') {
      alert('Please enter a key name first');
      return;
    }
    
    setIsSelecting(true);
    onStartRootSelection(item.id);
    
    const success = await startElementSelection();
    if (!success) {
      setIsSelecting(false);
    }
  };
  
  const handleRemoveClick = () => {
    onRemove(item.id);
  };
  
  const handleClearHighlight = () => {
    if (!item.rootFullXPath) return;
    
    // Clear the highlight from the root element
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id! },
          func: (rootXPath) => {
            try {
              // Find the root element
              const rootElement = document.evaluate(
                rootXPath as string,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              ).singleNodeValue as HTMLElement;
              
              if (!rootElement) return;
              
              // Restore original styles if they were saved
              if (rootElement.dataset.kairaOriginalOutline !== undefined) {
                rootElement.style.outline = rootElement.dataset.kairaOriginalOutline;
                delete rootElement.dataset.kairaOriginalOutline;
              }
              
              if (rootElement.dataset.kairaOriginalOutlineOffset !== undefined) {
                rootElement.style.outlineOffset = rootElement.dataset.kairaOriginalOutlineOffset;
                delete rootElement.dataset.kairaOriginalOutlineOffset;
              }
              
              delete rootElement.dataset.kairarootElement;
              rootElement.title = '';
            } catch (error) {
              console.error('Error removing highlight from root element:', error);
            }
          },
          args: [item.rootFullXPath]
        });
      } catch (error) {
        console.error('Error executing script for removing highlight:', error);
      }
    });
  };
  
  return (
    <div className="list-item">
      <div className="list-item-header">
        <input
          type="text"
          className="key-input"
          placeholder="Enter list key name..."
          value={key}
          onChange={handleKeyChange}
          onBlur={handleKeyBlur}
          disabled={disabled || isSelecting}
        />
        <div className="list-value-display">
          {item.rootFullXPath 
            ? 'List root element selected and highlighted' 
            : 'Click "Select Root" to choose a list container'}
        </div>
      </div>
      
      <div className="list-item-actions">
        <button
          className="select-button"
          onClick={handleSelectRootClick}
          disabled={disabled || isSelecting}
        >
          {isSelecting ? 'Selecting...' : 'Select Root'}
        </button>
        {item.rootFullXPath && (
          <button
            className="clear-highlight-button"
            onClick={handleClearHighlight}
            disabled={disabled || isSelecting}
          >
            Clear Highlight
          </button>
        )}
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

export default ListItem; 
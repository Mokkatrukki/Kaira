import React, { useState, useEffect } from 'react';
import { KeyValueItem as KeyValueItemType, useJsonBuilderStore } from '../store';
import { startElementSelection, startListItemSelection } from '../elementSelection';

interface ListItemProps {
  item: KeyValueItemType;
  onUpdateKey: (id: string, key: string) => void;
  onStartRootSelection: (id: string) => void;
  onStartItemSelection: (id: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}

const ListItem: React.FC<ListItemProps> = ({
  item,
  onUpdateKey,
  onStartRootSelection,
  onStartItemSelection,
  onRemove,
  disabled
}) => {
  const [key, setKey] = useState(item.key);
  const [isSelecting, setIsSelecting] = useState(false);
  const isRootSelectionActive = useJsonBuilderStore(state => state.isRootSelectionActive);
  const isItemSelectionActive = useJsonBuilderStore(state => state.isItemSelectionActive);
  
  // Reset isSelecting when selection becomes inactive
  useEffect(() => {
    if ((!isRootSelectionActive && !isItemSelectionActive) && isSelecting) {
      setIsSelecting(false);
    }
  }, [isRootSelectionActive, isItemSelectionActive, isSelecting]);
  
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
  
  const handleSelectItemClick = async () => {
    if (!item.rootFullXPath) {
      alert('Please select a root element first');
      return;
    }
    
    setIsSelecting(true);
    onStartItemSelection(item.id);
    
    const success = await startListItemSelection(item.rootFullXPath);
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
  
  // Format the list items for display
  const getListItemsDisplay = () => {
    if (!item.rootFullXPath) {
      return 'Click "Select Root" to choose a list container';
    }
    
    if (Array.isArray(item.listItems) && item.listItems.length > 0) {
      const displayItems = item.listItems.slice(0, 3); // Show first 3 items
      const displayText = displayItems.map(text => `"${text}"`).join(', ');
      
      if (item.listItems.length > 3) {
        return `[${displayText}, ... (${item.listItems.length - 3} more items)]`;
      }
      
      return `[${displayText}] (${item.listItems.length} items total)`;
    }
    
    return 'List root element selected. Click "Select Item" to add items.';
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
          {getListItemsDisplay()}
        </div>
      </div>
      
      <div className="list-item-actions">
        <button
          className="select-button"
          onClick={handleSelectRootClick}
          disabled={disabled || isSelecting}
        >
          {isSelecting && isRootSelectionActive ? 'Selecting...' : 'Select Root'}
        </button>
        
        {item.rootFullXPath && (
          <button
            className="select-item-button"
            onClick={handleSelectItemClick}
            disabled={disabled || isSelecting}
          >
            {isSelecting && isItemSelectionActive ? 'Selecting...' : 'Select Item'}
          </button>
        )}
        
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
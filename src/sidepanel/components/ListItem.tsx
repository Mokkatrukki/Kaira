import React, { useState, useEffect } from 'react';
import { KeyValueItem as KeyValueItemType, useJsonBuilderStore } from '../store';
import { startElementSelection } from '../elementSelection';

interface ListItemProps {
  item: KeyValueItemType;
  onUpdateKey: (id: string, key: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}

const ListItem: React.FC<ListItemProps> = ({ item, onUpdateKey, onRemove, disabled }) => {
  const [key, setKey] = useState(item.key);
  const [previewItems, setPreviewItems] = useState<string[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const { 
    startRootSelection, 
    startItemSelection, 
    isRootSelectionActive, 
    isItemSelectionActive,
    currentItemId 
  } = useJsonBuilderStore();

  // Check if this item is the current selection target
  const isCurrentItem = currentItemId === item.id;

  // Effect to preview items when selection is complete
  useEffect(() => {
    if (item.rootFullXPath && item.relativeXPath) {
      // Preview the items that will be collected
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id! },
            func: (rootXPath, relXPath) => {
              // Find the root element
              const rootElement = document.evaluate(
                rootXPath as string,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              ).singleNodeValue;
              
              if (!rootElement) return { items: [], total: 0 };
              
              // Create XPath for evaluation with wildcards
              const xpathForEvaluation = `.${(relXPath as string).replace(/\/([^\/]+)(?!\[)/g, '/$1[*]')}`;
              
              try {
                // Find all matching elements
                const xpathResult = document.evaluate(
                  xpathForEvaluation,
                  rootElement,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                );
                
                // Extract preview of all items (limit to first 5 for display)
                const previewItems = [];
                const maxPreview = Math.min(xpathResult.snapshotLength, 5);
                
                for (let i = 0; i < maxPreview; i++) {
                  const node = xpathResult.snapshotItem(i);
                  if (node) {
                    previewItems.push(node.textContent?.trim() || '');
                  }
                }
                
                return {
                  items: previewItems,
                  total: xpathResult.snapshotLength
                };
              } catch (error) {
                console.error('Error previewing items:', error);
                return { items: [], total: 0 };
              }
            },
            args: [item.rootFullXPath, item.relativeXPath]
          });
          
          const previewResult = results[0]?.result;
          if (previewResult) {
            setPreviewItems(previewResult.items);
            setTotalItems(previewResult.total);
          }
        } catch (error) {
          console.error('Error executing preview script:', error);
        }
      });
    }
  }, [item.rootFullXPath, item.relativeXPath]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKey(e.target.value);
  };

  const handleKeyBlur = () => {
    onUpdateKey(item.id, key);
  };

  const handleSelectRootClick = async () => {
    if (disabled) return;
    
    console.log('Starting root selection for item:', item.id);
    const success = startRootSelection(item.id);
    console.log('Root selection started:', success, 'currentItemId:', useJsonBuilderStore.getState().currentItemId);
    
    if (success) {
      await startElementSelection();
    }
  };

  const handleSelectItemClick = async () => {
    if (disabled) return;
    
    console.log('Starting item selection for item:', item.id);
    const success = startItemSelection(item.id);
    console.log('Item selection started:', success, 'currentItemId:', useJsonBuilderStore.getState().currentItemId);
    
    if (success) {
      await startElementSelection();
    }
  };

  const handleRemoveClick = () => {
    if (disabled) return;
    onRemove(item.id);
  };

  // Determine selection status
  const isSelectingRoot = isRootSelectionActive && isCurrentItem;
  const isSelectingItem = isItemSelectionActive && isCurrentItem;
  const isComplete = item.rootFullXPath && item.relativeXPath;

  return (
    <div className="list-item">
      <div className="list-item-header">
        <input
          type="text"
          className="key-input"
          value={key}
          onChange={handleKeyChange}
          onBlur={handleKeyBlur}
          placeholder="Enter key name"
          disabled={disabled}
        />
        <button
          className="remove-button"
          onClick={handleRemoveClick}
          disabled={disabled}
        >
          Remove
        </button>
      </div>
      
      <div className="list-item-content">
        <div className="list-selection-steps">
          <div className={`selection-step ${item.rootFullXPath ? 'completed' : ''} ${isSelectingRoot ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Select Root Container</span>
            <button 
              className="select-button"
              onClick={handleSelectRootClick}
              disabled={Boolean(disabled) || isSelectingRoot || Boolean(isComplete)}
            >
              {item.rootFullXPath ? 'Change' : 'Select'}
            </button>
          </div>
          
          <div className={`selection-step ${item.relativeXPath ? 'completed' : ''} ${isSelectingItem ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Select List Item</span>
            <button 
              className="select-button"
              onClick={handleSelectItemClick}
              disabled={Boolean(disabled) || !item.rootFullXPath || isSelectingItem || Boolean(isComplete)}
            >
              {item.relativeXPath ? 'Change' : 'Select'}
            </button>
          </div>
        </div>
        
        {isComplete && (
          <div className="list-preview">
            <div className="preview-header">
              <span>List Preview</span>
              <span className="preview-count">{totalItems} items found</span>
            </div>
            <div className="preview-content">
              {previewItems.length > 0 ? (
                <div className="preview-items-list">
                  {previewItems.map((text, index) => (
                    <div key={index} className="preview-item">
                      <span className="preview-item-number">{index + 1}.</span>
                      <span className="preview-value">{text}</span>
                    </div>
                  ))}
                  {totalItems > previewItems.length && (
                    <div className="preview-more">
                      ... and {totalItems - previewItems.length} more items
                    </div>
                  )}
                </div>
              ) : (
                <div className="preview-item">
                  <span className="preview-value">{item.value}</span>
                  <span className="preview-note">(First item example - will collect all similar items)</span>
                </div>
              )}
              <div className="preview-info">
                <div className="info-row">
                  <span className="info-label">Root XPath:</span>
                  <span className="info-value">{item.rootFullXPath}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Item Pattern:</span>
                  <span className="info-value">{item.relativeXPath}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Collection:</span>
                  <span className="info-value">Will collect all {totalItems} elements matching this pattern</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListItem; 
import React, { useEffect, useState } from 'react';
import KeyValueItem from './KeyValueItem';
import ListItem from './ListItem';
import LivePreview from './LivePreview';
import { useStore, useJsonBuilderStore, KeyValueItem as KeyValueItemType } from '../store';
import { stopElementSelection } from '../elementSelection';

const JsonBuilder: React.FC = () => {
  const { livePreviewInfo, showLivePreview } = useStore();
  const { 
    items, 
    data, 
    addItem,
    addListItem,
    removeItem, 
    updateItemKey, 
    startSelection,
    isSelectionActive,
    isRootSelectionActive,
    isItemSelectionActive,
    resetSelection,
    addSelectedValue,
    collection,
    collectItems,
    clearCollection
  } = useJsonBuilderStore();
  
  const [jsonOutput, setJsonOutput] = useState('{}');
  const [selectorsOutput, setSelectorsOutput] = useState('{}');
  const [collectionOutput, setCollectionOutput] = useState('[]');
  const [isCollecting, setIsCollecting] = useState(false);

  // Update JSON outputs whenever data changes
  useEffect(() => {
    setJsonOutput(JSON.stringify(data, null, 2));
    
    // Generate selectors JSON
    const selectorsData: Record<string, { 
      xpath?: string; 
      cssSelector?: string; 
      fullXPath?: string;
      isList?: boolean;
      rootFullXPath?: string;
      relativeXPath?: string;
    }> = {};
    
    items.forEach(item => {
      if (item.key) {
        if (item.isList && item.rootFullXPath && item.relativeXPath) {
          selectorsData[item.key] = {
            isList: true,
            rootFullXPath: item.rootFullXPath,
            relativeXPath: item.relativeXPath
          };
        } else {
          selectorsData[item.key] = {
            xpath: item.xpath || '',
            cssSelector: item.cssSelector || '',
            fullXPath: item.fullXPath || ''
          };
        }
      }
    });
    setSelectorsOutput(JSON.stringify(selectorsData, null, 2));
  }, [data, items]);

  // Update collection output whenever collection changes
  useEffect(() => {
    setCollectionOutput(JSON.stringify(collection, null, 2));
  }, [collection]);

  // Add escape key listener to cancel selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isSelectionActive || isRootSelectionActive || isItemSelectionActive)) {
        stopElementSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelectionActive, isRootSelectionActive, isItemSelectionActive]);

  const handleAddKeyValuePair = () => {
    addItem();
  };

  const handleAddListItem = () => {
    addListItem();
  };

  const handleUpdateKey = (id: string, newKey: string) => {
    updateItemKey(id, newKey);
  };

  const handleStartValueSelection = (id: string) => {
    startSelection(id);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert(`${label} copied to clipboard!`);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const handleCollectItems = async () => {
    setIsCollecting(true);
    try {
      const success = await collectItems();
      if (success) {
        alert('Items collected successfully!');
      }
    } catch (error) {
      console.error('Error collecting items:', error);
      alert('Error collecting items. See console for details.');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleClearCollection = () => {
    if (confirm('Are you sure you want to clear the collection?')) {
      clearCollection();
    }
  };

  const isSelectionModeActive = isSelectionActive || isRootSelectionActive || isItemSelectionActive;

  return (
    <div className="json-builder">
      <div className="builder-header">
        <h2>JSON Builder</h2>
        <div className="header-buttons">
          <button 
            className="add-button" 
            onClick={handleAddKeyValuePair} 
            disabled={isSelectionModeActive}
          >
            Add Key-Value Pair
          </button>
          <button 
            className="add-list-button" 
            onClick={handleAddListItem} 
            disabled={isSelectionModeActive}
          >
            Add List Item
          </button>
          <button 
            className="collect-button" 
            onClick={handleCollectItems} 
            disabled={isSelectionModeActive || isCollecting}
          >
            {isCollecting ? 'Collecting...' : 'Collect Items'}
          </button>
        </div>
      </div>

      {isSelectionModeActive && (
        <div className="selection-active-notice">
          <p>
            {isSelectionActive && 'Selection mode active. Click on an element in the page or press ESC to cancel.'}
            {isRootSelectionActive && 'Root selection mode active. Select a container element or press ESC to cancel.'}
            {isItemSelectionActive && 'Item selection mode active. Select an item within the container or press ESC to cancel.'}
          </p>
          <button onClick={() => stopElementSelection()}>Cancel Selection</button>
        </div>
      )}

      <div className="key-value-list">
        {items.map((pair: KeyValueItemType) => (
          pair.isList ? (
            <ListItem
              key={pair.id}
              item={pair}
              onUpdateKey={handleUpdateKey}
              onRemove={removeItem}
              disabled={isSelectionModeActive}
            />
          ) : (
            <KeyValueItem
              key={pair.id}
              item={pair}
              onUpdateKey={handleUpdateKey}
              onStartSelection={handleStartValueSelection}
              onRemove={removeItem}
              disabled={isSelectionModeActive}
            />
          )
        ))}
      </div>

      <div className="json-output">
        <h3>Values JSON</h3>
        <pre>{jsonOutput}</pre>
        <button 
          className="copy-button" 
          onClick={() => copyToClipboard(jsonOutput, 'Values JSON')} 
          disabled={isSelectionModeActive}
        >
          Copy Values JSON
        </button>
      </div>

      <div className="json-output selectors-output">
        <h3>Selectors JSON</h3>
        <pre>{selectorsOutput}</pre>
        <button 
          className="copy-button" 
          onClick={() => copyToClipboard(selectorsOutput, 'Selectors JSON')} 
          disabled={isSelectionModeActive}
        >
          Copy Selectors JSON
        </button>
      </div>

      <div className="json-output collection-output">
        <div className="collection-header">
          <h3>Collection ({collection.length} items)</h3>
          {collection.length > 0 && (
            <button 
              className="clear-button" 
              onClick={handleClearCollection} 
              disabled={isSelectionModeActive}
            >
              Clear Collection
            </button>
          )}
        </div>
        <pre>{collectionOutput}</pre>
        {collection.length > 0 && (
          <button 
            className="copy-button" 
            onClick={() => copyToClipboard(collectionOutput, 'Collection JSON')} 
            disabled={isSelectionModeActive}
          >
            Copy Collection JSON
          </button>
        )}
      </div>

      {showLivePreview && livePreviewInfo && isSelectionModeActive && (
        <LivePreview info={livePreviewInfo} visible={true} />
      )}
    </div>
  );
};

export default JsonBuilder; 
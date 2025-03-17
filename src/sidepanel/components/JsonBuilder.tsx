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
    startRootSelection,
    isSelectionActive,
    isRootSelectionActive,
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
    const selectorsData: Record<string, any> = {};
    items.forEach(item => {
      if (item.key) {
        if (item.isList && item.rootFullXPath) {
          // For list items, include root element information
          selectorsData[item.key] = {
            type: 'list',
            rootElement: {
              fullXPath: item.rootFullXPath,
              xpath: item.xpath || '',
              cssSelector: item.cssSelector || ''
            }
          };
        } else {
          // For regular key-value items
          selectorsData[item.key] = {
            type: 'single',
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
      if (e.key === 'Escape' && (isSelectionActive || isRootSelectionActive)) {
        stopElementSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelectionActive, isRootSelectionActive]);

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

  const handleStartRootSelection = (id: string) => {
    startRootSelection(id);
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

  return (
    <div className="json-builder">
      <div className="builder-header">
        <h2>JSON Builder</h2>
        <div className="header-buttons">
          <button 
            className="add-button" 
            onClick={handleAddKeyValuePair} 
            disabled={isSelectionActive || isRootSelectionActive}
          >
            Add Key-Value Pair
          </button>
          <button 
            className="add-list-button" 
            onClick={handleAddListItem} 
            disabled={isSelectionActive || isRootSelectionActive}
          >
            Add List Item
          </button>
          <button 
            className="collect-button" 
            onClick={handleCollectItems} 
            disabled={isSelectionActive || isRootSelectionActive || isCollecting}
          >
            {isCollecting ? 'Collecting...' : 'Collect Items'}
          </button>
        </div>
      </div>

      {(isSelectionActive || isRootSelectionActive) && (
        <div className="selection-active-notice">
          <p>Selection mode active. Click on an element in the page or press ESC to cancel.</p>
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
              onStartRootSelection={handleStartRootSelection}
              onRemove={removeItem}
              disabled={isSelectionActive || isRootSelectionActive}
            />
          ) : (
            <KeyValueItem
              key={pair.id}
              item={pair}
              onUpdateKey={handleUpdateKey}
              onStartSelection={handleStartValueSelection}
              onRemove={removeItem}
              disabled={isSelectionActive || isRootSelectionActive}
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
          disabled={isSelectionActive || isRootSelectionActive}
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
          disabled={isSelectionActive || isRootSelectionActive}
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
              disabled={isSelectionActive || isRootSelectionActive}
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
            disabled={isSelectionActive || isRootSelectionActive}
          >
            Copy Collection JSON
          </button>
        )}
      </div>

      {showLivePreview && livePreviewInfo && (isSelectionActive || isRootSelectionActive) && (
        <LivePreview info={livePreviewInfo} visible={true} />
      )}
    </div>
  );
};

export default JsonBuilder; 
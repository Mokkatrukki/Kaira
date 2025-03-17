import React, { useEffect, useState } from 'react';
import KeyValueItem from './KeyValueItem';
import LivePreview from './LivePreview';
import { useStore, useJsonBuilderStore, KeyValueItem as KeyValueItemType } from '../store';
import { stopElementSelection } from '../elementSelection';

const JsonBuilder: React.FC = () => {
  const { livePreviewInfo, showLivePreview } = useStore();
  const { 
    items, 
    data, 
    addItem, 
    removeItem, 
    updateItemKey, 
    startSelection,
    isSelectionActive,
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
    const selectorsData: Record<string, { xpath?: string; cssSelector?: string; fullXPath?: string }> = {};
    items.forEach(item => {
      if (item.key) {
        selectorsData[item.key] = {
          xpath: item.xpath || '',
          cssSelector: item.cssSelector || '',
          fullXPath: item.fullXPath || ''
        };
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
      if (e.key === 'Escape' && isSelectionActive) {
        stopElementSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelectionActive]);

  const handleAddKeyValuePair = () => {
    addItem();
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

  return (
    <div className="json-builder">
      <div className="builder-header">
        <h2>JSON Builder</h2>
        <div className="header-buttons">
          <button 
            className="add-button" 
            onClick={handleAddKeyValuePair} 
            disabled={isSelectionActive}
          >
            Add Key-Value Pair
          </button>
          <button 
            className="collect-button" 
            onClick={handleCollectItems} 
            disabled={isSelectionActive || isCollecting}
          >
            {isCollecting ? 'Collecting...' : 'Collect Items'}
          </button>
        </div>
      </div>

      {isSelectionActive && (
        <div className="selection-active-notice">
          <p>Selection mode active. Click on an element in the page or press ESC to cancel.</p>
          <button onClick={() => stopElementSelection()}>Cancel Selection</button>
        </div>
      )}

      <div className="key-value-list">
        {items.map((pair: KeyValueItemType) => (
          <KeyValueItem
            key={pair.id}
            item={pair}
            onUpdateKey={handleUpdateKey}
            onStartSelection={handleStartValueSelection}
            onRemove={removeItem}
            disabled={isSelectionActive}
          />
        ))}
      </div>

      <div className="json-output">
        <h3>Values JSON</h3>
        <pre>{jsonOutput}</pre>
        <button 
          className="copy-button" 
          onClick={() => copyToClipboard(jsonOutput, 'Values JSON')} 
          disabled={isSelectionActive}
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
          disabled={isSelectionActive}
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
              disabled={isSelectionActive}
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
            disabled={isSelectionActive}
          >
            Copy Collection JSON
          </button>
        )}
      </div>

      {showLivePreview && livePreviewInfo && isSelectionActive && (
        <LivePreview info={livePreviewInfo} visible={true} />
      )}
    </div>
  );
};

export default JsonBuilder; 
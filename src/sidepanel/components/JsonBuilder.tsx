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
    addSelectedValue 
  } = useJsonBuilderStore();
  
  const [jsonOutput, setJsonOutput] = useState('{}');

  // Update JSON output whenever data changes
  useEffect(() => {
    setJsonOutput(JSON.stringify(data, null, 2));
  }, [data]);

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

  const handleUpdateValue = (id: string, newValue: string) => {
    // Find the item to get its key
    const item = items.find((item: KeyValueItemType) => item.id === id);
    if (item && item.key) {
      // Manually update the data object since there's no direct updateValue method
      addSelectedValue(newValue);
    }
  };

  const handleStartValueSelection = (id: string) => {
    startSelection(id);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput)
      .then(() => {
        alert('JSON copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="json-builder">
      <div className="builder-header">
        <h2>JSON Builder</h2>
        <button className="add-button" onClick={handleAddKeyValuePair} disabled={isSelectionActive}>
          Add Key-Value Pair
        </button>
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
        <h3>JSON Output</h3>
        <pre>{jsonOutput}</pre>
        <button className="copy-button" onClick={copyToClipboard} disabled={isSelectionActive}>
          Copy to Clipboard
        </button>
      </div>

      {showLivePreview && livePreviewInfo && isSelectionActive && (
        <LivePreview info={livePreviewInfo} visible={true} />
      )}
    </div>
  );
};

export default JsonBuilder; 
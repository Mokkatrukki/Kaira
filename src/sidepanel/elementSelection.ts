import { useJsonBuilderStore, useStore, LivePreviewInfo } from './store';

// Function to start element selection
export function startElementSelection(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'startElementSelection' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error starting element selection:', chrome.runtime.lastError);
        useJsonBuilderStore.getState().resetSelection();
        resolve(false);
        return;
      }
      
      if (response?.success) {
        console.log('Element selection started');
        resolve(true);
      } else {
        console.error('Failed to start element selection:', response?.error || 'Unknown error');
        useJsonBuilderStore.getState().resetSelection();
        resolve(false);
      }
    });
  });
}

// Function to start list item selection with a root element
export function startListItemSelection(rootXPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'startListItemSelection', rootXPath }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error starting list item selection:', chrome.runtime.lastError);
        useJsonBuilderStore.getState().resetSelection();
        resolve(false);
        return;
      }
      
      if (response?.success) {
        console.log('List item selection started with root XPath:', rootXPath);
        resolve(true);
      } else {
        console.error('Failed to start list item selection:', response?.error || 'Unknown error');
        useJsonBuilderStore.getState().resetSelection();
        resolve(false);
      }
    });
  });
}

// Function to stop element selection
export function stopElementSelection(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      if (!tab?.id) {
        console.error('No active tab found');
        useJsonBuilderStore.getState().resetSelection();
        resolve(false);
        return;
      }
      
      chrome.tabs.sendMessage(tab.id, { action: 'deactivateSelectionMode' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error stopping element selection:', chrome.runtime.lastError);
          useJsonBuilderStore.getState().resetSelection();
          resolve(false);
          return;
        }
        
        if (response?.success) {
          console.log('Element selection stopped successfully');
          useJsonBuilderStore.getState().resetSelection();
          resolve(true);
        } else {
          console.error('Failed to stop element selection');
          useJsonBuilderStore.getState().resetSelection();
          resolve(false);
        }
      });
    });
  });
}

// Setup message listeners for element selection
export function setupElementSelectionListeners(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const jsonStore = useJsonBuilderStore.getState();
    const uiStore = useStore.getState();
    
    switch (message.action) {
      case 'elementSelected':
        if (jsonStore.isSelectionActive && message.data) {
          // Add the selected value with xpath, cssSelector, and fullXPath
          jsonStore.addSelectedValue(
            message.data.text || '',
            message.data.xpath,
            message.data.cssSelector,
            message.data.fullXPath
          );
          // Clear the live preview
          uiStore.setLivePreviewInfo(null);
          // Send response to prevent message port closed error
          sendResponse({ success: true });
        } else if (jsonStore.isRootSelectionActive && message.data) {
          // Add the selected root element for a list
          jsonStore.addSelectedRootValue(
            message.data.fullXPath
          );
          // Clear the live preview
          uiStore.setLivePreviewInfo(null);
          // Send response to prevent message port closed error
          sendResponse({ success: true });
        } else if (jsonStore.isItemSelectionActive && message.data) {
          // Add the selected item to the list
          if (message.data.isListItem && message.data.matchingValues && message.data.relativeXPath) {
            // For list items with multiple matching values
            jsonStore.addSelectedItemValue(
              message.data.text || '',
              message.data.fullXPath,
              message.data.relativeXPath,
              message.data.matchingValues
            );
          } else {
            // Legacy case - single item
            jsonStore.addSelectedItemValue(
              message.data.text || '',
              message.data.fullXPath
            );
          }
          // Clear the live preview
          uiStore.setLivePreviewInfo(null);
          // Send response to prevent message port closed error
          sendResponse({ success: true });
        } else {
          // Send response to prevent message port closed error
          sendResponse({ success: false, error: 'No active selection mode' });
        }
        break;
        
      case 'scrollingModeActive':
        if (jsonStore.isSelectionActive || jsonStore.isRootSelectionActive || jsonStore.isItemSelectionActive) {
          jsonStore.setScrollingMode(message.data);
          // Send response to prevent message port closed error
          sendResponse({ success: true });
        } else {
          // Send response to prevent message port closed error
          sendResponse({ success: false, error: 'No active selection mode' });
        }
        break;
        
      case 'elementHighlighted':
        // Update the live preview
        if (message.data && (jsonStore.isSelectionActive || jsonStore.isRootSelectionActive || jsonStore.isItemSelectionActive)) {
          const previewInfo: LivePreviewInfo = {
            tagName: message.data.tagName,
            text: message.data.text || '',
            xpath: message.data.xpath,
            fullXPath: message.data.fullXPath
          };
          
          // Add list-specific information if available
          if (message.data.relativeXPath) {
            previewInfo.relativeXPath = message.data.relativeXPath;
            previewInfo.matchingCount = message.data.matchingCount;
          }
          
          uiStore.setLivePreviewInfo(previewInfo);
          uiStore.setShowLivePreview(true);
          // Send response to prevent message port closed error
          sendResponse({ success: true });
        } else {
          // Send response to prevent message port closed error
          sendResponse({ success: false, error: 'No active selection mode' });
        }
        break;
        
      default:
        // Send response to prevent message port closed error
        sendResponse({ success: false, error: 'Unknown action' });
        break;
    }
    
    // Return true to indicate that the response will be sent asynchronously
    return true;
  });
} 
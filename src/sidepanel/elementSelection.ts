import { useJsonBuilderStore, useStore, LivePreviewInfo } from './store';

// Function to start element selection
export function startElementSelection(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'startElementSelection' }, (response) => {
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

// Function to stop element selection
export function stopElementSelection(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'deactivateSelectionMode' }, (response) => {
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
      } else {
        console.error('No active tab found');
        useJsonBuilderStore.getState().resetSelection();
        resolve(false);
      }
    });
  });
}

// Setup message listeners for element selection
export function setupElementSelectionListeners(): void {
  chrome.runtime.onMessage.addListener((message) => {
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
        } else if (jsonStore.isRootSelectionActive && message.data) {
          // Add the selected root element for a list
          jsonStore.addSelectedRootValue(
            message.data.fullXPath
          );
          // Clear the live preview
          uiStore.setLivePreviewInfo(null);
        } else if (jsonStore.isItemSelectionActive && message.data) {
          // Add the selected item to the list
          jsonStore.addSelectedItemValue(
            message.data.text || '',
            message.data.fullXPath
          );
          // Clear the live preview
          uiStore.setLivePreviewInfo(null);
        }
        break;
        
      case 'scrollingModeActive':
        if (jsonStore.isSelectionActive || jsonStore.isRootSelectionActive || jsonStore.isItemSelectionActive) {
          jsonStore.setScrollingMode(message.data);
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
          uiStore.setLivePreviewInfo(previewInfo);
          uiStore.setShowLivePreview(true);
        }
        break;
    }
  });
} 
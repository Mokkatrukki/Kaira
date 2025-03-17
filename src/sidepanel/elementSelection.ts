import { useJsonBuilderStore, useStore, LivePreviewInfo } from './store';

// Function to start element selection
export function startElementSelection(): Promise<boolean> {
  const store = useJsonBuilderStore.getState();
  console.log('Starting element selection with state:', {
    isSelectionActive: store.isSelectionActive,
    isRootSelectionActive: store.isRootSelectionActive,
    isItemSelectionActive: store.isItemSelectionActive,
    currentItemId: store.currentItemId
  });
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ 
      action: 'startElementSelection',
      selectionState: {
        isSelectionActive: store.isSelectionActive,
        isRootSelectionActive: store.isRootSelectionActive,
        isItemSelectionActive: store.isItemSelectionActive
      }
    }, (response) => {
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
    
    console.log('Received message:', message.action, 'Selection states:', {
      isSelectionActive: jsonStore.isSelectionActive,
      isRootSelectionActive: jsonStore.isRootSelectionActive,
      isItemSelectionActive: jsonStore.isItemSelectionActive,
      currentItemId: jsonStore.currentItemId
    });
    
    switch (message.action) {
      case 'elementSelected':
        if (jsonStore.isSelectionActive && message.data) {
          console.log('Regular selection:', message.data);
          // Regular element selection
          jsonStore.addSelectedValue(
            message.data.text || '',
            message.data.xpath,
            message.data.cssSelector,
            message.data.fullXPath
          );
          // Clear the live preview
          uiStore.setLivePreviewInfo(null);
        } else if (jsonStore.isRootSelectionActive && message.data) {
          console.log('Root selection:', message.data);
          // Root element selection for list
          jsonStore.addSelectedRootValue(message.data.fullXPath);
          // Clear the live preview
          uiStore.setLivePreviewInfo(null);
        } else if (jsonStore.isItemSelectionActive && message.data) {
          console.log('Item selection:', message.data);
          // Item element selection for list
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
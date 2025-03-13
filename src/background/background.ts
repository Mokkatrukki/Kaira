// Background script for Kaira Chrome extension

console.log('Background script loaded');

// Initialize the side panel when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Kaira extension installed');
  
  // Set up the side panel
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({
      enabled: true,
      path: 'sidepanel.html'
    });
  }
});

// Open the side panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel && tab.id && tab.windowId) {
    chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
  }
});

// Function to inject the content script
async function injectContentScript(tabId: number) {
  try {
    // Check if the content script is already injected
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return window.hasOwnProperty('kairaSelectorInjected');
      }
    });
    
    const isInjected = injectionResults[0]?.result;
    
    if (!isInjected) {
      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['js/elementSelector.js']
      });
      
      // Mark the content script as injected
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // @ts-ignore
          window.kairaSelectorInjected = true;
        }
      });
      
      console.log('Content script injected');
    } else {
      console.log('Content script already injected');
    }
    
    return true;
  } catch (error) {
    console.error('Error injecting content script:', error);
    return false;
  }
}

// Listen for messages from the side panel or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages from the side panel
  if (message.action === 'startElementSelection') {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      
      if (tab && tab.id) {
        // Inject the content script if needed
        const injected = await injectContentScript(tab.id);
        
        if (injected) {
          // Send a message to the content script to activate selection mode
          chrome.tabs.sendMessage(tab.id, { action: 'activateSelectionMode' }, (response) => {
            sendResponse(response);
          });
        } else {
          sendResponse({ success: false, error: 'Failed to inject content script' });
        }
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    
    // Return true to indicate that we will send a response asynchronously
    return true;
  }
  
  // Handle messages from the content script
  if (message.action === 'elementSelected' || message.action === 'selectionModeActive') {
    // Forward the message to the side panel
    chrome.runtime.sendMessage(message);
  }
}); 
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
  console.log('Extension icon clicked, opening side panel for tab:', tab.id);
  if (chrome.sidePanel && tab.id && tab.windowId) {
    chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
  }
});

// Function to inject the content script
async function injectContentScript(tabId: number) {
  console.log('Attempting to inject content script into tab:', tabId);
  try {
    // Check if the content script is already injected
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return window.hasOwnProperty('kairaSelectorInjected');
      }
    });
    
    const isInjected = injectionResults[0]?.result;
    console.log('Content script injection check result:', isInjected);
    
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
      
      console.log('Content script injected successfully');
    } else {
      console.log('Content script already injected, skipping injection');
    }
    
    return true;
  } catch (error) {
    console.error('Error injecting content script:', error);
    return false;
  }
}

// Listen for messages from the side panel or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message, 'from sender:', sender);
  
  // Handle messages from the side panel
  if (message.action === 'startElementSelection') {
    console.log('Handling startElementSelection message');
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      console.log('Active tabs query result:', tabs);
      const tab = tabs[0];
      
      if (tab && tab.id) {
        console.log('Found active tab with ID:', tab.id);
        // Inject the content script if needed
        const injected = await injectContentScript(tab.id);
        
        if (injected) {
          console.log('Sending activateSelectionMode message to tab:', tab.id);
          // Send a message to the content script to activate selection mode
          chrome.tabs.sendMessage(tab.id, { 
            action: 'activateSelectionMode'
          }, (response) => {
            console.log('activateSelectionMode response:', response);
            sendResponse(response);
          });
        } else {
          console.error('Failed to inject content script');
          sendResponse({ success: false, error: 'Failed to inject content script' });
        }
      } else {
        console.error('No active tab found');
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    
    // Return true to indicate that we will send a response asynchronously
    return true;
  }
  
  // Handle deactivateSelectionMode message from the side panel
  if (message.action === 'deactivateSelectionMode') {
    console.log('Handling deactivateSelectionMode message from side panel');
    // This message should be forwarded to the content script
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      console.log('Active tabs query result for deactivateSelectionMode:', tabs);
      const tab = tabs[0];
      
      if (tab && tab.id) {
        console.log('Forwarding deactivateSelectionMode message to tab:', tab.id);
        // Forward the message to the content script
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          console.log('deactivateSelectionMode forwarded response:', response);
          sendResponse(response);
        });
      } else {
        console.error('No active tab found for deactivateSelectionMode');
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    
    // Return true to indicate that we will send a response asynchronously
    return true;
  }
  
  // Handle messages from the content script
  if (message.action === 'elementSelected' || 
      message.action === 'selectionModeActive' || 
      message.action === 'scrollingModeActive') {
    console.log('Forwarding message from content script to side panel:', message.action);
    // Forward the message to the side panel
    chrome.runtime.sendMessage(message, (response) => {
      console.log('Forward to side panel response:', response);
    });
  }
  
  // Return true for any other messages that might need async response
  return true;
}); 
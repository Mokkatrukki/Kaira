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
// Popup script for Kaira Chrome extension

console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  
  const openSidePanelButton = document.getElementById('open-sidepanel') as HTMLButtonElement;
  
  if (openSidePanelButton) {
    openSidePanelButton.addEventListener('click', () => {
      // Get the current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.id && currentTab.windowId) {
          // Open the side panel for the current tab
          if (chrome.sidePanel) {
            chrome.sidePanel.open({ tabId: currentTab.id, windowId: currentTab.windowId });
          }
          
          // Close the popup
          window.close();
        }
      });
    });
  }
}); 
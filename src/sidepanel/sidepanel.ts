// Side panel script for Kaira Chrome extension

console.log('Side Panel script loaded');

// Interface for element information
interface ElementInfo {
  tagName: string;
  id: string | null;
  classes: string[];
  text: string | null;
  attributes: { name: string; value: string }[];
  cssSelector: string;
  xpath: string;
  html: string;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Side Panel DOM loaded');
  
  // Get UI elements
  const startSelectionButton = document.getElementById('start-selection') as HTMLButtonElement;
  const stopSelectionButton = document.getElementById('stop-selection') as HTMLButtonElement;
  const selectionStatus = document.getElementById('selection-status') as HTMLDivElement;
  const elementInfoSection = document.getElementById('element-info') as HTMLDivElement;
  
  // Element info elements
  const elementTag = document.getElementById('element-tag') as HTMLDivElement;
  const elementId = document.getElementById('element-id') as HTMLDivElement;
  const elementClasses = document.getElementById('element-classes') as HTMLDivElement;
  const elementText = document.getElementById('element-text') as HTMLDivElement;
  const cssSelector = document.getElementById('css-selector') as HTMLDivElement;
  const xpathSelector = document.getElementById('xpath-selector') as HTMLDivElement;
  const elementHtml = document.getElementById('element-html') as HTMLDivElement;
  
  // Copy buttons
  const copyCssButton = document.getElementById('copy-css') as HTMLButtonElement;
  const copyXpathButton = document.getElementById('copy-xpath') as HTMLButtonElement;
  const copyTextButton = document.getElementById('copy-text') as HTMLButtonElement;
  
  // Function to start element selection
  function startElementSelection() {
    // Send message to background script to start element selection
    chrome.runtime.sendMessage({ action: 'startElementSelection' }, (response) => {
      if (response && response.success) {
        console.log('Element selection started');
      } else {
        console.error('Failed to start element selection:', response?.error || 'Unknown error');
        setSelectionStatus(false);
      }
    });
  }
  
  // Function to stop element selection
  function stopElementSelection() {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      if (tab && tab.id) {
        // Send message to content script to deactivate selection mode
        chrome.tabs.sendMessage(tab.id, { action: 'deactivateSelectionMode' }, (response) => {
          if (response && response.success) {
            console.log('Element selection stopped');
          } else {
            console.error('Failed to stop element selection');
          }
          
          setSelectionStatus(false);
        });
      }
    });
  }
  
  // Function to set selection status
  function setSelectionStatus(isActive: boolean) {
    if (isActive) {
      selectionStatus.textContent = 'Selection mode active';
      selectionStatus.className = 'status active';
      startSelectionButton.disabled = true;
      stopSelectionButton.disabled = false;
    } else {
      selectionStatus.textContent = 'Selection mode inactive';
      selectionStatus.className = 'status inactive';
      startSelectionButton.disabled = false;
      stopSelectionButton.disabled = true;
    }
  }
  
  // Function to display element information
  function displayElementInfo(info: ElementInfo) {
    // Show the element info section
    elementInfoSection.classList.remove('hidden');
    
    // Set element info
    elementTag.textContent = info.tagName;
    elementId.textContent = info.id || '-';
    elementClasses.textContent = info.classes.length > 0 ? info.classes.join(' ') : '-';
    
    // Handle text content - clean it up and display it properly
    if (info.text) {
      // Trim whitespace but preserve line breaks
      const cleanText = info.text.replace(/^\s+|\s+$/g, '');
      elementText.textContent = cleanText || '-';
    } else {
      elementText.textContent = '-';
    }
    
    cssSelector.textContent = info.cssSelector;
    xpathSelector.textContent = info.xpath;
    elementHtml.textContent = info.html;
  }
  
  // Function to copy text to clipboard
  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
      return false;
    }
  }
  
  // Add event listeners
  startSelectionButton.addEventListener('click', startElementSelection);
  stopSelectionButton.addEventListener('click', stopElementSelection);
  
  // Add event listeners for copy buttons
  copyCssButton.addEventListener('click', async () => {
    const success = await copyToClipboard(cssSelector.textContent || '');
    if (success) {
      copyCssButton.textContent = 'Copied!';
      setTimeout(() => {
        copyCssButton.textContent = 'Copy';
      }, 2000);
    }
  });
  
  copyXpathButton.addEventListener('click', async () => {
    const success = await copyToClipboard(xpathSelector.textContent || '');
    if (success) {
      copyXpathButton.textContent = 'Copied!';
      setTimeout(() => {
        copyXpathButton.textContent = 'Copy';
      }, 2000);
    }
  });
  
  if (copyTextButton) {
    copyTextButton.addEventListener('click', async () => {
      const success = await copyToClipboard(elementText.textContent || '');
      if (success) {
        copyTextButton.textContent = 'Copied!';
        setTimeout(() => {
          copyTextButton.textContent = 'Copy';
        }, 2000);
      }
    });
  }
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'elementSelected') {
      // Display the selected element information
      displayElementInfo(message.data);
      
      // Set selection status to inactive
      setSelectionStatus(false);
    } else if (message.action === 'selectionModeActive') {
      // Update the selection status
      setSelectionStatus(message.data);
    }
  });
}); 
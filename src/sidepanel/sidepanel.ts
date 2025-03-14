// Side panel script for Kaira Chrome extension

console.log('Side Panel script loaded');

// Interface for element information
interface ElementInfo {
  text: string | null;
  xpath: string;
  // We keep these properties in the interface for compatibility with the data sent from elementSelector.ts
  // but we don't use them in the UI anymore
  tagName: string;
  id: string | null;
  classes: string[];
  attributes: { name: string; value: string }[];
  cssSelector: string;
  html: string;
}

// Interface for live preview information
interface LivePreviewInfo {
  tagName: string;
  text: string | null;
}

// Store the last selected element info
let lastSelectedElementInfo: ElementInfo | null = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Side Panel DOM loaded');
  
  // Get UI elements
  const startSelectionButton = document.getElementById('start-selection') as HTMLButtonElement;
  const stopSelectionButton = document.getElementById('stop-selection') as HTMLButtonElement;
  const selectionStatus = document.getElementById('selection-status') as HTMLDivElement;
  const elementInfoSection = document.getElementById('element-info') as HTMLDivElement;
  
  // Live preview elements
  const livePreviewSection = document.getElementById('live-preview') as HTMLDivElement;
  const currentElementTag = document.getElementById('current-element-tag') as HTMLSpanElement;
  const livePreviewText = document.getElementById('live-preview-text') as HTMLDivElement;
  
  // Element info elements
  const elementText = document.getElementById('element-text') as HTMLDivElement;
  const xpathSelector = document.getElementById('xpath-selector') as HTMLDivElement;
  
  // Copy buttons
  const copyXpathButton = document.getElementById('copy-xpath') as HTMLButtonElement;
  const copyTextButton = document.getElementById('copy-text') as HTMLButtonElement;
  
  // Function to start element selection
  function startElementSelection() {
    chrome.runtime.sendMessage({ action: 'startElementSelection' }, (response) => {
      if (response?.success) {
        console.log('Element selection started');
      } else {
        console.error('Failed to start element selection:', response?.error || 'Unknown error');
        setSelectionStatus(false, false);
      }
    });
  }
  
  // Function to stop element selection
  function stopElementSelection() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'deactivateSelectionMode' }, (response) => {
          if (response?.success) {
            console.log('Element selection stopped successfully');
          } else {
            console.error('Failed to stop element selection');
          }
          setSelectionStatus(false, false);
        });
      } else {
        console.error('No active tab found');
        setSelectionStatus(false, false);
      }
    });
  }
  
  // Function to set selection status
  function setSelectionStatus(isActive: boolean, isScrollingMode: boolean) {
    if (isActive) {
      selectionStatus.textContent = isScrollingMode 
        ? 'Scrolling mode active (scroll to navigate, click to select)' 
        : 'Selection mode active (click an element to begin)';
      selectionStatus.className = 'status active';
      startSelectionButton.disabled = true;
      stopSelectionButton.disabled = false;
      
      // Show or hide live preview based on scrolling mode
      livePreviewSection.classList.toggle('hidden', !isScrollingMode);
      
      // Hide element info when in selection mode
      elementInfoSection.classList.add('hidden');
    } else {
      selectionStatus.textContent = 'Selection mode inactive';
      selectionStatus.className = 'status inactive';
      startSelectionButton.disabled = false;
      stopSelectionButton.disabled = true;
      
      // Hide live preview when not in selection mode
      livePreviewSection.classList.add('hidden');
    }
  }
  
  // Function to update live preview
  function updateLivePreview(info: LivePreviewInfo) {
    // Update tag name
    currentElementTag.textContent = info.tagName;
    
    // Update text content - clean it up and display it properly
    const cleanText = info.text ? info.text.trim().replace(/\s+/g, ' ') : '-';
    livePreviewText.textContent = cleanText;
  }
  
  // Function to display element information
  function displayElementInfo(info: ElementInfo) {
    // Store the element info for later use
    lastSelectedElementInfo = info;
    
    // Show the element info section
    elementInfoSection.classList.remove('hidden');
    
    // Handle text content - clean it up and display it properly
    elementText.textContent = info.text ? info.text.replace(/^\s+|\s+$/g, '') || '-' : '-';
    
    xpathSelector.textContent = info.xpath;
    
    // Hide live preview when showing final selection
    livePreviewSection.classList.add('hidden');
  }
  
  // Function to copy text to clipboard
  async function copyToClipboard(text: string, button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
    }
  }
  
  // Add event listeners
  startSelectionButton.addEventListener('click', startElementSelection);
  stopSelectionButton.addEventListener('click', stopElementSelection);
  
  // Add event listeners for copy buttons
  copyXpathButton.addEventListener('click', () => copyToClipboard(xpathSelector.textContent || '', copyXpathButton));
  if (copyTextButton) {
    copyTextButton.addEventListener('click', () => copyToClipboard(elementText.textContent || '', copyTextButton));
  }
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.action) {
      case 'elementSelected':
        displayElementInfo(message.data);
        setSelectionStatus(false, false);
        break;
        
      case 'selectionModeActive':
        setSelectionStatus(message.data, false);
        break;
        
      case 'scrollingModeActive':
        // Only update if scrolling mode is being activated or deactivated
        setSelectionStatus(true, message.data);
        break;
        
      case 'elementHighlighted':
        // Update live preview with currently highlighted element
        if (message.data) {
          updateLivePreview(message.data);
        }
        break;
    }
  });
}); 
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

// Store the last selected element info
let lastSelectedElementInfo: ElementInfo | null = null;

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
  
  // Search elements
  const searchCssButton = document.getElementById('search-css') as HTMLButtonElement;
  const searchXpathButton = document.getElementById('search-xpath') as HTMLButtonElement;
  const searchResult = document.getElementById('search-result') as HTMLDivElement;
  const foundElementText = document.getElementById('found-element-text') as HTMLDivElement;
  const foundElementTag = document.getElementById('found-element-tag') as HTMLDivElement;
  const searchStatus = document.getElementById('search-status') as HTMLDivElement;
  
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
    } else {
      selectionStatus.textContent = 'Selection mode inactive';
      selectionStatus.className = 'status inactive';
      startSelectionButton.disabled = false;
      stopSelectionButton.disabled = true;
    }
  }
  
  // Function to display element information
  function displayElementInfo(info: ElementInfo) {
    // Store the element info for later use
    lastSelectedElementInfo = info;
    
    // Show the element info section
    elementInfoSection.classList.remove('hidden');
    
    // Set element info
    elementTag.textContent = info.tagName;
    elementId.textContent = info.id || '-';
    elementClasses.textContent = info.classes.length > 0 ? info.classes.join(' ') : '-';
    
    // Handle text content - clean it up and display it properly
    elementText.textContent = info.text ? info.text.replace(/^\s+|\s+$/g, '') || '-' : '-';
    
    cssSelector.textContent = info.cssSelector;
    xpathSelector.textContent = info.xpath;
    elementHtml.textContent = info.html;
    
    // Hide search result
    searchResult.classList.add('hidden');
  }
  
  // Function to search for an element using a selector
  function searchWithSelector(selectorType: 'css' | 'xpath') {
    if (!lastSelectedElementInfo) {
      console.error('No element has been selected yet');
      return;
    }
    
    const selector = selectorType === 'css' 
      ? lastSelectedElementInfo.cssSelector 
      : lastSelectedElementInfo.xpath;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'searchWithSelector', 
          selectorType,
          selector 
        }, (response) => {
          if (response?.success) {
            displaySearchResult(response.data);
          } else {
            console.error('Failed to find element:', response?.error || 'Element not found');
            displaySearchResult(null);
          }
        });
      }
    });
  }
  
  // Function to display search result
  function displaySearchResult(result: { text: string, tagName: string } | null) {
    searchResult.classList.remove('hidden');
    
    if (result) {
      foundElementTag.textContent = result.tagName || '-';
      foundElementText.textContent = result.text || '-';
      searchStatus.textContent = 'Element found';
      searchStatus.style.color = 'var(--success-color)';
    } else {
      foundElementTag.textContent = '-';
      foundElementText.textContent = '-';
      searchStatus.textContent = 'Element not found';
      searchStatus.style.color = 'var(--error-color)';
    }
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
  copyCssButton.addEventListener('click', () => copyToClipboard(cssSelector.textContent || '', copyCssButton));
  copyXpathButton.addEventListener('click', () => copyToClipboard(xpathSelector.textContent || '', copyXpathButton));
  if (copyTextButton) {
    copyTextButton.addEventListener('click', () => copyToClipboard(elementText.textContent || '', copyTextButton));
  }
  
  // Add event listeners for search buttons
  searchCssButton.addEventListener('click', () => searchWithSelector('css'));
  searchXpathButton.addEventListener('click', () => searchWithSelector('xpath'));
  
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
        // Only update if scrolling mode is being activated
        // Ignore deactivation messages to prevent UI state conflicts
        if (message.data) {
          setSelectionStatus(true, message.data);
        }
        break;
    }
  });
}); 
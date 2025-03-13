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

// Interface for DOM path element
interface DOMPathElement {
  tagName: string;
  id: string | null;
  classes: string[];
  index: number;
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
  const domPathContainer = document.getElementById('dom-path-container') as HTMLDivElement;
  
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
    // Send message to background script to start element selection
    chrome.runtime.sendMessage({ 
      action: 'startElementSelection'
    }, (response) => {
      if (response && response.success) {
        console.log('Element selection started');
      } else {
        console.error('Failed to start element selection:', response?.error || 'Unknown error');
        setSelectionStatus(false, false);
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
          
          setSelectionStatus(false, false);
        });
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
      
      // Show DOM path container in scrolling mode
      if (isScrollingMode) {
        domPathContainer.classList.remove('hidden');
      }
    } else {
      selectionStatus.textContent = 'Selection mode inactive';
      selectionStatus.className = 'status inactive';
      startSelectionButton.disabled = false;
      stopSelectionButton.disabled = true;
      
      // Hide DOM path container when not in scrolling mode
      domPathContainer.classList.add('hidden');
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
    
    // Hide search result
    searchResult.classList.add('hidden');
  }
  
  // Function to display DOM path
  function displayDOMPath(path: DOMPathElement[]) {
    // Clear existing path
    domPathContainer.innerHTML = '<h2>DOM Path</h2>';
    
    // Create path elements
    const pathElement = document.createElement('div');
    pathElement.className = 'dom-path';
    
    // Add each element in the path
    path.forEach((element, index) => {
      const elementNode = document.createElement('div');
      elementNode.className = 'dom-path-element';
      
      // Create element tag with ID and classes
      let elementText = element.tagName;
      if (element.id) {
        elementText += `#${element.id}`;
      }
      if (element.classes.length > 0) {
        elementText += `.${element.classes.join('.')}`;
      }
      
      elementNode.textContent = elementText;
      
      // Add a separator except for the last element
      if (index < path.length - 1) {
        const separator = document.createElement('span');
        separator.className = 'dom-path-separator';
        separator.textContent = ' > ';
        elementNode.appendChild(separator);
      }
      
      pathElement.appendChild(elementNode);
    });
    
    // Add navigation instructions
    const instructions = document.createElement('div');
    instructions.className = 'navigation-help';
    instructions.innerHTML = `
      <div class="help-title">Navigation Controls:</div>
      <div class="help-item">• Scroll up: Navigate to parent element</div>
      <div class="help-item">• Scroll down: Navigate to first child element</div>
      <div class="help-item">• Click on highlighted area: Select this element</div>
      <div class="help-item">• Click outside highlighted area: Return to hover mode</div>
    `;
    
    domPathContainer.appendChild(pathElement);
    domPathContainer.appendChild(instructions);
  }
  
  // Function to search for an element using CSS selector
  function searchWithCssSelector() {
    if (!lastSelectedElementInfo) {
      console.error('No element has been selected yet');
      return;
    }
    
    const selector = lastSelectedElementInfo.cssSelector;
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      if (tab && tab.id) {
        // Send message to content script to search for the element
        chrome.tabs.sendMessage(tab.id, { 
          action: 'searchWithSelector', 
          selectorType: 'css',
          selector: selector 
        }, (response) => {
          if (response && response.success) {
            console.log('Element found:', response.data);
            displaySearchResult(response.data);
          } else {
            console.error('Failed to find element:', response?.error || 'Element not found');
            displaySearchResult(null);
          }
        });
      }
    });
  }
  
  // Function to search for an element using XPath
  function searchWithXPath() {
    if (!lastSelectedElementInfo) {
      console.error('No element has been selected yet');
      return;
    }
    
    const xpath = lastSelectedElementInfo.xpath;
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      if (tab && tab.id) {
        // Send message to content script to search for the element
        chrome.tabs.sendMessage(tab.id, { 
          action: 'searchWithSelector', 
          selectorType: 'xpath',
          selector: xpath 
        }, (response) => {
          if (response && response.success) {
            console.log('Element found:', response.data);
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
  
  // Add event listeners for search buttons
  searchCssButton.addEventListener('click', searchWithCssSelector);
  searchXpathButton.addEventListener('click', searchWithXPath);
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'elementSelected') {
      // Display the selected element information
      displayElementInfo(message.data);
      
      // Set selection status to inactive
      setSelectionStatus(false, false);
    } else if (message.action === 'selectionModeActive') {
      // Update the selection status
      setSelectionStatus(message.data, false);
    } else if (message.action === 'scrollingModeActive') {
      // Update the scrolling mode status
      setSelectionStatus(true, message.data);
    } else if (message.action === 'elementPathUpdated') {
      // Update the DOM path visualization
      displayDOMPath(message.data.path);
      
      // Update the element info
      displayElementInfo(message.data.currentElementInfo);
    }
  });
}); 
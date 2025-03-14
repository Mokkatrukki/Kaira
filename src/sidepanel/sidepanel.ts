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

// JSON builder data structure
interface JsonData {
  [key: string]: string;
}

// Store the JSON data
let jsonData: JsonData = {};
// Store the current key being defined
let currentJsonKey: string = '';
// Flag to track if we're in JSON selection mode
let isJsonSelectionMode: boolean = false;
// Counter for generating unique IDs for key-value items
let keyValueCounter: number = 0;
// Store the ID of the key-value item currently being edited
let currentKeyValueItemId: string | null = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Side Panel DOM loaded');
  
  // Get UI elements for element selector
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
  
  // Tab elements
  const selectorTab = document.getElementById('selector-tab') as HTMLButtonElement;
  const jsonTab = document.getElementById('json-tab') as HTMLButtonElement;
  const selectorPanel = document.getElementById('selector-panel') as HTMLDivElement;
  const jsonPanel = document.getElementById('json-panel') as HTMLDivElement;
  
  // JSON builder elements
  const keyValueList = document.getElementById('key-value-list') as HTMLDivElement;
  const addKeyButton = document.getElementById('add-key-button') as HTMLButtonElement;
  const jsonSelectionStatus = document.getElementById('json-selection-status') as HTMLDivElement;
  const jsonLivePreviewSection = document.getElementById('json-live-preview') as HTMLDivElement;
  const jsonCurrentElementTag = document.getElementById('json-current-element-tag') as HTMLSpanElement;
  const jsonLivePreviewText = document.getElementById('json-live-preview-text') as HTMLDivElement;
  const jsonDisplay = document.getElementById('json-display') as HTMLDivElement;
  const copyJsonButton = document.getElementById('copy-json') as HTMLButtonElement;
  const clearJsonButton = document.getElementById('clear-json') as HTMLButtonElement;
  
  // Function to create a new key-value item
  function createKeyValueItem(): string {
    const itemId = `key-value-${keyValueCounter++}`;
    const itemHtml = `
      <div id="${itemId}" class="key-value-item">
        <input type="text" class="json-input key-input" placeholder="Enter key name...">
        <div class="value-display">Click "Select" to choose a value</div>
        <div class="key-value-actions">
          <button class="action-button select-value">Select</button>
          <button class="action-button remove">Remove</button>
        </div>
      </div>
    `;
    
    keyValueList.insertAdjacentHTML('beforeend', itemHtml);
    
    // Add event listeners to the new item
    const newItem = document.getElementById(itemId) as HTMLDivElement;
    const selectButton = newItem.querySelector('.select-value') as HTMLButtonElement;
    const removeButton = newItem.querySelector('.remove') as HTMLButtonElement;
    
    selectButton.addEventListener('click', () => startElementSelectionForItem(itemId));
    removeButton.addEventListener('click', () => removeKeyValueItem(itemId));
    
    return itemId;
  }
  
  // Function to remove a key-value item
  function removeKeyValueItem(itemId: string) {
    const item = document.getElementById(itemId);
    if (!item) return;
    
    // Get the key from the input
    const keyInput = item.querySelector('.key-input') as HTMLInputElement;
    const key = keyInput.value.trim();
    
    // Remove the key from the JSON data if it exists
    if (key && jsonData[key] !== undefined) {
      delete jsonData[key];
      updateJsonDisplay();
    }
    
    // Remove the item from the DOM
    item.remove();
  }
  
  // Function to start element selection for a specific key-value item
  function startElementSelectionForItem(itemId: string) {
    const item = document.getElementById(itemId);
    if (!item) return;
    
    const keyInput = item.querySelector('.key-input') as HTMLInputElement;
    const key = keyInput.value.trim();
    
    if (!key) {
      alert('Please enter a key name first');
      return;
    }
    
    // Set the current key and item ID
    currentJsonKey = key;
    currentKeyValueItemId = itemId;
    
    // Start element selection in JSON mode
    startElementSelection(true);
  }
  
  // Function to start element selection
  function startElementSelection(forJsonBuilder: boolean = false) {
    // Set the mode flag
    isJsonSelectionMode = forJsonBuilder;
    
    chrome.runtime.sendMessage({ action: 'startElementSelection' }, (response) => {
      if (response?.success) {
        console.log('Element selection started');
      } else {
        console.error('Failed to start element selection:', response?.error || 'Unknown error');
        setSelectionStatus(false, false, forJsonBuilder);
      }
    });
  }
  
  // Function to stop element selection
  function stopElementSelection(forJsonBuilder: boolean = false) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'deactivateSelectionMode' }, (response) => {
          if (response?.success) {
            console.log('Element selection stopped successfully');
          } else {
            console.error('Failed to stop element selection');
          }
          setSelectionStatus(false, false, forJsonBuilder);
        });
      } else {
        console.error('No active tab found');
        setSelectionStatus(false, false, forJsonBuilder);
      }
    });
  }
  
  // Function to set selection status
  function setSelectionStatus(isActive: boolean, isScrollingMode: boolean, forJsonBuilder: boolean = false) {
    const statusElement = forJsonBuilder ? jsonSelectionStatus : selectionStatus;
    const startButton = forJsonBuilder ? null : startSelectionButton; // JSON mode uses item-specific buttons
    const stopButton = forJsonBuilder ? null : stopSelectionButton; // JSON mode doesn't have a stop button
    const livePreviewElement = forJsonBuilder ? jsonLivePreviewSection : livePreviewSection;
    
    if (isActive) {
      statusElement.textContent = isScrollingMode 
        ? 'Scrolling mode active (scroll to navigate, click to select)' 
        : 'Selection mode active (click an element to begin)';
      statusElement.className = 'status active';
      if (startButton) startButton.disabled = true;
      if (stopButton) stopButton.disabled = false;
      
      // Show or hide live preview based on scrolling mode
      livePreviewElement.classList.toggle('hidden', !isScrollingMode);
      
      // Hide element info when in selection mode
      if (!forJsonBuilder) {
        elementInfoSection.classList.add('hidden');
      }
      
      // Disable all select buttons in JSON mode
      if (forJsonBuilder) {
        const selectButtons = document.querySelectorAll('.key-value-item .select-value');
        selectButtons.forEach((button: Element) => {
          (button as HTMLButtonElement).disabled = true;
        });
      }
    } else {
      statusElement.textContent = 'Selection mode inactive';
      statusElement.className = 'status inactive';
      if (startButton) startButton.disabled = false;
      if (stopButton) stopButton.disabled = true;
      
      // Hide live preview when not in selection mode
      livePreviewElement.classList.add('hidden');
      
      // Enable all select buttons in JSON mode
      if (forJsonBuilder) {
        const selectButtons = document.querySelectorAll('.key-value-item .select-value');
        selectButtons.forEach((button: Element) => {
          (button as HTMLButtonElement).disabled = false;
        });
      }
    }
  }
  
  // Function to update live preview
  function updateLivePreview(info: LivePreviewInfo, forJsonBuilder: boolean = false) {
    // Update tag name
    const tagElement = forJsonBuilder ? jsonCurrentElementTag : currentElementTag;
    const previewTextElement = forJsonBuilder ? jsonLivePreviewText : livePreviewText;
    
    tagElement.textContent = info.tagName;
    
    // Update text content - clean it up and display it properly
    const cleanText = info.text ? info.text.trim().replace(/\s+/g, ' ') : '-';
    previewTextElement.textContent = cleanText;
  }
  
  // Function to display element information
  function displayElementInfo(info: ElementInfo) {
    // If in JSON selection mode, add to JSON instead
    if (isJsonSelectionMode) {
      addToJson(currentJsonKey, info.text || '');
      setSelectionStatus(false, false, true);
      return;
    }
    
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
  
  // Function to add a key-value pair to the JSON data
  function addToJson(key: string, value: string) {
    if (!key) return;
    
    // Add or update the key-value pair
    jsonData[key] = value;
    
    // Update the JSON display
    updateJsonDisplay();
    
    // Update the value display in the key-value item
    if (currentKeyValueItemId) {
      const item = document.getElementById(currentKeyValueItemId);
      if (item) {
        const valueDisplay = item.querySelector('.value-display') as HTMLDivElement;
        valueDisplay.textContent = value || 'No text content';
      }
      
      // Reset the current key-value item ID
      currentKeyValueItemId = null;
    }
    
    // Reset the current key
    currentJsonKey = '';
  }
  
  // Function to update the JSON display
  function updateJsonDisplay() {
    jsonDisplay.textContent = JSON.stringify(jsonData, null, 2);
  }
  
  // Function to clear the JSON data
  function clearJson() {
    jsonData = {};
    updateJsonDisplay();
    
    // Clear all key-value items
    keyValueList.innerHTML = '';
    
    // Add a new empty item
    createKeyValueItem();
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
  
  // Function to switch tabs
  function switchTab(tabId: string) {
    // Hide all tab panels
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => panel.classList.remove('active'));
    
    // Deactivate all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Activate the selected tab
    document.getElementById(tabId + '-panel')?.classList.add('active');
    document.getElementById(tabId + '-tab')?.classList.add('active');
  }
  
  // Add event listeners for element selector
  startSelectionButton.addEventListener('click', () => startElementSelection(false));
  stopSelectionButton.addEventListener('click', () => stopElementSelection(false));
  
  // Add event listeners for JSON builder
  addKeyButton.addEventListener('click', createKeyValueItem);
  clearJsonButton.addEventListener('click', clearJson);
  
  // Add event listeners for copy buttons
  copyXpathButton.addEventListener('click', () => copyToClipboard(xpathSelector.textContent || '', copyXpathButton));
  copyTextButton.addEventListener('click', () => copyToClipboard(elementText.textContent || '', copyTextButton));
  copyJsonButton.addEventListener('click', () => copyToClipboard(jsonDisplay.textContent || '', copyJsonButton));
  
  // Add event listeners for tab switching
  selectorTab.addEventListener('click', () => switchTab('selector'));
  jsonTab.addEventListener('click', () => switchTab('json'));
  
  // Initialize the JSON display
  updateJsonDisplay();
  
  // Create the first key-value item
  createKeyValueItem();
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.action) {
      case 'elementSelected':
        displayElementInfo(message.data);
        setSelectionStatus(false, false, isJsonSelectionMode);
        break;
        
      case 'selectionModeActive':
        setSelectionStatus(message.data, false, isJsonSelectionMode);
        break;
        
      case 'scrollingModeActive':
        // Only update if scrolling mode is being activated or deactivated
        setSelectionStatus(true, message.data, isJsonSelectionMode);
        break;
        
      case 'elementHighlighted':
        // Update live preview with currently highlighted element
        if (message.data) {
          updateLivePreview(message.data, isJsonSelectionMode);
        }
        break;
    }
  });
}); 
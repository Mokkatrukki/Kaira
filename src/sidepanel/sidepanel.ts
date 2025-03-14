// Side panel script for Kaira Chrome extension

import { 
  jsonBuilderState, 
  ElementInfo, 
  LivePreviewInfo 
} from './jsonBuilderState';

console.log('Side Panel script loaded');

// Store the last selected element info
let lastSelectedElementInfo: ElementInfo | null = null;

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
  
  // Flag to track if we're in JSON selection mode
  let isJsonSelectionMode: boolean = false;
  
  // Function to render the key-value list
  function renderKeyValueList(): void {
    const items = jsonBuilderState.items;
    
    // Clear the list
    keyValueList.innerHTML = '';
    
    // Add each item
    items.forEach(item => {
      const itemHtml = `
        <div id="${item.id}" class="key-value-item">
          <input type="text" class="json-input key-input" placeholder="Enter key name..." value="${item.key}">
          <div class="value-display">${item.value || 'Click "Select" to choose a value'}</div>
          <div class="key-value-actions">
            <button class="action-button select-value">Select</button>
            <button class="action-button remove">Remove</button>
          </div>
        </div>
      `;
      
      keyValueList.insertAdjacentHTML('beforeend', itemHtml);
      
      // Add event listeners to the new item
      const itemElement = document.getElementById(item.id) as HTMLDivElement;
      const keyInput = itemElement.querySelector('.key-input') as HTMLInputElement;
      const selectButton = itemElement.querySelector('.select-value') as HTMLButtonElement;
      const removeButton = itemElement.querySelector('.remove') as HTMLButtonElement;
      
      // Update key when input changes
      keyInput.addEventListener('change', () => {
        jsonBuilderState.updateItemKey(item.id, keyInput.value.trim());
      });
      
      // Start selection when select button is clicked
      selectButton.addEventListener('click', () => {
        if (jsonBuilderState.startSelection(item.id)) {
          startElementSelection(true);
        } else {
          alert('Please enter a key name first');
        }
      });
      
      // Remove item when remove button is clicked
      removeButton.addEventListener('click', () => {
        jsonBuilderState.removeItem(item.id);
      });
    });
    
    // Update the JSON display
    updateJsonDisplay();
  }
  
  // Function to update the JSON display
  function updateJsonDisplay(): void {
    jsonDisplay.textContent = JSON.stringify(jsonBuilderState.data, null, 2);
  }
  
  // Function to update the selection status
  function updateSelectionStatus(): void {
    // Update JSON selection status
    if (jsonBuilderState.isSelectionActive) {
      jsonSelectionStatus.textContent = jsonBuilderState.isScrollingMode
        ? 'Scrolling mode active (scroll to navigate, click to select)'
        : 'Selection mode active (click an element to begin)';
      jsonSelectionStatus.className = 'status active';
      
      // Show or hide live preview based on scrolling mode
      jsonLivePreviewSection.classList.toggle('hidden', !jsonBuilderState.isScrollingMode);
      
      // Disable all select buttons
      const selectButtons = document.querySelectorAll('.key-value-item .select-value');
      selectButtons.forEach((button: Element) => {
        (button as HTMLButtonElement).disabled = true;
      });
    } else {
      jsonSelectionStatus.textContent = 'Selection mode inactive';
      jsonSelectionStatus.className = 'status inactive';
      
      // Hide live preview
      jsonLivePreviewSection.classList.add('hidden');
      
      // Enable all select buttons
      const selectButtons = document.querySelectorAll('.key-value-item .select-value');
      selectButtons.forEach((button: Element) => {
        (button as HTMLButtonElement).disabled = false;
      });
    }
  }
  
  // Subscribe to state changes
  jsonBuilderState.subscribe(() => {
    renderKeyValueList();
    updateSelectionStatus();
  });
  
  // Function to start element selection
  function startElementSelection(forJsonBuilder: boolean = false) {
    // Set the mode flag
    isJsonSelectionMode = forJsonBuilder;
    
    chrome.runtime.sendMessage({ action: 'startElementSelection' }, (response) => {
      if (response?.success) {
        console.log('Element selection started');
      } else {
        console.error('Failed to start element selection:', response?.error || 'Unknown error');
        if (forJsonBuilder) {
          jsonBuilderState.resetSelection();
        } else {
          setSelectionStatus(false, false);
        }
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
          
          if (forJsonBuilder) {
            jsonBuilderState.resetSelection();
          } else {
            setSelectionStatus(false, false);
          }
        });
      } else {
        console.error('No active tab found');
        if (forJsonBuilder) {
          jsonBuilderState.resetSelection();
        } else {
          setSelectionStatus(false, false);
        }
      }
    });
  }
  
  // Function to set selection status for the original element selector
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
      jsonBuilderState.addSelectedValue(info.text || '');
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
    
    // Reset any active selection when switching tabs
    if (isJsonSelectionMode) {
      jsonBuilderState.resetSelection();
      stopElementSelection(true);
    } else if (selectionStatus.classList.contains('active')) {
      stopElementSelection(false);
    }
  }
  
  // Add event listeners for element selector
  startSelectionButton.addEventListener('click', () => startElementSelection(false));
  stopSelectionButton.addEventListener('click', () => stopElementSelection(false));
  
  // Add event listeners for JSON builder
  addKeyButton.addEventListener('click', () => jsonBuilderState.addItem());
  clearJsonButton.addEventListener('click', () => jsonBuilderState.clear());
  
  // Add event listeners for copy buttons
  copyXpathButton.addEventListener('click', () => copyToClipboard(xpathSelector.textContent || '', copyXpathButton));
  copyTextButton.addEventListener('click', () => copyToClipboard(elementText.textContent || '', copyTextButton));
  copyJsonButton.addEventListener('click', () => copyToClipboard(jsonDisplay.textContent || '', copyJsonButton));
  
  // Add event listeners for tab switching
  selectorTab.addEventListener('click', () => switchTab('selector'));
  jsonTab.addEventListener('click', () => switchTab('json'));
  
  // Add click listener to the JSON selection status to reset selection
  jsonSelectionStatus.addEventListener('click', () => {
    if (jsonBuilderState.isSelectionActive) {
      stopElementSelection(true);
    }
  });
  
  // Initialize the JSON builder
  jsonBuilderState.addItem();
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.action) {
      case 'elementSelected':
        displayElementInfo(message.data);
        break;
        
      case 'selectionModeActive':
        if (isJsonSelectionMode) {
          // Do nothing, state is managed by JsonBuilderState
        } else {
          setSelectionStatus(message.data, false);
        }
        break;
        
      case 'scrollingModeActive':
        if (isJsonSelectionMode) {
          jsonBuilderState.setScrollingMode(message.data);
        } else {
          setSelectionStatus(true, message.data);
        }
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
// Element Selector content script for Kaira Chrome extension
// This script handles element selection, highlighting, and DOM navigation
// It sends the selected element's text content and XPath to the side panel

// State variables
let isSelectionActive = false;
let isScrollingMode = false;
let highlightedElement: Element | null = null;
let highlightOverlay: HTMLElement | null = null;

// Function to generate a CSS selector for an element
function generateCssSelector(element: Element): string {
  if (!element || element === document.body) {
    return 'body';
  }
  
  // Check if element has a short, simple ID (avoid long tokens)
  if (element.id && element.id.length < 20 && !/[^\w-]/.test(element.id)) {
    return `#${element.id}`;
  }
  
  // Try to find a unique, simple class
  if (element.classList.length > 0) {
    const uniqueClass = Array.from(element.classList).find(className => 
      className.length < 20 && 
      !/[^\w-]/.test(className) &&
      document.querySelectorAll(`.${className}`).length === 1
    );
    
    if (uniqueClass) {
      return `.${uniqueClass}`;
    }
    
    // Try to find a class that has few instances (less than 5)
    const rareClass = Array.from(element.classList).find(className => 
      className.length < 20 && 
      !/[^\w-]/.test(className) &&
      document.querySelectorAll(`.${className}`).length < 5
    );
    
    if (rareClass) {
      // Use tag name with class for more specificity
      return `${element.tagName.toLowerCase()}.${rareClass}`;
    }
  }
  
  // Generate a path-based selector
  const generatePathSelector = (el: Element): string => {
    if (!el || el === document.body) {
      return 'body';
    }
    
    const parent = el.parentElement;
    if (!parent) {
      return el.tagName.toLowerCase();
    }
    
    const tagName = el.tagName.toLowerCase();
    const siblings = Array.from(parent.children);
    const sameTagSiblings = siblings.filter(sibling => 
      sibling.tagName.toLowerCase() === tagName
    );
    
    if (sameTagSiblings.length === 1) {
      return `${generatePathSelector(parent)} > ${tagName}`;
    }
    
    const index = Array.from(sameTagSiblings).indexOf(el) + 1;
    return `${generatePathSelector(parent)} > ${tagName}:nth-child(${index})`;
  };
  
  return generatePathSelector(element);
}

// Function to generate XPath for an element
function generateXPath(element: Element): string {
  if (!element) {
    return '';
  }
  
  if (element === document.body) {
    return '/html/body';
  }
  
  // Generate a full XPath that doesn't rely on IDs
  const generateFullXPath = (el: Element): string => {
    if (!el || el === document.documentElement) {
      return '/html';
    }
    
    if (el === document.body) {
      return '/html/body';
    }
    
    let parent = el.parentElement;
    if (!parent) {
      return `/${el.tagName.toLowerCase()}`;
    }
    
    // Get the tag name
    let tagName = el.tagName.toLowerCase();
    
    // Count siblings with same tag name
    let siblings = Array.from(parent.children).filter(
      sibling => sibling.tagName.toLowerCase() === tagName
    );
    
    let position = 1;
    if (siblings.length > 1) {
      position = Array.from(siblings).indexOf(el) + 1;
    }
    
    // Build the path segment
    let pathSegment = `/${tagName}[${position}]`;
    
    // Recursively build the full path
    return generateFullXPath(parent) + pathSegment;
  };
  
  // Generate a more specific XPath using attributes if available
  const generateSpecificXPath = (el: Element): string | null => {
    // Skip if element has a long or complex ID
    const id = el.id;
    if (id && id.length < 20 && !/[^\w-]/.test(id)) {
      return `//${el.tagName.toLowerCase()}[@id="${id}"]`;
    }
    
    // Try with a simple class if available
    const simpleClass = Array.from(el.classList).find(cls => 
      cls.length < 20 && !/[^\w-]/.test(cls) && 
      document.querySelectorAll(`.${cls}`).length < 5
    );
    
    if (simpleClass) {
      return `//${el.tagName.toLowerCase()}[contains(@class, "${simpleClass}")]`;
    }
    
    return null;
  };
  
  // Try to get a specific XPath first, fall back to full XPath
  const specificXPath = generateSpecificXPath(element);
  if (specificXPath) {
    return specificXPath;
  }
  
  return generateFullXPath(element);
}

// Function to get element information
function getElementInfo(element: Element): any {
  // Generate a full XPath (absolute path from html)
  const generateFullXPath = (el: Element): string => {
    if (!el) return '';
    if (el === document.documentElement) return '/html';
    if (el === document.body) return '/html/body';
    
    const parent = el.parentElement;
    if (!parent) return `/${el.tagName.toLowerCase()}`;
    
    const tagName = el.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(
      sibling => sibling.tagName.toLowerCase() === tagName
    );
    
    const position = siblings.length > 1 ? 
      Array.from(siblings).indexOf(el) + 1 : 1;
    
    return `${generateFullXPath(parent)}/${tagName}[${position}]`;
  };
  
  const fullXPath = generateFullXPath(element);
  
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: Array.from(element.classList),
    text: element.textContent || null,
    attributes: Array.from(element.attributes).map(attr => ({
      name: attr.name,
      value: attr.value
    })),
    cssSelector: generateCssSelector(element),
    xpath: generateXPath(element),
    fullXPath: fullXPath,
    html: element.outerHTML.substring(0, 500)
  };
}

// Function to get basic element information for live preview
function getLivePreviewInfo(element: Element): any {
  // Generate a full XPath (absolute path from html)
  const generateFullXPath = (el: Element): string => {
    if (!el) return '';
    if (el === document.documentElement) return '/html';
    if (el === document.body) return '/html/body';
    
    const parent = el.parentElement;
    if (!parent) return `/${el.tagName.toLowerCase()}`;
    
    const tagName = el.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(
      sibling => sibling.tagName.toLowerCase() === tagName
    );
    
    const position = siblings.length > 1 ? 
      Array.from(siblings).indexOf(el) + 1 : 1;
    
    return `${generateFullXPath(parent)}/${tagName}[${position}]`;
  };
  
  return {
    tagName: element.tagName.toLowerCase(),
    text: element.textContent || null,
    xpath: generateXPath(element),
    fullXPath: generateFullXPath(element)
  };
}

// Function to send highlighted element info to side panel
function sendHighlightedElementInfo(element: Element): void {
  if (!element) return;
  
  chrome.runtime.sendMessage({
    action: 'elementHighlighted',
    data: getLivePreviewInfo(element)
  });
}

// Function to manage the highlight overlay
const overlay = {
  create: (): HTMLElement => {
    // Create the main overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.border = '2px solid #1a73e8';
    overlay.style.backgroundColor = 'rgba(26, 115, 232, 0.1)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10000';
    overlay.style.boxShadow = '0 0 0 2000px rgba(0, 0, 0, 0.05)';
    overlay.style.transition = 'all 0.2s ease-in-out';
    
    // Create the label element
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.top = '-24px';
    label.style.left = '0';
    label.style.backgroundColor = '#1a73e8';
    label.style.color = 'white';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '12px';
    label.style.fontFamily = 'Arial, sans-serif';
    label.style.fontWeight = 'bold';
    label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
    label.style.zIndex = '10001';
    label.id = 'kaira-element-label';
    
    // Append the label to the overlay
    overlay.appendChild(label);
    document.body.appendChild(overlay);
    
    return overlay;
  },
  
  position: (element: Element): void => {
    if (!highlightOverlay) {
      highlightOverlay = overlay.create();
    }
    
    const rect = element.getBoundingClientRect();
    highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
    highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
    highlightOverlay.style.width = `${rect.width}px`;
    highlightOverlay.style.height = `${rect.height}px`;
    highlightOverlay.style.display = 'block';
    
    // Update the label with just the element tag name
    const label = highlightOverlay.querySelector('#kaira-element-label') as HTMLElement;
    if (label) {
      // Show only the tag name for simplicity
      label.textContent = element.tagName.toLowerCase();
      
      // Adjust label position if it would go off-screen
      if (rect.top < 30) {
        label.style.top = 'auto';
        label.style.bottom = '-24px';
      } else {
        label.style.top = '-24px';
        label.style.bottom = 'auto';
      }
    }
    
    // If in scrolling mode, send element info to side panel for live preview
    if (isScrollingMode) {
      sendHighlightedElementInfo(element);
    }
  },
  
  remove: (): void => {
    if (highlightOverlay) {
      highlightOverlay.style.display = 'none';
    }
  }
};

// Event handlers
const handlers = {
  // Handle mouseover events
  mouseOver: (event: MouseEvent): void => {
    if (!isSelectionActive || isScrollingMode) return;
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Get the target element
    const target = event.target as Element;
    
    // Update the highlighted element
    highlightedElement = target;
    
    // Position the highlight overlay
    overlay.position(target);
  },
  
  // Handle click events
  click: (event: MouseEvent): void => {
    if (!isSelectionActive) return;
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Get the target element
    const target = event.target as Element;
    
    // If we're already in scrolling mode, check if the click is on the highlighted element
    if (isScrollingMode) {
      // Check if the click is within the highlighted element's area
      if (highlightedElement) {
        const rect = highlightedElement.getBoundingClientRect();
        const isInHighlightedArea = (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
        
        if (isInHighlightedArea) {
          // Select the current highlighted element
          const elementInfo = getElementInfo(highlightedElement);
          
          // Send the element information to the side panel
          chrome.runtime.sendMessage({
            action: 'elementSelected',
            data: elementInfo
          });
          
          // Deactivate selection mode
          deactivateSelectionMode();
          return;
        } else {
          // Exit scrolling mode and go back to hover mode
          isScrollingMode = false;
          
          // Update the highlighted element to the clicked element
          highlightedElement = target;
          overlay.position(target);
          
          // Notify side panel that we're back to hover mode
          chrome.runtime.sendMessage({
            action: 'scrollingModeActive',
            data: false
          });
          
          return;
        }
      }
    }
    
    // If we're not in scrolling mode, enter scrolling mode
    isScrollingMode = true;
    highlightedElement = target;
    overlay.position(target);
    
    // Update status in side panel
    chrome.runtime.sendMessage({
      action: 'scrollingModeActive',
      data: true
    });
    
    // Send initial element info for live preview
    if (highlightedElement) {
      sendHighlightedElementInfo(highlightedElement);
    }
  },
  
  // Handle wheel events for DOM navigation
  wheel: (event: WheelEvent): void => {
    if (!isSelectionActive || !isScrollingMode || !highlightedElement) return;
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Determine direction
    if (event.deltaY > 0) {
      // Scroll down - navigate to first child
      if (highlightedElement.firstElementChild) {
        highlightedElement = highlightedElement.firstElementChild;
      }
    } else if (event.deltaY < 0) {
      // Scroll up - navigate to parent
      if (highlightedElement.parentElement) {
        highlightedElement = highlightedElement.parentElement;
      }
    }
    
    // Update highlight overlay
    overlay.position(highlightedElement);
  }
};

// Function to activate selection mode
function activateSelectionMode(): void {
  isSelectionActive = true;
  isScrollingMode = false;
  
  // Add event listeners
  document.addEventListener('mouseover', handlers.mouseOver, true);
  document.addEventListener('click', handlers.click, true);
  document.addEventListener('wheel', handlers.wheel, { passive: false, capture: true });
  
  // Change cursor to indicate selection mode
  document.body.style.cursor = 'crosshair';
  
  // Send message to side panel that selection mode is active
  chrome.runtime.sendMessage({
    action: 'selectionModeActive',
    data: true
  });
}

// Function to deactivate selection mode
function deactivateSelectionMode(): void {
  isSelectionActive = false;
  isScrollingMode = false;
  
  // Remove event listeners
  document.removeEventListener('mouseover', handlers.mouseOver, true);
  document.removeEventListener('click', handlers.click, true);
  document.removeEventListener('wheel', handlers.wheel, true);
  
  // Reset cursor
  document.body.style.cursor = '';
  
  // Remove highlight overlay
  overlay.remove();
  
  // Send message to side panel that selection mode is inactive
  chrome.runtime.sendMessage({
    action: 'selectionModeActive',
    data: false
  });
  
  // Send message that scrolling mode is inactive
  chrome.runtime.sendMessage({
    action: 'scrollingModeActive',
    data: false
  });
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'activateSelectionMode':
      activateSelectionMode();
      sendResponse({ success: true });
      break;
      
    case 'deactivateSelectionMode':
      deactivateSelectionMode();
      sendResponse({ success: true });
      break;
  }
  
  // Return true to indicate that we will send a response asynchronously
  return true;
});

console.log('Element Selector content script loaded'); 
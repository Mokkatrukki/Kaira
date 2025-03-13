// Element Selector content script for Kaira Chrome extension

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
  
  // If element has an ID, use that
  if (element.id) {
    return `#${element.id}`;
  }
  
  // If element has a unique class, use that
  if (element.classList.length > 0) {
    const uniqueClass = Array.from(element.classList).find(className => 
      document.querySelectorAll(`.${className}`).length === 1
    );
    
    if (uniqueClass) {
      return `.${uniqueClass}`;
    }
  }
  
  // Otherwise, use the tag name and position
  const parent = element.parentElement;
  if (!parent) {
    return element.tagName.toLowerCase();
  }
  
  const siblings = Array.from(parent.children);
  const tagName = element.tagName.toLowerCase();
  const sameTagSiblings = siblings.filter(sibling => 
    sibling.tagName.toLowerCase() === tagName
  );
  
  if (sameTagSiblings.length === 1) {
    return `${generateCssSelector(parent)} > ${tagName}`;
  }
  
  const index = sameTagSiblings.indexOf(element as Element) + 1;
  return `${generateCssSelector(parent)} > ${tagName}:nth-child(${index})`;
}

// Function to generate XPath for an element
function generateXPath(element: Element): string {
  if (!element) {
    return '';
  }
  
  if (element === document.body) {
    return '/html/body';
  }
  
  let xpath = '';
  let parent = element.parentElement;
  
  if (!parent) {
    return `/${element.tagName.toLowerCase()}`;
  }
  
  // Get the tag name
  let tagName = element.tagName.toLowerCase();
  
  // Check if this element has an ID
  if (element.id) {
    return `//${tagName}[@id="${element.id}"]`;
  }
  
  // Count siblings with same tag name
  let siblings = Array.from(parent.children).filter(
    sibling => sibling.tagName.toLowerCase() === tagName
  );
  
  if (siblings.length > 1) {
    // If there are multiple siblings with the same tag, use position
    let position = siblings.indexOf(element as Element) + 1;
    xpath = `/${tagName}[${position}]`;
  } else {
    // If this is the only sibling with this tag name
    xpath = `/${tagName}`;
  }
  
  // Recursively build the path
  if (parent !== document.body) {
    return generateXPath(parent) + xpath;
  } else {
    return '/html/body' + xpath;
  }
}

// Function to get element information
function getElementInfo(element: Element): any {
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
    html: element.outerHTML.substring(0, 500)
  };
}

// Function to search for an element using a selector
function findElementWithSelector(selectorType: string, selector: string): Element | null {
  try {
    if (selectorType === 'css') {
      return document.querySelector(selector);
    } else if (selectorType === 'xpath') {
      const result = document.evaluate(
        selector,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue as Element;
    }
    return null;
  } catch (error) {
    console.error(`Invalid ${selectorType} selector:`, error);
    return null;
  }
}

// Function to highlight a found element
function highlightFoundElement(element: Element): void {
  if (!element) return;
  
  // Cast to HTMLElement to access style property
  const htmlElement = element as HTMLElement;
  
  // Create a temporary highlight effect
  const originalOutline = htmlElement.style.outline;
  const originalBackgroundColor = htmlElement.style.backgroundColor;
  const originalPosition = htmlElement.style.position;
  const originalZIndex = htmlElement.style.zIndex;
  
  // Apply highlight styles
  htmlElement.style.outline = '3px solid #4285f4';
  htmlElement.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
  htmlElement.style.position = 'relative';
  htmlElement.style.zIndex = '9999';
  
  // Scroll the element into view
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
  
  // Add pulsing effect
  let pulseCount = 0;
  const maxPulses = 3;
  const pulseInterval = setInterval(() => {
    if (pulseCount >= maxPulses) {
      clearInterval(pulseInterval);
      
      // Reset styles after pulsing
      htmlElement.style.outline = originalOutline;
      htmlElement.style.backgroundColor = originalBackgroundColor;
      htmlElement.style.position = originalPosition;
      htmlElement.style.zIndex = originalZIndex;
      return;
    }
    
    // Toggle highlight
    if (pulseCount % 2 === 0) {
      htmlElement.style.outline = '3px solid #34a853'; // Green
      htmlElement.style.backgroundColor = 'rgba(52, 168, 83, 0.2)';
    } else {
      htmlElement.style.outline = '3px solid #4285f4'; // Blue
      htmlElement.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
    }
    
    pulseCount++;
  }, 500);
}

// Function to manage the highlight overlay
const overlay = {
  create: (): HTMLElement => {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.border = '2px solid #1a73e8';
    overlay.style.backgroundColor = 'rgba(26, 115, 232, 0.1)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10000';
    overlay.style.boxShadow = '0 0 0 2000px rgba(0, 0, 0, 0.05)';
    overlay.style.transition = 'all 0.2s ease-in-out';
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
  },
  
  remove: (): void => {
    if (highlightOverlay) {
      highlightOverlay.style.display = 'none';
    }
  }
};

// Function to send element path to side panel for visualization
function sendElementPathToSidePanel(): void {
  if (!highlightedElement) return;
  
  // Build the DOM path from the current element up to the body
  const path: Array<{
    tagName: string;
    id: string | null;
    classes: string[];
    index: number;
  }> = [];
  
  let current: Element | null = highlightedElement;
  while (current && current !== document.body) {
    // Get the index among siblings with the same tag
    const tagName = current.tagName.toLowerCase();
    const parent = current.parentElement;
    let index = 0;
    
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        sibling => sibling.tagName.toLowerCase() === tagName
      );
      index = siblings.indexOf(current) + 1;
    }
    
    path.unshift({
      tagName,
      id: current.id || null,
      classes: Array.from(current.classList),
      index
    });
    
    current = current.parentElement;
  }
  
  // Send the path to the side panel
  chrome.runtime.sendMessage({
    action: 'elementPathUpdated',
    data: {
      path,
      currentElementInfo: getElementInfo(highlightedElement)
    }
  });
}

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
    
    // Send current element path to side panel for visualization
    sendElementPathToSidePanel();
    
    // Update status in side panel
    chrome.runtime.sendMessage({
      action: 'scrollingModeActive',
      data: true
    });
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
    
    // Send current element path to side panel for visualization
    sendElementPathToSidePanel();
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
      
    case 'searchWithSelector':
      const element = findElementWithSelector(message.selectorType, message.selector);
      
      if (element) {
        // Highlight the found element
        highlightFoundElement(element);
        
        // Return the element information
        sendResponse({
          success: true,
          data: {
            text: element.textContent?.trim() || '',
            tagName: element.tagName.toLowerCase()
          }
        });
      } else {
        sendResponse({
          success: false,
          error: 'Element not found'
        });
      }
      break;
  }
  
  // Return true to indicate that we will send a response asynchronously
  return true;
});

console.log('Element Selector content script loaded'); 
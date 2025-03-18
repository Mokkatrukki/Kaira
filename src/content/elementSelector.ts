// Element Selector content script for Kaira Chrome extension
// This script handles element selection, highlighting, and DOM navigation
// It sends the selected element's text content and XPath to the side panel

// State variables
let isSelectionActive = false;
let isScrollingMode = false;
let highlightedElement: Element | null = null;
let highlightOverlay: HTMLElement | null = null;

// List item selection state
let isListItemSelectionMode = false;
let rootElement: Element | null = null;
let rootXPath: string = '';
let matchingElements: Element[] = [];
let matchingOverlays: HTMLElement[] = [];

// Debug mode
const DEBUG = true;
function debug(...args: any[]) {
  if (DEBUG) {
    console.log('[KAIRA Debug]', ...args);
  }
}

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
    
    // For list item selection, highlight all matching elements
    if (isListItemSelectionMode && rootElement) {
      // Get the relative XPath from the root element to the target
      const relativeXPath = getRelativeXPath(target, rootElement);
      
      if (relativeXPath) {
        debug('Mouse over element with relative XPath:', relativeXPath);
        
        // Find all elements matching this relative XPath
        const matchingEls = findMatchingElements(relativeXPath, rootElement);
        
        if (matchingEls.length > 0) {
          debug(`Found ${matchingEls.length} matching elements for highlighting`);
          
          // Highlight all matching elements
          highlightMatchingElements(matchingEls);
          
          // Send the relative XPath with the highlighted element info for preview
          const elementInfo = getLivePreviewInfo(target);
          elementInfo.relativeXPath = relativeXPath;
          elementInfo.matchingCount = matchingEls.length;
          
          chrome.runtime.sendMessage({
            action: 'elementHighlighted',
            data: elementInfo
          });
        } else {
          debug('No matching elements found with this XPath');
          
          // Try to find a better target element - look for parents that might have matches
          let betterTarget = target;
          let bestMatchCount = 0;
          let currentEl = target;
          
          // Check up to 3 parent levels
          for (let i = 0; i < 3; i++) {
            if (!currentEl.parentElement || currentEl.parentElement === rootElement) break;
            
            currentEl = currentEl.parentElement;
            const parentRelXPath = getRelativeXPath(currentEl, rootElement);
            const parentMatches = findMatchingElements(parentRelXPath, rootElement);
            
            debug(`Parent level ${i+1}: ${parentRelXPath} -> ${parentMatches.length} matches`);
            
            // If we found more matches with this parent, use it instead
            if (parentMatches.length > bestMatchCount) {
              bestMatchCount = parentMatches.length;
              betterTarget = currentEl;
            }
          }
          
          // If we found a better target with matches, use it
          if (bestMatchCount > 0 && betterTarget !== target) {
            debug(`Using better target element with ${bestMatchCount} matches`);
            highlightedElement = betterTarget;
            overlay.position(betterTarget);
            
            const betterRelXPath = getRelativeXPath(betterTarget, rootElement);
            const betterMatches = findMatchingElements(betterRelXPath, rootElement);
            highlightMatchingElements(betterMatches);
            
            // Send updated info
            const betterInfo = getLivePreviewInfo(betterTarget);
            betterInfo.relativeXPath = betterRelXPath;
            betterInfo.matchingCount = betterMatches.length;
            
            chrome.runtime.sendMessage({
              action: 'elementHighlighted',
              data: betterInfo
            });
          } else {
            // Clear any existing matching highlights if there are no matches
            clearMatchingHighlights();
            sendHighlightedElementInfo(target);
          }
        }
      } else {
        // No relative XPath (might be the root itself)
        clearMatchingHighlights();
        sendHighlightedElementInfo(target);
      }
    } else {
      // For regular selection, just send the highlighted element info
      sendHighlightedElementInfo(target);
    }
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
          if (isListItemSelectionMode && rootElement && matchingElements.length > 0) {
            // For list items, collect all matching elements
            const relativeXPath = getRelativeXPath(highlightedElement, rootElement);
            
            if (relativeXPath) {
              // Get all matching values
              const values = matchingElements.map(el => el.textContent?.trim() || '');
              
              // Get element info for the highlighted element
              const elementInfo = getElementInfo(highlightedElement);
              
              // Add list-specific data 
              elementInfo.isListItem = true;
              elementInfo.relativeXPath = relativeXPath;
              elementInfo.matchingValues = values;
              elementInfo.matchingCount = matchingElements.length;
              
              // Include more information about the matches for debugging
              elementInfo.matchesInfo = matchingElements.map(el => ({
                tag: el.tagName.toLowerCase(),
                text: el.textContent?.trim() || '',
                path: rootElement ? getRelativeXPath(el, rootElement) : ''
              }));
              
              // Log for debugging
              console.log('Selected list item with matches:', {
                relativeXPath,
                matchCount: matchingElements.length,
                values
              });
              
              // Send the element information to the side panel
              chrome.runtime.sendMessage({
                action: 'elementSelected',
                data: elementInfo
              });
              
              // Clear matching highlights
              clearMatchingHighlights();
            }
          } else {
            // For regular items, select just the current element
            const elementInfo = getElementInfo(highlightedElement);
            
            // Send the element information to the side panel
            chrome.runtime.sendMessage({
              action: 'elementSelected',
              data: elementInfo
            });
          }
          
          // Deactivate selection mode
          deactivateSelectionMode();
          return;
        } else {
          // Exit scrolling mode and go back to hover mode
          isScrollingMode = false;
          
          // Update the highlighted element to the clicked element
          highlightedElement = target;
          overlay.position(target);
          
          // Clear matching highlights for list items
          if (isListItemSelectionMode) {
            clearMatchingHighlights();
          }
          
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
    
    // For list items, find and highlight matching elements
    if (isListItemSelectionMode && rootElement) {
      const relativeXPath = getRelativeXPath(target, rootElement);
      
      if (relativeXPath) {
        const matchingEls = findMatchingElements(relativeXPath, rootElement);
        highlightMatchingElements(matchingEls);
      }
    }
    
    // Update status in side panel
    chrome.runtime.sendMessage({
      action: 'scrollingModeActive',
      data: true
    });
    
    // Send initial element info for live preview
    if (highlightedElement) {
      if (isListItemSelectionMode && rootElement) {
        const relativeXPath = getRelativeXPath(highlightedElement, rootElement);
        if (relativeXPath) {
          const elementInfo = getLivePreviewInfo(highlightedElement);
          elementInfo.relativeXPath = relativeXPath;
          elementInfo.matchingCount = matchingElements.length;
          
          chrome.runtime.sendMessage({
            action: 'elementHighlighted',
            data: elementInfo
          });
        }
      } else {
        sendHighlightedElementInfo(highlightedElement);
      }
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
    
    // For list items, update matching elements
    if (isListItemSelectionMode && rootElement) {
      // Clear previous matching highlights
      clearMatchingHighlights();
      
      // Get new relative XPath and find matching elements
      const relativeXPath = getRelativeXPath(highlightedElement, rootElement);
      
      if (relativeXPath) {
        const matchingEls = findMatchingElements(relativeXPath, rootElement);
        highlightMatchingElements(matchingEls);
        
        // Send updated element info
        const elementInfo = getLivePreviewInfo(highlightedElement);
        elementInfo.relativeXPath = relativeXPath;
        elementInfo.matchingCount = matchingEls.length;
        
        chrome.runtime.sendMessage({
          action: 'elementHighlighted',
          data: elementInfo
        });
      } else {
        // No valid relative XPath (might be the root element itself or outside)
        sendHighlightedElementInfo(highlightedElement);
      }
    } else {
      // For regular selection, just send updated element info
      sendHighlightedElementInfo(highlightedElement);
    }
  }
};

// Function to get the relative XPath for an element from its root
function getRelativeXPath(element: Element, rootEl: Element): string {
  if (!element || !rootEl) return '';
  
  // Check if element is the root or outside of it
  if (element === rootEl || !rootEl.contains(element)) {
    return '';
  }
  
  // Build path from the element up to the root (but not including the root)
  let path = '';
  let currentElement: Element | null = element;
  
  while (currentElement && currentElement !== rootEl) {
    // Get the tag name of the current element
    const tagName = currentElement.tagName.toLowerCase();
    
    // Get the position among siblings with the same tag name
    // We'll include it in the XPath string but we'll strip it later
    // to make it more generic
    const siblings = Array.from(currentElement.parentElement?.children || [])
      .filter(child => child.tagName.toLowerCase() === tagName);
    
    let position = '';
    if (siblings.length > 1) {
      position = `[${Array.from(siblings).indexOf(currentElement) + 1}]`;
    }
    
    // Add this segment to the path
    path = `/${tagName}${position}${path}`;
    
    // Move up to the parent
    currentElement = currentElement.parentElement;
  }
  
  // Remove the first slash if there is one
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  
  // Make the path more generic by removing all position indices
  // This is important for matching multiple similar elements
  const genericPath = path.replace(/\[\d+\]/g, '');
  
  // For debugging
  console.log({
    original: path,
    generic: genericPath
  });
  
  return genericPath;
}

// Function to find all elements matching a relative XPath within a root element
function findMatchingElements(relativeXPath: string, rootEl: Element): Element[] {
  if (!relativeXPath || !rootEl) return [];
  
  try {
    // Create an XPath expression relative to the root element
    // Make the expression more generic by adding wildcards for indices
    // This way we match all elements with the same path pattern
    // For example, convert "li/div/div/h3" to "./li/div/div/h3"
    const genericXPath = `./${relativeXPath}`;
    
    debug('Searching with XPath:', genericXPath);
    
    // Evaluate the XPath
    const result = document.evaluate(
      genericXPath,
      rootEl,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    // Convert result to array
    const elements: Element[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      const element = result.snapshotItem(i) as Element;
      if (element) {
        elements.push(element);
      }
    }
    
    debug(`Found ${elements.length} matching elements with direct XPath`);
    
    // If we didn't find any elements with the exact path, try a more flexible approach
    if (elements.length === 0) {
      // Extract the tag name from the end of the path
      const lastTagMatch = relativeXPath.match(/\/([^\/]+)$/);
      if (lastTagMatch && lastTagMatch[1]) {
        const lastTag = lastTagMatch[1];
        debug(`Trying more flexible match for tag: ${lastTag}`);
        
        // Try to find all elements with this tag
        const similarElements = Array.from(rootEl.querySelectorAll(lastTag));
        debug(`Found ${similarElements.length} elements with tag ${lastTag}`);
        
        // Filter to elements that are somewhat similar in structure to what we want
        const pathParts = relativeXPath.split('/');
        return similarElements.filter(el => {
          // This is a simplistic heuristic - we check if this element
          // has at least some of the parent structure we expect
          let currentEl = el;
          let level = 0;
          for (let i = pathParts.length - 2; i >= 0 && level < 3; i--, level++) {
            currentEl = currentEl.parentElement as Element;
            if (!currentEl) return false;
            
            // Check if this parent element tag matches the expected tag from the path
            const expectedTag = pathParts[i].replace(/\[\d+\]/, '');
            if (currentEl.tagName.toLowerCase() !== expectedTag) {
              return false;
            }
          }
          return true;
        });
      }
    }
    
    return elements;
  } catch (error) {
    console.error('Error finding matching elements:', error);
    return [];
  }
}

// Function to highlight all matching elements
function highlightMatchingElements(elements: Element[]): void {
  // Clear any existing highlights
  clearMatchingHighlights();
  
  // Create highlights for each matching element
  matchingElements = elements;
  matchingOverlays = elements.map(element => {
    const highlightEl = document.createElement('div');
    highlightEl.style.position = 'absolute';
    highlightEl.style.border = '2px dashed #1a73e8';
    highlightEl.style.backgroundColor = 'rgba(26, 115, 232, 0.05)';
    highlightEl.style.pointerEvents = 'none';
    highlightEl.style.zIndex = '9999';
    
    // Position the highlight
    const rect = element.getBoundingClientRect();
    highlightEl.style.top = `${rect.top + window.scrollY}px`;
    highlightEl.style.left = `${rect.left + window.scrollX}px`;
    highlightEl.style.width = `${rect.width}px`;
    highlightEl.style.height = `${rect.height}px`;
    
    document.body.appendChild(highlightEl);
    return highlightEl;
  });
}

// Function to clear all matching highlights
function clearMatchingHighlights(): void {
  matchingOverlays.forEach(overlay => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });
  matchingOverlays = [];
}

// Function to update matching highlights positions (for scrolling)
function updateMatchingHighlightsPositions(): void {
  if (matchingElements.length !== matchingOverlays.length) return;
  
  matchingElements.forEach((element, index) => {
    const overlay = matchingOverlays[index];
    if (element && overlay) {
      const rect = element.getBoundingClientRect();
      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    }
  });
}

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

// Function to activate list item selection mode
function activateListItemSelectionMode(rootXPathValue: string): void {
  // First activate normal selection mode
  activateSelectionMode();
  
  // Set list item selection specific state
  isListItemSelectionMode = true;
  rootXPath = rootXPathValue;
  
  debug('Activating list item selection mode with root XPath:', rootXPathValue);
  
  // Find root element from XPath
  try {
    const rootResult = document.evaluate(
      rootXPathValue,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    
    rootElement = rootResult.singleNodeValue as Element;
    
    if (!rootElement) {
      console.error('Root element not found with XPath:', rootXPathValue);
      deactivateSelectionMode();
      return;
    }
    
    debug('Found root element:', {
      tag: rootElement.tagName,
      childCount: rootElement.childElementCount,
      html: rootElement.outerHTML.substring(0, 100) + '...'
    });
    
    // Highlight the root element with a different color to show its active
    const rootHighlight = document.createElement('div');
    rootHighlight.style.position = 'absolute';
    rootHighlight.style.border = '2px solid #34a853';
    rootHighlight.style.backgroundColor = 'rgba(52, 168, 83, 0.05)';
    rootHighlight.style.pointerEvents = 'none';
    rootHighlight.style.zIndex = '9998';
    
    const rect = rootElement.getBoundingClientRect();
    rootHighlight.style.top = `${rect.top + window.scrollY}px`;
    rootHighlight.style.left = `${rect.left + window.scrollX}px`;
    rootHighlight.style.width = `${rect.width}px`;
    rootHighlight.style.height = `${rect.height}px`;
    
    document.body.appendChild(rootHighlight);
    
    // Store the root highlight to remove it later
    matchingOverlays.push(rootHighlight);
    
  } catch (error) {
    console.error('Error finding root element:', error);
    deactivateSelectionMode();
  }
}

// Function to deactivate selection mode
function deactivateSelectionMode(): void {
  isSelectionActive = false;
  isScrollingMode = false;
  isListItemSelectionMode = false;
  rootElement = null;
  rootXPath = '';
  
  // Remove event listeners
  document.removeEventListener('mouseover', handlers.mouseOver, true);
  document.removeEventListener('click', handlers.click, true);
  document.removeEventListener('wheel', handlers.wheel, true);
  
  // Reset cursor
  document.body.style.cursor = '';
  
  // Remove highlight overlay
  overlay.remove();
  
  // Clear matching highlights
  clearMatchingHighlights();
  
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
      
    case 'activateListItemSelectionMode':
      if (message.rootXPath) {
        activateListItemSelectionMode(message.rootXPath);
        sendResponse({ success: true });
      } else {
        console.error('No root XPath provided for list item selection mode');
        sendResponse({ success: false, error: 'No root XPath provided' });
      }
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
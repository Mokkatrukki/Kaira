import { create } from 'zustand';
import { 
  JsonBuilderStore, 
  KeyValueItem, 
  CollectedItem,
  Selector
} from './types';
import { 
  getRelativeXPathFromFullXPath,
  highlightRootElement,
  removeRootElementHighlight
} from './utils';

// Create the main JSON builder store
export const useJsonBuilderStore = create<JsonBuilderStore>((set, get) => ({
  // Initial state
  data: {},
  items: [],
  collection: [],
  isSelectionActive: false,
  isScrollingMode: false,
  currentItemId: null,
  isListMode: false,
  isRootSelectionActive: false,
  isItemSelectionActive: false,
  counter: 0,
  
  // Item management actions
  addItem: () => {
    const { counter, items } = get();
    const id = `key-value-${counter}`;
    
    set({
      items: [...items, { id, key: '', value: '' }],
      counter: counter + 1
    });
    
    return id;
  },
  
  addListItem: () => {
    const { counter, items } = get();
    const id = `key-value-${counter}`;
    
    set({
      items: [...items, { id, key: '', value: '', isList: true }],
      counter: counter + 1
    });
    
    return id;
  },
  
  removeItem: (id: string) => {
    const { items, data } = get();
    const item = items.find((item: KeyValueItem) => item.id === id);
    
    if (!item) return;
    
    // If it's a list item with a root element, clear the highlight
    if (item.isList && item.rootFullXPath) {
      removeRootElementHighlight(item.rootFullXPath);
    }
    
    if (item && item.key) {
      const newData = { ...data };
      delete newData[item.key];
      
      set({
        data: newData,
        items: items.filter((item: KeyValueItem) => item.id !== id)
      });
    } else {
      set({
        items: items.filter((item: KeyValueItem) => item.id !== id)
      });
    }
  },
  
  updateItemKey: (id: string, key: string) => {
    const { items, data } = get();
    const item = items.find((item: KeyValueItem) => item.id === id);
    
    if (!item) return;
    
    // If the key changed and the old key exists in data, update it
    if (item.key && item.key !== key && data[item.key] !== undefined) {
      const newData = { ...data };
      newData[key] = newData[item.key];
      delete newData[item.key];
      
      set({
        data: newData,
        items: items.map((i: KeyValueItem) => 
          i.id === id ? { ...i, key } : i
        )
      });
    } else {
      set({
        items: items.map((i: KeyValueItem) => 
          i.id === id ? { ...i, key } : i
        )
      });
    }
  },
  
  // Selection mode actions
  startSelection: (itemId: string) => {
    const { items } = get();
    const item = items.find((item: KeyValueItem) => item.id === itemId);
    
    if (!item) return false;
    
    if (!item.key.trim()) {
      return false; // Key is required
    }
    
    set({
      currentItemId: itemId,
      isSelectionActive: true,
      isScrollingMode: false
    });
    
    return true;
  },
  
  startRootSelection: (itemId: string) => {
    const { items } = get();
    const item = items.find((item: KeyValueItem) => item.id === itemId);
    
    if (!item) {
      console.error('Item not found for ID:', itemId);
      return false;
    }
    
    if (!item.key.trim()) {
      console.error('Key is required for item:', itemId);
      return false; // Key is required
    }
    
    console.log('Setting currentItemId to:', itemId, 'for root selection');
    
    set({
      currentItemId: itemId,
      isRootSelectionActive: true,
      isItemSelectionActive: false,
      isSelectionActive: false,
      isScrollingMode: false
    });
    
    return true;
  },
  
  startItemSelection: (itemId: string) => {
    const { items } = get();
    const item = items.find((item: KeyValueItem) => item.id === itemId);
    
    if (!item) return false;
    
    if (!item.key.trim()) {
      return false; // Key is required
    }
    
    set({
      currentItemId: itemId,
      isItemSelectionActive: true,
      isRootSelectionActive: false,
      isSelectionActive: false,
      isScrollingMode: false
    });
    
    return true;
  },
  
  setScrollingMode: (isActive: boolean) => {
    set({ isScrollingMode: isActive });
  },
  
  // Selected element handling
  addSelectedValue: (value: string, xpath?: string, cssSelector?: string, fullXPath?: string) => {
    const { currentItemId, items, data } = get();
    
    if (!currentItemId) return;
    
    const item = items.find((item: KeyValueItem) => item.id === currentItemId);
    if (!item) return;
    
    // Update the item value, xpath, cssSelector, fullXPath and data
    const newItems = items.map((i: KeyValueItem) => 
      i.id === currentItemId ? { ...i, value, xpath, cssSelector, fullXPath } : i
    );
    
    const newData = { ...data };
    if (item.key) {
      newData[item.key] = value;
    }
    
    set({
      items: newItems,
      data: newData,
      isSelectionActive: false,
      isScrollingMode: false,
      currentItemId: null
    });
  },
  
  addSelectedRootValue: (fullXPath: string) => {
    const { currentItemId, items, data } = get();
    
    if (!currentItemId) return;
    
    const item = items.find((item: KeyValueItem) => item.id === currentItemId);
    if (!item || !item.isList) return;
    
    // Update the item with the root XPath
    const updatedItems = items.map((i: KeyValueItem) => 
      i.id === currentItemId ? { ...i, rootFullXPath: fullXPath, value: '[]' } : i
    );
    
    // Update the data object with an empty array for this list
    const newData = { ...data };
    if (item.key) {
      newData[item.key] = [];
    }
    
    set({
      items: updatedItems,
      data: newData,
      isRootSelectionActive: false,
      currentItemId: null,
      isScrollingMode: false
    });
    
    // Apply persistent highlight to the root element
    highlightRootElement(fullXPath);
  },
  
  addSelectedItemValue: (value: string, fullXPath: string, relativeXPath?: string, matchingValues?: string[]) => {
    const { items, data, currentItemId } = get();
    
    if (!currentItemId) return;
    
    // Find the current item
    const currentItem = items.find(item => item.id === currentItemId);
    
    if (!currentItem || !currentItem.key) return;
    
    // Use the provided matching values array (from all elements with same XPath) or create a single-item array
    const valueArray = matchingValues || [value];
    
    // Update the data object with the array of values 
    const newData = { ...data };
    newData[currentItem.key] = valueArray;
    
    // Update the items array with relativeXPath info
    const updatedItems = items.map(item => {
      if (item.id === currentItemId) {
        return {
          ...item,
          relativeXPath: relativeXPath || getRelativeXPathFromFullXPath(fullXPath, item.rootFullXPath),
          listItems: valueArray
        };
      }
      return item;
    });
    
    // Update state
    set({
      data: newData,
      items: updatedItems,
      isSelectionActive: false,
      isRootSelectionActive: false,
      isItemSelectionActive: false,
      currentItemId: null
    });
  },
  
  resetSelection: () => {
    set({
      isSelectionActive: false,
      isRootSelectionActive: false,
      isItemSelectionActive: false,
      currentItemId: null,
      isScrollingMode: false
    });
  },
  
  clear: () => {
    const { items } = get();
    
    // Clear all highlights from list root elements
    items.forEach(item => {
      if (item.isList && item.rootFullXPath) {
        removeRootElementHighlight(item.rootFullXPath);
      }
    });
    
    set({
      data: {},
      items: [],
      isSelectionActive: false,
      isScrollingMode: false,
      currentItemId: null,
      isListMode: false,
      isRootSelectionActive: false,
      isItemSelectionActive: false
    });
  },
  
  // Collection actions
  collectItems: async () => {
    const { items, collection } = get();
    
    // Create selectors object for finding elements
    const selectors: Record<string, Selector> = {};
    
    items.forEach(item => {
      if (item.key) {
        if (item.isList && item.rootFullXPath) {
          // For list items, include root element information and item selectors
          const listSelector: Selector = {
            type: 'list',
            rootElement: {
              fullXPath: item.rootFullXPath,
              xpath: item.xpath || '',
              cssSelector: item.cssSelector || ''
            }
          };
          
          // Add item selector information if available
          if (item.relativeXPath) {
            listSelector.itemSelector = {
              relativeXPath: item.relativeXPath
            };
          }
          
          selectors[item.key] = listSelector;
        } else if (item.xpath || item.cssSelector || item.fullXPath) {
          // For regular items, include the standard selectors
          selectors[item.key] = {
            type: 'single',
            xpath: item.xpath,
            cssSelector: item.cssSelector,
            fullXPath: item.fullXPath
          };
        }
      }
    });
    
    // If no selectors, return false
    if (Object.keys(selectors).length === 0) {
      alert('No selectors available. Please select elements first.');
      return false;
    }
    
    // Get current URL
    let url = '';
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      url = tabs[0]?.url || '';
    } catch (error) {
      console.error('Error getting current URL:', error);
    }
    
    // Execute script to find elements using selectors
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id! },
        func: collectDataFromPage,
        args: [selectors]
      });
      
      // Add to collection
      const collectedData = results[0]?.result || {};
      const newItem: CollectedItem = {
        url,
        timestamp: new Date().toISOString(),
        data: collectedData
      };
      
      set({
        collection: [...collection, newItem]
      });
      
      return true;
    } catch (error) {
      console.error('Error executing script:', error);
      return false;
    }
  },
  
  clearCollection: () => {
    set({ collection: [] });
  }
}));

// This function runs in the context of the page to collect data
function collectDataFromPage(selectors: Record<string, Selector>) {
  const results: Record<string, string | string[]> = {};
  
  // Process each selector type
  for (const [key, selectorObj] of Object.entries(selectors)) {
    // Handle list items
    if (selectorObj.type === 'list' && selectorObj.rootElement?.fullXPath) {
      try {
        // First, find the root element
        const rootElement = document.evaluate(
          selectorObj.rootElement.fullXPath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        
        if (rootElement) {
          // If we have an item selector, use it to find all matching items
          if (selectorObj.itemSelector?.relativeXPath) {
            const relativeXPath = selectorObj.itemSelector.relativeXPath;
            
            // Create XPath for evaluation by removing all indices to match all similar elements
            const genericXPath = `./${relativeXPath.replace(/\[\d+\]/g, '')}`;
            console.log('XPath for collection:', genericXPath);
            
            try {
              const xpathResult = document.evaluate(
                genericXPath,
                rootElement,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              );
              
              console.log(`Found ${xpathResult.snapshotLength} matching elements`);
              
              // Extract text from all matching elements
              const listItems: string[] = [];
              const elementsToHighlight = [];
              
              for (let i = 0; i < xpathResult.snapshotLength; i++) {
                const node = xpathResult.snapshotItem(i);
                if (node) {
                  listItems.push(node.textContent?.trim() || '');
                  elementsToHighlight.push(node);
                }
              }
              
              // If we didn't find any elements, try a more flexible approach
              if (listItems.length === 0) {
                // Try to extract the last tag and find all elements with that tag
                const lastTagMatch = relativeXPath.match(/\/([^\/]+)$/);
                if (lastTagMatch && lastTagMatch[1]) {
                  const lastTag = lastTagMatch[1].replace(/\[\d+\]/, '');
                  console.log(`Trying more flexible collection for tag: ${lastTag}`);
                  
                  // Find all elements with this tag under the root
                  const allElements = Array.from((rootElement as HTMLElement).querySelectorAll(lastTag));
                  
                  // Filter elements to those that likely match our pattern
                  const pathParts = relativeXPath.split('/').filter(part => part);
                  
                  // For each element, check if it has the expected parent structure
                  allElements.forEach((element: Element) => {
                    let currentEl: Element = element;
                    let matches = true;
                    
                    // Check parent hierarchy (up to 3 levels) to see if it matches expected structure
                    for (let i = pathParts.length - 2; i >= 0 && i >= pathParts.length - 4; i--) {
                      currentEl = currentEl.parentElement as Element;
                      if (!currentEl || currentEl === rootElement) {
                        // Stop if we reach the root or run out of parents
                        if (i > 0) matches = false;
                        break;
                      }
                      
                      const expectedTag = pathParts[i].replace(/\[\d+\]/, '');
                      if (currentEl.tagName.toLowerCase() !== expectedTag) {
                        matches = false;
                        break;
                      }
                    }
                    
                    if (matches) {
                      listItems.push(element.textContent?.trim() || '');
                      elementsToHighlight.push(element);
                    }
                  });
                  
                  console.log(`Found ${listItems.length} elements with flexible matching`);
                }
              }
              
              // Highlight all found elements temporarily
              highlightMatchedElements(elementsToHighlight);
              
              results[key] = listItems;
            } catch (error) {
              console.error(`Error evaluating XPath ${genericXPath}:`, error);
              
              // Fallback: try a simpler approach by selecting all elements of the same type
              try {
                // Extract the last element type from the XPath (e.g., "a" from "/li/div/div/div/h3/a")
                const lastElementMatch = relativeXPath.match(/\/([^\/]+)$/);
                if (lastElementMatch && lastElementMatch[1]) {
                  const elementType = lastElementMatch[1];
                  console.log(`Fallback: selecting all ${elementType} elements under root`);
                  
                  // Cast rootElement to HTMLElement to use querySelectorAll
                  const elements = (rootElement as HTMLElement).querySelectorAll(elementType);
                  console.log(`Found ${elements.length} ${elementType} elements`);
                  
                  const listItems: string[] = [];
                  elements.forEach((element: Element) => {
                    listItems.push(element.textContent?.trim() || '');
                  });
                  
                  // Highlight all found elements temporarily
                  highlightMatchedElements(Array.from(elements));
                  
                  results[key] = listItems;
                }
              } catch (fallbackError) {
                console.error('Fallback selection failed:', fallbackError);
              }
            }
          } else {
            // No item selector, just return an empty array
            results[key] = [];
          }
          
          continue;
        }
      } catch (error) {
        console.error(`Error with list XPath for ${key}:`, error);
      }
    }
    
    // Handle single items
    if (selectorObj.type === 'single') {
      // Try fullXPath first (most reliable across pages)
      if (selectorObj.fullXPath) {
        try {
          const fullXPathResult = document.evaluate(
            selectorObj.fullXPath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
          
          if (fullXPathResult) {
            results[key] = fullXPathResult.textContent?.trim() || '';
            continue; // Skip other selectors if fullXPath found the element
          }
        } catch (error) {
          console.error(`Error with fullXPath for ${key}:`, error);
        }
      }
      
      // Try XPath next
      if (selectorObj.xpath) {
        try {
          const xpathResult = document.evaluate(
            selectorObj.xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
          
          if (xpathResult) {
            results[key] = xpathResult.textContent?.trim() || '';
            continue; // Skip CSS selector if XPath found the element
          }
        } catch (error) {
          console.error(`Error with XPath for ${key}:`, error);
        }
      }
      
      // Try CSS selector if XPath didn't work
      if (selectorObj.cssSelector) {
        try {
          const cssResult = document.querySelector(selectorObj.cssSelector);
          if (cssResult) {
            results[key] = cssResult.textContent?.trim() || '';
          }
        } catch (error) {
          console.error(`Error with CSS selector for ${key}:`, error);
        }
      }
    }
  }
  
  return results;
}

// Helper function to highlight matched elements
function highlightMatchedElements(elements: Array<Element | Node>) {
  try {
    elements.forEach((element) => {
      try {
        const el = element as HTMLElement;
        // Store original styles
        const originalBackground = el.style.backgroundColor;
        const originalColor = el.style.color;
        const originalOutline = el.style.outline;
        
        // Apply highlight
        el.style.backgroundColor = "rgba(76, 175, 80, 0.3)"; // Green with transparency
        el.style.outline = "2px solid #4CAF50";
        
        // Reset after 3 seconds
        setTimeout(() => {
          try {
            el.style.backgroundColor = originalBackground;
            el.style.color = originalColor;
            el.style.outline = originalOutline;
          } catch (e) {
            // Element might no longer be in the DOM, ignore
          }
        }, 3000);
      } catch (elementError) {
        console.error('Error highlighting individual element:', elementError);
      }
    });
  } catch (highlightError) {
    console.error('Error highlighting elements:', highlightError);
  }
} 
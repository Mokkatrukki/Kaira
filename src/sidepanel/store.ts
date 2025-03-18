import { create } from 'zustand';

// Interface for key-value item
export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  xpath?: string;
  cssSelector?: string;
  fullXPath?: string;
  isList?: boolean;
  rootFullXPath?: string;
  relativeXPath?: string;
  listItems?: string[];
}

// Interface for element information
export interface ElementInfo {
  text: string | null;
  xpath: string;
  fullXPath: string;
  tagName: string;
  id: string | null;
  classes: string[];
  attributes: { name: string; value: string }[];
  cssSelector: string;
  html: string;
}

// Interface for live preview information
export interface LivePreviewInfo {
  tagName: string;
  text: string;
  xpath: string;
  fullXPath?: string;
  relativeXPath?: string;
  matchingCount?: number;
}

// Interface for a collected item
export interface CollectedItem {
  url: string;
  timestamp: string;
  data: Record<string, string | string[]>;
}

// Interface for the JSON builder store
interface JsonBuilderStore {
  // Data
  data: Record<string, string | string[]>;
  items: KeyValueItem[];
  
  // Collection
  collection: CollectedItem[];
  
  // Selection state
  isSelectionActive: boolean;
  isScrollingMode: boolean;
  currentItemId: string | null;
  
  // List selection state
  isListMode: boolean;
  isRootSelectionActive: boolean;
  isItemSelectionActive: boolean;
  
  // Counter for generating unique IDs
  counter: number;
  
  // Actions
  addItem: () => string;
  addListItem: () => string;
  removeItem: (id: string) => void;
  updateItemKey: (id: string, key: string) => void;
  startSelection: (itemId: string) => boolean;
  startRootSelection: (itemId: string) => boolean;
  startItemSelection: (itemId: string) => boolean;
  setScrollingMode: (isActive: boolean) => void;
  addSelectedValue: (value: string, xpath?: string, cssSelector?: string, fullXPath?: string) => void;
  addSelectedRootValue: (fullXPath: string) => void;
  addSelectedItemValue: (value: string, fullXPath: string, relativeXPath?: string, matchingValues?: string[]) => void;
  resetSelection: () => void;
  clear: () => void;
  
  // Collection actions
  collectItems: () => Promise<boolean>;
  clearCollection: () => void;
}

// Helper function to extract relative XPath from full XPath
function getRelativeXPathFromFullXPath(fullXPath: string, rootXPath?: string): string {
  if (!rootXPath || !fullXPath) return '';
  
  // If the fullXPath starts with rootXPath, just extract the relative part
  if (fullXPath.startsWith(rootXPath)) {
    let relativeXPath = fullXPath.substring(rootXPath.length);
    // If the relative path starts with a slash, remove it
    if (relativeXPath.startsWith('/')) {
      relativeXPath = relativeXPath.substring(1);
    }
    
    // For list items, we need a more generic pattern:
    // Convert patterns like "li[3]/div[1]/div[1]" to "li/div/div" to match all similar elements
    return relativeXPath.replace(/\[\d+\]/g, '');
  }
  
  // If the paths don't match directly, try to find a common prefix
  const rootParts = rootXPath.split('/');
  const fullParts = fullXPath.split('/');
  let commonPrefixLength = 0;
  
  for (let i = 0; i < Math.min(rootParts.length, fullParts.length); i++) {
    if (rootParts[i] === fullParts[i]) {
      commonPrefixLength++;
    } else {
      break;
    }
  }
  
  if (commonPrefixLength > 0) {
    // Extract the parts after the common prefix and make them generic by removing indices
    return fullParts.slice(commonPrefixLength).join('/').replace(/\[\d+\]/g, '');
  }
  
  // Fallback: just use the tag name as a simple selector
  const tagMatch = fullXPath.match(/\/([^\/\[\]]+)(?:\[\d+\])?$/);
  if (tagMatch) {
    return tagMatch[1];
  }
  
  console.error('Could not extract relative XPath from', fullXPath);
  return '';
}

// Create the store
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
  
  // Actions
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
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id! },
            func: (rootXPath) => {
              try {
                // Find the root element
                const rootElement = document.evaluate(
                  rootXPath as string,
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue as HTMLElement;
                
                if (!rootElement) return;
                
                // Restore original styles if they were saved
                if (rootElement.dataset.kairaOriginalOutline !== undefined) {
                  rootElement.style.outline = rootElement.dataset.kairaOriginalOutline;
                  delete rootElement.dataset.kairaOriginalOutline;
                }
                
                if (rootElement.dataset.kairaOriginalOutlineOffset !== undefined) {
                  rootElement.style.outlineOffset = rootElement.dataset.kairaOriginalOutlineOffset;
                  delete rootElement.dataset.kairaOriginalOutlineOffset;
                }
                
                delete rootElement.dataset.kairarootElement;
                rootElement.title = '';
              } catch (error) {
                console.error('Error removing highlight from root element:', error);
              }
            },
            args: [item.rootFullXPath]
          });
        } catch (error) {
          console.error('Error executing script for removing highlight:', error);
        }
      });
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
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id! },
          func: (rootXPath) => {
            try {
              // Find the root element
              const rootElement = document.evaluate(
                rootXPath as string,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              ).singleNodeValue as HTMLElement;
              
              if (!rootElement) return;
              
              // Store original styles
              const originalOutline = rootElement.style.outline;
              const originalOutlineOffset = rootElement.style.outlineOffset;
              
              // Apply subtle highlight to the root element
              rootElement.style.outline = "2px dashed rgba(106, 90, 205, 0.7)"; // Slateblue with transparency
              rootElement.style.outlineOffset = "2px";
              
              // Store the original styles in a data attribute for later restoration
              rootElement.dataset.kairarootElement = "true";
              rootElement.dataset.kairaOriginalOutline = originalOutline;
              rootElement.dataset.kairaOriginalOutlineOffset = originalOutlineOffset;
              
              // Add a tooltip to show this is a selected root element
              rootElement.title = "Kaira: Selected List Root Element";
            } catch (error) {
              console.error('Error highlighting root element:', error);
            }
          },
          args: [fullXPath]
        });
      } catch (error) {
        console.error('Error executing script for root highlight:', error);
      }
    });
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
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabs[0].id! },
              func: (rootXPath) => {
                try {
                  // Find the root element
                  const rootElement = document.evaluate(
                    rootXPath as string,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                  ).singleNodeValue as HTMLElement;
                  
                  if (!rootElement) return;
                  
                  // Restore original styles if they were saved
                  if (rootElement.dataset.kairaOriginalOutline !== undefined) {
                    rootElement.style.outline = rootElement.dataset.kairaOriginalOutline;
                    delete rootElement.dataset.kairaOriginalOutline;
                  }
                  
                  if (rootElement.dataset.kairaOriginalOutlineOffset !== undefined) {
                    rootElement.style.outlineOffset = rootElement.dataset.kairaOriginalOutlineOffset;
                    delete rootElement.dataset.kairaOriginalOutlineOffset;
                  }
                  
                  delete rootElement.dataset.kairarootElement;
                  rootElement.title = '';
                } catch (error) {
                  console.error('Error removing highlight from root element:', error);
                }
              },
              args: [item.rootFullXPath]
            });
          } catch (error) {
            console.error('Error executing script for removing highlight:', error);
          }
        });
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
    const selectors: Record<string, { 
      type: string;
      xpath?: string; 
      cssSelector?: string; 
      fullXPath?: string;
      rootElement?: {
        fullXPath: string;
        xpath?: string;
        cssSelector?: string;
      };
      itemSelector?: {
        relativeXPath: string;
      };
    }> = {};
    
    items.forEach(item => {
      if (item.key) {
        if (item.isList && item.rootFullXPath) {
          // For list items, include root element information and item selectors
          const listSelector: any = {
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
        func: (selectorsParam) => {
          const selectors = selectorsParam;
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
                      try {
                        elementsToHighlight.forEach((element) => {
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
                          try {
                            Array.from(elements).forEach((element) => {
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
        },
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

interface State {
  livePreviewInfo: LivePreviewInfo | null;
  showLivePreview: boolean;
  setLivePreviewInfo: (info: LivePreviewInfo | null) => void;
  setShowLivePreview: (show: boolean) => void;
}

export const useStore = create<State>((set) => ({
  livePreviewInfo: null,
  showLivePreview: true,
  setLivePreviewInfo: (info: LivePreviewInfo | null) => set({ livePreviewInfo: info }),
  setShowLivePreview: (show: boolean) => set({ showLivePreview: show }),
})); 
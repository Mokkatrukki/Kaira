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
  addSelectedItemValue: (value: string, fullXPath: string) => void;
  resetSelection: () => void;
  clear: () => void;
  
  // Collection actions
  collectItems: () => Promise<boolean>;
  clearCollection: () => void;
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
    const { currentItemId, items } = get();
    
    console.log('Adding root XPath:', fullXPath, 'for currentItemId:', currentItemId);
    
    if (!currentItemId) {
      console.error('No currentItemId set for root selection');
      return;
    }
    
    const item = items.find((item: KeyValueItem) => item.id === currentItemId);
    if (!item) {
      console.error('Item not found for currentItemId:', currentItemId);
      return;
    }
    
    console.log('Found item for root selection:', item);
    
    // Update the item with the root XPath
    const newItems = items.map((i: KeyValueItem) => 
      i.id === currentItemId ? { 
        ...i, 
        rootFullXPath: fullXPath
      } : i
    );
    
    console.log('Updated items with root XPath:', newItems.find(i => i.id === currentItemId));
    
    set({
      items: newItems,
      isRootSelectionActive: false,
      isItemSelectionActive: true, // Automatically move to item selection
      isScrollingMode: false
    });
    
    // Apply subtle highlight to the root element when moving to item selection
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
              rootElement.style.outline = "1px dashed rgba(74, 144, 226, 0.5)";
              rootElement.style.outlineOffset = "2px";
              
              // Store the original styles in a data attribute for later restoration
              rootElement.dataset.originalOutline = originalOutline;
              rootElement.dataset.originalOutlineOffset = originalOutlineOffset;
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
    
    console.log('State updated for root selection, moving to item selection');
  },
  
  addSelectedItemValue: (value: string, fullXPath: string) => {
    const { currentItemId, items, data } = get();
    
    if (!currentItemId) return;
    
    const item = items.find((item: KeyValueItem) => item.id === currentItemId);
    if (!item || !item.rootFullXPath) return;
    
    // Extract the relative XPath by removing the root XPath from the full XPath
    let relativeXPath = fullXPath.replace(item.rootFullXPath, '');
    
    // Make the relative XPath more generic by removing index selectors [n]
    // This will match all similar elements, not just the specific one selected
    relativeXPath = relativeXPath.replace(/\[\d+\]/g, '');
    
    console.log('Original relative XPath:', fullXPath.replace(item.rootFullXPath, ''));
    console.log('Generic relative XPath:', relativeXPath);
    
    // Preview all matching items to show what will be collected
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id! },
          func: (rootXPath, relXPath) => {
            // Find the root element
            const rootElement = document.evaluate(
              rootXPath as string,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue as HTMLElement;
            
            if (!rootElement) return { items: [], total: 0, allItems: [] };
            
            // Remove the subtle highlight from the root element
            if (rootElement.dataset.originalOutline !== undefined) {
              rootElement.style.outline = rootElement.dataset.originalOutline;
              delete rootElement.dataset.originalOutline;
            }
            
            if (rootElement.dataset.originalOutlineOffset !== undefined) {
              rootElement.style.outlineOffset = rootElement.dataset.originalOutlineOffset;
              delete rootElement.dataset.originalOutlineOffset;
            }
            
            // Create XPath for evaluation with wildcards
            const xpathForEvaluation = `.${(relXPath as string).replace(/\/([^\/]+)(?!\[)/g, '/$1[*]')}`;
            
            try {
              // Find all matching elements
              const xpathResult = document.evaluate(
                xpathForEvaluation,
                rootElement,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
              );
              
              console.log(`Found ${xpathResult.snapshotLength} matching elements`);
              
              // Extract preview of all items (limit to first 10 for performance)
              const previewItems = [];
              const maxPreview = Math.min(xpathResult.snapshotLength, 10);
              
              // Store elements to highlight
              const elementsToHighlight = [];
              
              for (let i = 0; i < xpathResult.snapshotLength; i++) {
                const node = xpathResult.snapshotItem(i);
                if (node) {
                  if (i < maxPreview) {
                    previewItems.push(node.textContent?.trim() || '');
                  }
                  elementsToHighlight.push(node);
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
                    el.style.backgroundColor = "yellow";
                    el.style.color = "black";
                    el.style.outline = "2px solid red";
                    
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
              
              // Add count if there are more items
              if (xpathResult.snapshotLength > 10) {
                previewItems.push(`... and ${xpathResult.snapshotLength - 10} more items`);
              }
              
              // Try to send message to background, but don't fail if it errors
              try {
                if (chrome.runtime && chrome.runtime.sendMessage) {
                  chrome.runtime.sendMessage({
                    action: 'scrollingModeActive',
                    data: false
                  }).catch(() => {
                    // Ignore errors with message sending
                    console.log('Note: Error sending message to background, but continuing anyway');
                  });
                }
              } catch (msgError) {
                // Ignore messaging errors
                console.log('Note: Error with chrome messaging, but continuing anyway');
              }
              
              return {
                items: previewItems,
                total: xpathResult.snapshotLength,
                allItems: elementsToHighlight.map(el => el.textContent?.trim() || '')
              };
            } catch (error) {
              console.error('Error previewing items:', error);
              return { items: [], total: 0, allItems: [] };
            }
          },
          args: [item.rootFullXPath, relativeXPath]
        });
        
        const previewResult = results[0]?.result as { items: string[], total: number, allItems: string[] } | undefined;
        if (previewResult && previewResult.total > 0) {
          console.log(`Preview: Found ${previewResult.total} items that will be collected`);
          console.log('Sample items:', previewResult.items);
          
          // Store all items in the data
          const newData = { ...data };
          if (item.key) {
            newData[item.key] = previewResult.allItems;
          }
          
          // Update the data state with all items
          set({
            data: newData
          });
        }
      } catch (error) {
        console.error('Error executing preview script:', error);
      }
    });
    
    // Update the item with the selected value, fullXPath, and relativeXPath
    const newItems = items.map((i: KeyValueItem) => 
      i.id === currentItemId ? { 
        ...i, 
        value, 
        fullXPath,
        relativeXPath
      } : i
    );
    
    // For list items, we'll initialize with the first value
    // The complete list will be updated by the preview script above
    const newData = { ...data };
    if (item.key) {
      newData[item.key] = [value]; // Initialize as an array with the first value
    }
    
    set({
      items: newItems,
      data: newData,
      isItemSelectionActive: false,
      isScrollingMode: false,
      currentItemId: null
    });
  },
  
  resetSelection: () => {
    set({
      isSelectionActive: false,
      isScrollingMode: false,
      currentItemId: null,
      isListMode: false,
      isRootSelectionActive: false,
      isItemSelectionActive: false
    });
  },
  
  clear: () => {
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
      xpath?: string; 
      cssSelector?: string; 
      fullXPath?: string;
      isList?: boolean;
      rootFullXPath?: string;
      relativeXPath?: string;
    }> = {};
    
    items.forEach(item => {
      if (item.key) {
        if (item.isList && item.rootFullXPath && item.relativeXPath) {
          // For list items, include the root XPath and relative XPath
          selectors[item.key] = {
            isList: true,
            rootFullXPath: item.rootFullXPath,
            relativeXPath: item.relativeXPath
          };
        } else if (item.xpath || item.cssSelector || item.fullXPath) {
          // For regular items, include the standard selectors
          selectors[item.key] = {
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
            if (selectorObj.isList && selectorObj.rootFullXPath && selectorObj.relativeXPath) {
              try {
                // First, find the root element
                const rootElement = document.evaluate(
                  selectorObj.rootFullXPath,
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue;
                
                if (rootElement) {
                  // Now find all elements matching the relative XPath within the root
                  const relativeXPath = selectorObj.relativeXPath;
                  
                  // Create a more specific XPath for evaluation by adding wildcards for indices
                  // This will match all elements with the same structure
                  const xpathForEvaluation = `.${relativeXPath.replace(/\/([^\/]+)(?!\[)/g, '/$1[*]')}`;
                  console.log('XPath for evaluation:', xpathForEvaluation);
                  
                  try {
                    const xpathResult = document.evaluate(
                      xpathForEvaluation,
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
                    console.error(`Error evaluating XPath ${xpathForEvaluation}:`, error);
                    
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
                  
                  continue;
                }
              } catch (error) {
                console.error(`Error with list XPath for ${key}:`, error);
              }
            }
            
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
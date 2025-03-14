import { create } from 'zustand';

// Interface for key-value item
export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  xpath?: string;
  cssSelector?: string;
}

// Interface for element information
export interface ElementInfo {
  text: string | null;
  xpath: string;
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
}

// Interface for a collected item
export interface CollectedItem {
  url: string;
  timestamp: string;
  data: Record<string, string>;
}

// Interface for the JSON builder store
interface JsonBuilderStore {
  // Data
  data: Record<string, string>;
  items: KeyValueItem[];
  
  // Collection
  collection: CollectedItem[];
  
  // Selection state
  isSelectionActive: boolean;
  isScrollingMode: boolean;
  currentItemId: string | null;
  
  // Counter for generating unique IDs
  counter: number;
  
  // Actions
  addItem: () => string;
  removeItem: (id: string) => void;
  updateItemKey: (id: string, key: string) => void;
  startSelection: (itemId: string) => boolean;
  setScrollingMode: (isActive: boolean) => void;
  addSelectedValue: (value: string, xpath?: string, cssSelector?: string) => void;
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
  
  setScrollingMode: (isActive: boolean) => {
    set({ isScrollingMode: isActive });
  },
  
  addSelectedValue: (value: string, xpath?: string, cssSelector?: string) => {
    const { currentItemId, items, data } = get();
    
    if (!currentItemId) return;
    
    const item = items.find((item: KeyValueItem) => item.id === currentItemId);
    if (!item) return;
    
    // Update the item value, xpath, cssSelector and data
    const newItems = items.map((i: KeyValueItem) => 
      i.id === currentItemId ? { ...i, value, xpath, cssSelector } : i
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
  
  resetSelection: () => {
    set({
      isSelectionActive: false,
      isScrollingMode: false,
      currentItemId: null
    });
  },
  
  clear: () => {
    set({
      data: {},
      items: [],
      isSelectionActive: false,
      isScrollingMode: false,
      currentItemId: null
    });
  },
  
  // Collection actions
  collectItems: async () => {
    const { items, collection } = get();
    
    // Create selectors object for finding elements
    const selectors: Record<string, { xpath?: string; cssSelector?: string }> = {};
    items.forEach(item => {
      if (item.key && (item.xpath || item.cssSelector)) {
        selectors[item.key] = {
          xpath: item.xpath,
          cssSelector: item.cssSelector
        };
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
          const results: Record<string, string> = {};
          
          // Process each selector type
          for (const [key, selectorObj] of Object.entries(selectors)) {
            // Try XPath first
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
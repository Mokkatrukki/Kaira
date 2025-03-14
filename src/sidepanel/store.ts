import { create } from 'zustand';

// Interface for key-value item
export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
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

// Interface for the JSON builder store
interface JsonBuilderStore {
  // Data
  data: Record<string, string>;
  items: KeyValueItem[];
  
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
  addSelectedValue: (value: string) => void;
  resetSelection: () => void;
  clear: () => void;
}

// Create the store
export const useJsonBuilderStore = create<JsonBuilderStore>((set, get) => ({
  // Initial state
  data: {},
  items: [],
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
  
  addSelectedValue: (value: string) => {
    const { currentItemId, items, data } = get();
    
    if (!currentItemId) return;
    
    const item = items.find((item: KeyValueItem) => item.id === currentItemId);
    if (!item) return;
    
    // Update the item value and data
    const newItems = items.map((i: KeyValueItem) => 
      i.id === currentItemId ? { ...i, value } : i
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
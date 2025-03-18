// Type definitions for Kaira extension
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
export interface JsonBuilderStore {
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

// Interface for the UI state store
export interface UIState {
  livePreviewInfo: LivePreviewInfo | null;
  showLivePreview: boolean;
  setLivePreviewInfo: (info: LivePreviewInfo | null) => void;
  setShowLivePreview: (show: boolean) => void;
}

// Type for selectors used in data collection
export type Selector = {
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
}; 
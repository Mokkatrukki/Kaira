// JSON Builder State Management for Kaira Chrome extension

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
  text: string | null;
}

// Interface for key-value item
export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
}

// Interface for state change listeners
export type StateChangeListener = () => void;

/**
 * Simple State Pattern implementation for JSON Builder
 * Manages the state of the JSON builder, including key-value items,
 * selection mode, and data structure.
 */
export class JsonBuilderState {
  // JSON data
  private _data: Record<string, string> = {};
  // Key-value items for UI
  private _items: KeyValueItem[] = [];
  // Selection mode state
  private _isSelectionActive: boolean = false;
  private _isScrollingMode: boolean = false;
  // Current item being edited
  private _currentItemId: string | null = null;
  // Counter for generating unique IDs
  private _counter: number = 0;
  // Listeners for state changes
  private _listeners: StateChangeListener[] = [];

  /**
   * Get the current JSON data
   * @returns A copy of the current JSON data
   */
  get data(): Record<string, string> {
    return { ...this._data };
  }

  /**
   * Get the current key-value items
   * @returns A copy of the current key-value items
   */
  get items(): KeyValueItem[] {
    return [...this._items];
  }

  /**
   * Check if selection mode is active
   * @returns True if selection mode is active
   */
  get isSelectionActive(): boolean {
    return this._isSelectionActive;
  }

  /**
   * Check if scrolling mode is active
   * @returns True if scrolling mode is active
   */
  get isScrollingMode(): boolean {
    return this._isScrollingMode;
  }

  /**
   * Get the ID of the current item being edited
   * @returns The ID of the current item, or null if no item is being edited
   */
  get currentItemId(): string | null {
    return this._currentItemId;
  }

  /**
   * Get the key of the current item being edited
   * @returns The key of the current item, or an empty string if no item is being edited
   */
  get currentKey(): string {
    if (!this._currentItemId) return '';
    const item = this._items.find(item => item.id === this._currentItemId);
    return item ? item.key : '';
  }

  /**
   * Add a new key-value item
   * @returns The ID of the new item
   */
  addItem(): string {
    const id = `key-value-${this._counter++}`;
    this._items.push({ id, key: '', value: '' });
    this._notifyListeners();
    return id;
  }

  /**
   * Remove a key-value item
   * @param id The ID of the item to remove
   */
  removeItem(id: string): void {
    const item = this._items.find(item => item.id === id);
    if (item && item.key) {
      delete this._data[item.key];
    }
    this._items = this._items.filter(item => item.id !== id);
    this._notifyListeners();
  }

  /**
   * Update a key-value item's key
   * @param id The ID of the item to update
   * @param key The new key value
   */
  updateItemKey(id: string, key: string): void {
    const item = this._items.find(item => item.id === id);
    if (!item) return;

    // If the key changed and the old key exists in data, update it
    if (item.key && item.key !== key && this._data[item.key] !== undefined) {
      this._data[key] = this._data[item.key];
      delete this._data[item.key];
    }

    item.key = key;
    this._notifyListeners();
  }

  /**
   * Start selection mode for a specific item
   * @param itemId The ID of the item to select
   * @returns True if selection mode was started successfully
   */
  startSelection(itemId: string): boolean {
    const item = this._items.find(item => item.id === itemId);
    if (!item) return false;
    
    if (!item.key.trim()) {
      return false; // Key is required
    }

    this._currentItemId = itemId;
    this._isSelectionActive = true;
    this._isScrollingMode = false;
    this._notifyListeners();
    return true;
  }

  /**
   * Set scrolling mode state
   * @param isActive Whether scrolling mode should be active
   */
  setScrollingMode(isActive: boolean): void {
    this._isScrollingMode = isActive;
    this._notifyListeners();
  }

  /**
   * Add selected element value to the current item
   * @param value The value to add
   */
  addSelectedValue(value: string): void {
    if (!this._currentItemId) return;

    const item = this._items.find(item => item.id === this._currentItemId);
    if (!item) return;

    // Update the item value
    item.value = value;
    
    // Update the data
    if (item.key) {
      this._data[item.key] = value;
    }

    // Reset selection state
    this._isSelectionActive = false;
    this._isScrollingMode = false;
    this._currentItemId = null;
    
    this._notifyListeners();
  }

  /**
   * Reset selection state
   */
  resetSelection(): void {
    this._isSelectionActive = false;
    this._isScrollingMode = false;
    this._currentItemId = null;
    this._notifyListeners();
  }

  /**
   * Clear all data and items
   */
  clear(): void {
    this._data = {};
    this._items = [];
    this._isSelectionActive = false;
    this._isScrollingMode = false;
    this._currentItemId = null;
    this._notifyListeners();
  }

  /**
   * Add a state change listener
   * @param listener The listener function to add
   * @returns A function to remove the listener
   */
  subscribe(listener: StateChangeListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  private _notifyListeners(): void {
    this._listeners.forEach(listener => listener());
  }
}

// Create and export a singleton instance
export const jsonBuilderState = new JsonBuilderState(); 
# Kaira Chrome Extension

A Chrome extension for building JSON objects by selecting elements from web pages.

## Architecture Overview

Kaira is built as a Chrome extension with a React-based UI and Zustand for state management. The extension allows users to create JSON objects by selecting elements from web pages and extracting their text content.

## Evolution of the Architecture

The project has evolved from a vanilla JavaScript/TypeScript implementation to a modern React-based architecture:

### Initial Implementation
- Used vanilla TypeScript with a class-based state management approach
- Implemented the Simple State Pattern with a `JsonBuilderState` class
- Managed DOM updates manually

### Current Implementation
- React-based UI components for better maintainability and composability
- Zustand for state management, providing a simpler and more flexible approach
- Clear separation of concerns between UI components and state management
- Improved developer experience with React's declarative paradigm

This migration has resulted in more maintainable code, better separation of concerns, and a more modern development experience.

## Project Structure

```
src/
├── background/          # Background script for the extension
│   └── background.ts    # Handles extension lifecycle and messaging
├── content/             # Content scripts injected into web pages
│   └── elementSelector.ts # Handles element selection in web pages
├── sidepanel/          # Side panel UI (main feature)
│   ├── components/     # React components
│   │   ├── JsonBuilder.tsx    # Main JSON builder component
│   │   ├── KeyValueItem.tsx   # Component for key-value pairs
│   │   └── LivePreview.tsx    # Component for live preview of selected elements
│   ├── App.tsx         # Main React app component
│   ├── elementSelection.ts # Utility for element selection
│   ├── index.tsx       # React entry point
│   ├── sidepanel.html  # HTML container for React app
│   ├── store.ts        # Zustand store for state management
│   └── styles.css      # Styles for the side panel
└── manifest.json       # Extension manifest
```

## State Management with Zustand

The application uses Zustand for state management, which provides a simple and lightweight approach to managing state in React applications.

### Store Structure

The application has two main stores:

1. **JSON Builder Store** (`useJsonBuilderStore`):
   - Manages the state of the JSON builder
   - Handles key-value pairs and their operations
   - Manages selection state for element picking

2. **UI Store** (`useStore`):
   - Manages UI-related state
   - Handles live preview information

### Key State Elements

```typescript
// JSON Builder Store
interface JsonBuilderStore {
  // Data
  data: Record<string, string>;  // The actual JSON data
  items: KeyValueItem[];         // UI items for key-value pairs
  
  // Selection state
  isSelectionActive: boolean;    // Whether selection mode is active
  isScrollingMode: boolean;      // Whether scrolling mode is active
  currentItemId: string | null;  // ID of the item being edited
  
  // Counter for generating unique IDs
  counter: number;
  
  // Actions (functions to modify state)
  addItem: () => string;
  removeItem: (id: string) => void;
  updateItemKey: (id: string, key: string) => void;
  startSelection: (itemId: string) => boolean;
  setScrollingMode: (isActive: boolean) => void;
  addSelectedValue: (value: string) => void;
  resetSelection: () => void;
  clear: () => void;
}

// UI Store
interface State {
  livePreviewInfo: LivePreviewInfo | null;  // Info about highlighted element
  showLivePreview: boolean;                 // Whether to show live preview
  setLivePreviewInfo: (info: LivePreviewInfo | null) => void;
  setShowLivePreview: (show: boolean) => void;
}
```

### Comparison with Previous State Management

The previous implementation used a class-based approach with the Simple State Pattern:

```typescript
// Old approach (JsonBuilderState class)
export class JsonBuilderState {
  private _data: Record<string, string> = {};
  private _items: KeyValueItem[] = [];
  private _isSelectionActive: boolean = false;
  // ...other private state

  // Getters and methods to update state
  get data(): Record<string, string> { /* ... */ }
  addItem(): string { /* ... */ }
  removeItem(id: string): void { /* ... */ }
  // ...other methods

  // Subscription system
  subscribe(listener: StateChangeListener): () => void { /* ... */ }
  private _notifyListeners(): void { /* ... */ }
}
```

Zustand provides several advantages over this approach:
- Less boilerplate code
- Built-in React integration with hooks
- Automatic re-rendering when state changes
- Easier state updates with immutable patterns
- Better TypeScript integration

## Component Architecture

### React Component Hierarchy

```
App
└── JsonBuilder
    ├── KeyValueItem (multiple)
    └── LivePreview
```

### Component Responsibilities

- **App**: Main container component that initializes the application
- **JsonBuilder**: Manages the list of key-value pairs and JSON output
- **KeyValueItem**: Handles individual key-value pairs with selection functionality
- **LivePreview**: Displays information about the currently highlighted element

## Element Selection Flow

1. User clicks "Select" on a key-value pair
2. `KeyValueItem` component calls `startSelection` from the store
3. `startElementSelection` utility sends a message to the background script
4. Background script activates the element selector in the content script
5. Content script highlights elements as the user hovers over them
6. Content script sends messages about highlighted elements
7. `setupElementSelectionListeners` receives these messages and updates the UI
8. When user clicks an element, its text is added to the selected key-value pair
9. Selection mode is deactivated and the JSON is updated

## Communication Flow

```
React UI <-> Zustand Store <-> Chrome Messaging API <-> Content Script <-> Web Page
```

1. **React UI to Zustand Store**: Components read from and update the Zustand store
2. **Zustand Store to Chrome Messaging**: Element selection utilities use the store and send messages via Chrome API
3. **Chrome Messaging to Content Script**: Background script relays messages to the content script
4. **Content Script to Web Page**: Content script interacts with the web page DOM

## Extension Behavior

When the user clicks the extension icon in the Chrome toolbar, the side panel opens automatically. This provides a streamlined user experience without the need for an intermediate popup.

## Building and Deployment

The project uses webpack for bundling:

- TypeScript files are compiled to JavaScript
- React components are bundled together
- CSS is processed and included
- Output files are placed in the `dist` directory
- The extension can be loaded into Chrome from the `dist` directory

## Key Technologies

- **React**: UI library for building the interface
- **Zustand**: State management library
- **TypeScript**: Type-safe JavaScript
- **Chrome Extension API**: For browser integration
- **Webpack**: For bundling the application

## Overview

Kaira is a Chrome extension that provides a simple web element selection tool, allowing users to easily identify, inspect, and extract information about elements on any webpage. It's designed to help developers, testers, and web scrapers by providing XPath expressions and text content for any element on a page.

## Features

- **Interactive Element Selection**: Click on any element on a webpage to select it
- **DOM Navigation**: Use scroll wheel to navigate up and down the DOM tree
- **Live Text Preview**: See the text content of elements in real-time while navigating the DOM tree
- **Element Information**: View essential information about selected elements:
  - Text content
  - XPath expression
- **Copy to Clipboard**: Easily copy XPath and text content for use in your code

## How It Works

Kaira consists of three main components:

1. **Side Panel**: The UI that displays element information and controls
2. **Content Script**: Injects into web pages to handle element selection and highlighting
3. **Background Script**: Manages communication between the side panel and content script

### Selection Process

1. Click "Select Element" in the side panel
2. Hover over elements on the page (elements are highlighted as you hover)
3. Click on an element to enter scrolling mode
4. Use the scroll wheel to navigate up (parent) or down (first child) in the DOM tree
5. View the live text preview in the side panel to find the exact element with the desired text
6. Click on the highlighted element to select it, or click elsewhere to return to hover mode
7. The selected element's information appears in the side panel

### Selection Modes

- **Hover Mode**: Move your cursor over elements to highlight them
- **Scrolling Mode**: After clicking an element, use the scroll wheel to navigate the DOM tree while seeing live text content

## Technical Implementation

### Architecture

- **Side Panel (sidepanel.ts)**: Manages the UI and user interactions in the extension's side panel
- **Element Selector (elementSelector.ts)**: Content script that handles element selection, highlighting, and DOM navigation
- **Background Script (background.ts)**: Coordinates communication between the side panel and content script

### Key Components

- **XPath Generation**: Builds XPath expressions to precisely identify elements
- **Highlight Overlay**: Visual feedback showing the currently selected element
- **Live Preview**: Shows the text content of the currently highlighted element in real-time

## Use Cases

- **Web Development**: Quickly find XPath for elements you need to manipulate
- **Test Automation**: Generate reliable XPath expressions for automated testing frameworks
- **Web Scraping**: Identify the correct XPath for extracting data from websites
- **Debugging**: Inspect elements and their text content directly on the page
- **Finding Hidden Text**: Discover elements with hidden or formatted text that might not be visible in the browser

## How to Use

1. Click the Kaira extension icon to open the side panel
2. Click "Select Element" to activate selection mode
3. Hover over elements on the page to highlight them
4. Click on an element to enter scrolling mode
5. Use the scroll wheel to navigate the DOM tree (up for parent, down for child)
6. Watch the live preview in the side panel to see the text content of each element as you navigate
7. Click on the highlighted element to select it
8. View the element's text content and XPath in the side panel
9. Copy the text or XPath using the provided buttons
10. Click "Cancel Selection" at any time to exit selection mode

### Why Live Text Preview?

The live text preview feature helps you find the exact element containing the text you're looking for. This is especially useful when:

- Text appears to be in one element but is actually split across multiple elements
- There's hidden text that isn't visible on the page (like "lähtöhinta 1500e" when you only want "1500e")
- Elements contain extra whitespace or formatting that affects the text
- You need to find the most specific element containing just the text you want

By showing you the actual text content of each element as you navigate the DOM tree, the live preview makes it much easier to select the precise element you need.

## Development

The extension is built using TypeScript and follows a modular architecture:

- **src/sidepanel/**: Contains the side panel UI and logic
- **src/content/**: Contains the content scripts for element selection
- **src/background/**: Contains the background script for communication

## Future Enhancements

- Multiple element selection
- Save and manage selectors
- Generate code snippets for popular frameworks
- Advanced filtering options

---

Kaira makes web element selection and inspection simple and efficient, providing developers and testers with the essential tools they need to work with web elements more effectively. 
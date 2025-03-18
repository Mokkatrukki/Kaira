# Kaira Chrome Extension

A Chrome extension for building JSON objects by selecting elements from web pages.

## What Kaira Does

Kaira helps you build JSON objects by selecting elements from web pages:

1. Open the extension's side panel
2. Add key-value pairs to your JSON
3. Select elements from the webpage to extract their text as values
4. Export the resulting JSON for use in your projects
5. Collect data from multiple pages using the same selectors

Perfect for web scraping, test automation, and data extraction tasks.

## Components and Structure

### Core Components

- **Side Panel UI**: React-based interface for building JSON objects
  - `JsonBuilder`: Main component for managing key-value pairs
  - `KeyValueItem`: Individual key-value pair with selection functionality
  - `LivePreview`: Shows real-time information about selected elements

- **Element Selection**: System for selecting elements on web pages
  - Content script for highlighting and selecting elements
  - DOM navigation with scroll wheel (parent/child traversal)
  - Live text preview of highlighted elements

- **State Management**: Zustand stores for managing application state
  - `useJsonBuilderStore`: Manages JSON data and selection state
  - `useStore`: Manages UI-related state like live preview
  - Modular architecture with separate concerns:
    - Types and interfaces in `types.ts`
    - Helper functions in `utils.ts`
    - JSON building logic in `jsonBuilderStore.ts`
    - UI state in `uiStore.ts`

- **Data Collection**: System for collecting data from multiple pages
  - Selectors-based element finding
  - Collection of items with metadata (URL, timestamp)
  - Export of collected data as JSON

### Project Structure

```
src/
├── background/          # Background script for extension lifecycle
├── content/             # Content scripts for element selection
├── sidepanel/           # Side panel UI components
│   ├── components/      # React components
│   ├── elementSelection.ts  # Element selection utilities
│   ├── store.ts         # Zustand state management (re-exports from store/)
│   ├── store/           # Modular store implementation
│   │   ├── types.ts     # Type definitions
│   │   ├── utils.ts     # Helper functions
│   │   ├── jsonBuilderStore.ts  # Main data store
│   │   ├── uiStore.ts   # UI state store
│   │   └── index.ts     # Exports for all store modules
│   └── ...              # Other UI files
└── manifest.json        # Extension configuration
```

## How to Use Kaira

1. **Install the Extension**
   - Load the extension in Chrome from the `dist` directory

2. **Build Your JSON**
   - Click the Kaira icon to open the side panel
   - Click "Add Item" to create a new key-value pair
   - Enter a key name
   - Click "Select" to activate element selection
   - Hover over elements on the page and click to select
   - Use the scroll wheel to navigate the DOM tree if needed
   - The selected element's text is added as the value
   - Repeat to build your complete JSON object

3. **Export Your JSON**
   - Copy the JSON output displayed at the bottom of the panel
   - You can copy either the Values JSON or the Selectors JSON

4. **Collect Data from Multiple Pages**
   - After selecting elements and building your selectors
   - Click "Collect Items" to extract data from the current page
   - Navigate to another page with similar structure
   - Click "Collect Items" again to add more data to your collection
   - The collection includes URL and timestamp for each item
   - Copy the Collection JSON when you're done

5. **Working with List Items**
   - Click "Add List Item" to create a list-based selector
   - Enter a key name for your list
   - Click "Select Root" to choose the container element (like a UL or DIV)
   - After selecting a root container, click "Select Item" to choose list elements
   - When selecting an item, the extension will find all similar elements with the same structure
   - The highlighted elements show you what will be included in your collection
   - All matching elements will be extracted as an array in your JSON
   - This is perfect for repeating elements like products, search results, or navigation items

## Development Principles

### Keep It Simple

- Focus on the core functionality: selecting elements and building JSON
- Avoid feature creep and unnecessary complexity
- Each component should have a single responsibility

### Use the Store

- Keep state in Zustand stores, not in component state
- Component state should only be used for UI-specific concerns
- Actions that modify state should be defined in the store

### Do Small Things Well

- Write small, focused components
- Each function should do one thing and do it well
- Make incremental changes and test frequently

### Code Organization

- Keep related code together
- Use clear naming conventions
- Document complex logic with comments
- Split large files into modular components:
  - The store implementation is modularized for better maintainability
  - Each module has a single responsibility
  - Types, utilities, and state logic are separated

## For AI Assistance

This section provides key information to help AI tools understand and work with this codebase.

### Key Data Structures

```typescript
// KeyValueItem type used throughout the application
interface KeyValueItem {
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

// LivePreviewInfo for displaying element information
interface LivePreviewInfo {
  tagName: string;
  text: string;
  xpath: string;
  fullXPath?: string;
  relativeXPath?: string;
  matchingCount?: number;
}

// CollectedItem for storing collected data
interface CollectedItem {
  url: string;
  timestamp: string;
  data: Record<string, string | string[]>;
}
```

### List Item Selection Technical Details

The list item selection feature uses a sophisticated approach to identify and collect repeating elements:

1. **Root Element Selection**:
   - User selects a container element (like a UL or DIV)
   - We store its full XPath as `rootFullXPath`
   - This element serves as the context for finding list items

2. **Relative XPath Generation**:
   - When selecting a child element, we compute its path relative to the root
   - We strip numeric indices from the path (e.g., `li[3]/div[1]/h3[1]` → `li/div/h3`)
   - This generic path can match multiple similar elements regardless of position

3. **Element Matching**:
   - The system looks for all elements matching the generic path
   - It highlights matching elements in real-time as the user hovers
   - If direct matching fails, it attempts a more flexible approach:
     - Find elements with the same tag name
     - Verify parent structure matches the expected hierarchy
     - Include elements that follow the same pattern

4. **Smart Selection Behavior**:
   - If hovering over an element with no matches, we check parent elements
   - The system aims to find the most appropriate selector level with multiple matches
   - Users can navigate the DOM tree with the scroll wheel to refine selection

5. **List Item Collection**:
   - When "Collect Items" is clicked, the system:
     - Finds the root element using its full XPath
     - Locates all children matching the relative XPath pattern
     - Extracts text content from each matching element
     - Returns an array of values in the collection

6. **Selector JSON Format**:
   ```json
   {
     "products": {
       "type": "list",
       "rootElement": {
         "fullXPath": "/html/body/div/main/div/ul",
         "xpath": "",
         "cssSelector": ""
       },
       "itemSelector": {
         "relativeXPath": "li/div/h3"
       }
     }
   }
   ```

7. **Results JSON Format**:
   ```json
   {
     "products": [
       "Product 1",
       "Product 2",
       "Product 3"
     ]
   }
   ```

This approach makes it possible to scrape lists of elements with a single selection action, greatly improving efficiency for data collection tasks.

### Message Protocol

The extension uses Chrome's messaging API with the following message formats:

```typescript
// From side panel to background script
{ action: 'startElementSelection' }
{ action: 'startListItemSelection', rootXPath: string }

// From background to content script
{ action: 'activateSelectionMode' }
{ action: 'activateListItemSelectionMode', rootXPath: string }
{ action: 'deactivateSelectionMode' }

// From content script to side panel
{ 
  action: 'elementHighlighted', 
  data: { 
    tagName: string, 
    text: string, 
    xpath: string,
    fullXPath?: string,
    relativeXPath?: string,
    matchingCount?: number 
  } 
}

{ 
  action: 'elementSelected', 
  data: { 
    text: string, 
    xpath: string, 
    cssSelector: string,
    fullXPath?: string,
    isListItem?: boolean,
    relativeXPath?: string,
    matchingValues?: string[],
    matchingCount?: number
  } 
}

{ 
  action: 'scrollingModeActive', 
  data: boolean 
}
```

### Common Workflows

1. **Element Selection Flow**:
   - User clicks "Select" → `KeyValueItem.handleSelectClick()` → `startElementSelection()`
   - Background script receives message → sends to content script
   - Content script activates selection mode → user selects element
   - Selection data sent back → `setupElementSelectionListeners()` processes → updates store

2. **List Item Selection Flow**:
   - User adds a list item → clicks "Select Root" → `startElementSelection()`
   - Root element selected → stored as `rootFullXPath` → root highlighted
   - User clicks "Select Item" → `startListItemSelection(rootFullXPath)`
   - Content script finds root element and activates list item mode
   - As user hovers, matching elements are highlighted in real-time
   - When user clicks, all matching elements' values are collected
   - Data stored as an array under the list item's key

3. **Data Collection Flow**:
   - User clicks "Collect Items" → `handleCollectItems()` → `collectItems()`
   - Store creates selectors object from items
   - Script executed in page context to find elements using selectors
   - For list items, all matches for relativeXPath under root are collected
   - Results added to collection with URL and timestamp
   - Collection JSON updated to show collected items

### Debugging Tips

- Check Chrome extension logs in the background page console
- Verify message passing between components using `console.log`
- Common issues include selection state not resetting properly
- Use React DevTools to inspect component state

## Building and Development

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the dist directory
```

## Technologies

- React for UI components
- Zustand for state management
- TypeScript for type safety
- Chrome Extension API for browser integration 
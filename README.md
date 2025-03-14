# Kaira - Web Element Selector Chrome Extension

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
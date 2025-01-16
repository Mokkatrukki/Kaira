# Plan for the Core Features of the Extension Toolbox

Here’s a structured approach to building a proof-of-concept version of your extension with the selected core features:

## 1. Core Functionality

### 1.1 Element Selection

- Implement a click-to-select functionality:
  - Allow the user to click on any element on a webpage to capture its details.
  - Highlight the element on hover to ensure clarity about what is being selected.
  - Add a small overlay (tooltip or badge) near the selected element to confirm the selection.

### 1.2 Path Options

- Provide multiple path formats:
  - Generate absolute XPath, relative XPath, and CSS selectors for each selected element.
  - Include a UI section in the sidebar to display these paths in separate fields for comparison.

### 1.3 Data Preview

- Display a preview of the selected data:
  - Show text content and key attribute values (e.g., id, class, src, href).
  - Allow toggling between different data types (e.g., innerHTML vs. textContent).

### 1.4 Data Storage

- Store the selected paths and associated data temporarily:
  - Use the extension’s local storage to keep the data while the user remains on the page.
  - Display the stored data in the sidebar, organized by selections.

## 2. Additional Features

### 2.1 Scraping Preview

- Add a "Test Path" button:
  - Clicking this button will highlight all elements on the page that match the selected path.
  - Useful for verifying whether the path will scrape the intended elements.

### 2.2 Handling Dynamic Content

- Detect and wait for dynamic elements:
  - Use MutationObserver or a similar technique to monitor changes in the DOM and allow selection once elements are fully loaded.

## 3. User Interface

### UI Layout

- Use a sidebar panel for displaying options, data, and paths.
- Divide the sidebar into three main sections:
  - **Selection Details**: Show the highlighted element’s details, including its paths and data preview.
  - **Stored Data**: List all selected elements and their stored data.
  - **Actions**: Provide buttons for testing paths or clearing stored data.

## 4. Workflow and Flow

1. User opens the sidebar panel.
2. User clicks an element on the webpage:
   - The element gets highlighted, and its paths are generated.
3. Data preview appears in the sidebar:
   - Shows text content and attributes of the element.
4. User can optionally test the path to highlight all matching elements.
5. Selected data is stored temporarily in the sidebar for later review or use.

## Technical Components

- **HTML & CSS** for the sidebar UI.
- **JavaScript** for:
  - DOM manipulation (element selection and path generation).
  - Path testing (highlight matching elements).
  - Dynamic content handling with MutationObserver.
  - Data storage and retrieval within the extension’s local storage.
- **Manifest.json** for defining the extension’s structure and permissions:
  - Request `activeTab` and `storage` permissions.

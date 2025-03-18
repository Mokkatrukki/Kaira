// Utility functions for the Kaira extension

/**
 * Extracts a relative XPath from a full XPath, relative to a root XPath
 * This is used for list item selection to create generic selectors
 */
export function getRelativeXPathFromFullXPath(fullXPath: string, rootXPath?: string): string {
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

/**
 * Highlights a root element on the page
 * Used to show which element is selected as a list container
 */
export async function highlightRootElement(fullXPath: string): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0].id) {
      console.error('No active tab found');
      return;
    }
    
    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
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
}

/**
 * Removes highlight from a root element
 * Used when cleaning up or removing list items
 */
export async function removeRootElementHighlight(fullXPath: string): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0].id) {
      console.error('No active tab found');
      return;
    }
    
    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
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
      args: [fullXPath]
    });
  } catch (error) {
    console.error('Error executing script for removing highlight:', error);
  }
} 
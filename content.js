if (window.hasRun === true) {
    console.log('Content script already loaded');
} else {
    window.hasRun = true;
    let selectionEnabled = false;
    let clickedElements = new Set();
    console.log('Content script loaded');

    const RETRY_DELAY = 1000; // 1 second delay
    const MAX_RETRIES = 5;    // Maximum number of retries

    // Add sleep helper function
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Updated restore function with retry mechanism
    async function restoreClickedElements(retryCount = 0) {
        try {
            const data = await chrome.storage.local.get(window.location.href);
            console.log('Restored data:', data);
            const storedSelectors = data[window.location.href] || [];
            
            let foundElements = 0;
            // Filter out empty or invalid selectors
            storedSelectors
                .filter(selector => selector && selector.trim())
                .forEach(selector => {
                    try {
                        const element = document.querySelector(selector);
                        if (element) {
                            clickedElements.add(element);
                            highlightElement(element, 'red', '3px');
                            foundElements++;
                        }
                    } catch (err) {
                        console.warn('Invalid selector:', selector, err);
                    }
                });

            // If we haven't found all elements and have retries left, try again
            if (foundElements < storedSelectors.length && retryCount < MAX_RETRIES) {
                console.log(`Found ${foundElements}/${storedSelectors.length} elements, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
                await sleep(RETRY_DELAY);
                await restoreClickedElements(retryCount + 1);
            }
        } catch (err) {
            console.error('Error restoring elements:', err);
        }
    }

    // Initialize by restoring clicked elements
    restoreClickedElements();

    // Update to handle async responses
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Message received:', message);
        if (message.action === 'toggleSelection') {
            selectionEnabled = message.enabled;
            console.log('Selection enabled:', selectionEnabled);
        } else if (message.action === 'clearSelection') {
            clearAllSelections();
        }
        sendResponse({ success: true });
        return true;  // Required for async response
    });

    function highlightElement(element, color, width = '2px') {
        element.style.border = `${width} solid ${color}`;
    }

    function removeHighlight(element) {
        element.style.border = '';
    }

    function getElementXPath(element) {
        if (element && element.nodeType === 1) {
            const idx = Array.from(element.parentNode.children)
                .filter(child => child.tagName === element.tagName)
                .indexOf(element) + 1;
            const path = getElementXPath(element.parentNode);
            return `${path}/${element.tagName.toLowerCase()}[${idx}]`;
        }
        return '';
    }

    function getElementCSSSelector(element) {
        if (element.tagName.toLowerCase() === 'html') return 'html';
        let path = [];
        while (element.parentElement) {
            let selector = element.tagName.toLowerCase();
            if (element.id) {
                selector += `#${element.id}`;
                path.unshift(selector);
                break;
            } else {
                let sibling = element;
                let nth = 1;
                while (sibling = sibling.previousElementSibling) {
                    if (sibling.tagName.toLowerCase() === selector) nth++;
                }
                if (nth !== 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    function getElementContent(element) {
        return element.textContent?.trim() || element.value || '';
    }

    let uniqueIdCounter = 0;

    function assignUniqueId(element) {
        if (!element.dataset.uniqueId) {
            element.dataset.uniqueId = `unique-id-${uniqueIdCounter++}`;
        }
        return element.dataset.uniqueId;
    }

    document.addEventListener('mouseover', function(event) {
        if (selectionEnabled && event.target.tagName) {
            console.log('Mouseover element:', event.target);
            if (!clickedElements.has(event.target)) {
                highlightElement(event.target, 'grey');
            }
        }
    });

    document.addEventListener('mouseout', function(event) {
        if (selectionEnabled && event.target.tagName) {
            console.log('Mouseout element:', event.target);
            if (!clickedElements.has(event.target)) {
                removeHighlight(event.target);
            }
        }
    });

    document.addEventListener('click', async function(event) {
        if (selectionEnabled && event.target.tagName) {
            event.preventDefault();
            if (clickedElements.has(event.target)) {
                clickedElements.delete(event.target);
                removeHighlight(event.target);
                await updateStorage();
            } else {
                clickedElements.add(event.target);
                highlightElement(event.target, 'red', '3px');
                const uniqueId = assignUniqueId(event.target);
                const elementData = {
                    action: 'elementSelected',
                    element: {
                        tagName: event.target.tagName,
                        id: event.target.id,
                        className: event.target.className,
                        uniqueId: uniqueId,
                        xpath: getElementXPath(event.target),
                        cssSelector: getElementCSSSelector(event.target),
                        content: getElementContent(event.target),
                        url: window.location.href
                    }
                };
                await updateStorage();
                console.log('Selected element data:', JSON.stringify(elementData, null, 2));
                chrome.runtime.sendMessage(elementData);
            }
        }
    });

    // Add new function to update storage
    async function updateStorage() {
        try {
            const selectors = Array.from(clickedElements)
                .map(el => getElementCSSSelector(el))
                .filter(selector => selector && selector.trim()); // Filter out empty selectors
            
            if (selectors.length > 0) {
                console.log('Saving selectors:', selectors);
                await chrome.storage.local.set({ [window.location.href]: selectors });
                // Verify storage
                const saved = await chrome.storage.local.get(window.location.href);
                console.log('Verified saved data:', saved);
            }
        } catch (err) {
            console.error('Error updating storage:', err);
        }
    }

    // Add new function to handle clearing
    async function clearAllSelections() {
        try {
            await chrome.storage.local.remove(window.location.href);
            clickedElements.forEach(element => removeHighlight(element));
            clickedElements.clear();
        } catch (err) {
            console.error('Error clearing selections:', err);
        }
    }
}
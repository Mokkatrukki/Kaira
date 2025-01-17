if (window.hasRun === true) {
    console.log('Content script already loaded');
} else {
    window.hasRun = true;

    // Storage management functions
    const StorageManager = {
        async saveElements(element) {
            try {
                const origin = new URL(element.url).origin;
                const currentData = await chrome.storage.local.get(origin) || {};
                
                if (!currentData[origin]) {
                    currentData[origin] = { templates: {} };
                }

                if (!currentData[origin].templates[element.url]) {
                    currentData[origin].templates[element.url] = [];
                }

                currentData[origin].templates[element.url].push({
                    type: element.type,
                    content: element.content,
                    xpath: element.xpath,
                    cssSelector: element.cssSelector,
                    timestamp: new Date().toISOString()
                });

                await chrome.storage.local.set({ [origin]: currentData[origin] });
                console.log('Saved element for origin:', origin);
            } catch (err) {
                console.error('Error saving elements:', err);
            }
        },

        async getElementsByOrigin(origin) {
            try {
                const data = await chrome.storage.local.get(origin);
                return data[origin] || { templates: {} };
            } catch (err) {
                console.error('Error getting elements:', err);
                return { templates: {} };
            }
        },

        async clearElements(url) {
            try {
                const origin = new URL(url).origin;
                const data = await this.getElementsByOrigin(origin);
                if (data.templates[url]) {
                    delete data.templates[url];
                    await chrome.storage.local.set({ [origin]: data });
                }
            } catch (err) {
                console.error('Error clearing elements:', err);
            }
        }
    };

    let selectionEnabled = false;
    let clickedElements = new Set();
    let isPopupOpen = false;  // Add this flag
    console.log('Content script loaded');

    const RETRY_DELAY = 1000; // 1 second delay
    const MAX_RETRIES = 5;    // Maximum number of retries

    // Add sleep helper function
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Updated restore function with retry mechanism
    async function restoreClickedElements(retryCount = 0) {
        try {
            const data = await StorageManager.getElementsByOrigin(window.location.origin);
            const templates = data?.templates?.[window.location.href] || [];
            
            let foundElements = 0;
            templates.forEach(template => {
                try {
                    const element = document.querySelector(template.cssSelector);
                    if (element) {
                        clickedElements.add(element);
                        highlightElement(element, 'red', '3px');
                        foundElements++;
                    }
                } catch (err) {
                    console.warn('Invalid selector:', template.cssSelector, err);
                }
            });

            // If we haven't found all elements and have retries left, try again
            if (foundElements < templates.length && retryCount < MAX_RETRIES) {
                console.log(`Found ${foundElements}/${templates.length} elements, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
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
        } else if (message.action === 'changeElementType') {
            handleElementTypeChange(message.cssSelector, message.newType);
        }
        sendResponse({ success: true });
        return true;  // Required for async response
    });

    async function handleElementTypeChange(cssSelector, newType) {
        try {
            const element = document.querySelector(cssSelector);
            if (element) {
                const uniqueId = element.dataset.uniqueId;
                const data = await StorageManager.getElementsByOrigin(window.location.origin);
                
                // Update the type in storage
                if (data.templates[window.location.href]) {
                    data.templates[window.location.href].forEach(entry => {
                        if (entry.cssSelector === cssSelector) {
                            entry.type = newType;
                        }
                    });
                    await chrome.storage.local.set({ [window.location.origin]: data });
                }
            }
        } catch (err) {
            console.error('Error changing element type:', err);
        }
    }

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
        if (selectionEnabled && !isPopupOpen && event.target.tagName) {  // Add popup check
            console.log('Mouseover element:', event.target);
            if (!clickedElements.has(event.target)) {
                highlightElement(event.target, 'grey');
            }
        }
    });

    document.addEventListener('mouseout', function(event) {
        if (selectionEnabled && !isPopupOpen && event.target.tagName) {  // Add popup check
            console.log('Mouseout element:', event.target);
            if (!clickedElements.has(event.target)) {
                removeHighlight(event.target);
            }
        }
    });

    document.addEventListener('click', async function(event) {
        if (selectionEnabled && !isPopupOpen && event.target.tagName) {  // Add popup check
            event.preventDefault();
            if (clickedElements.has(event.target)) {
                clickedElements.delete(event.target);
                removeHighlight(event.target);
                await updateStorage();
            } else {
                // Show element type selection popup
                const type = await showTypeSelectionPopup(event);
                if (!type) return; // User cancelled

                clickedElements.add(event.target);
                highlightElement(event.target, 'red', '3px');
                const uniqueId = assignUniqueId(event.target);
                const elementData = {
                    action: 'elementSelected',
                    element: {
                        type: type, // 'title', 'price', or 'other'
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
                
                await StorageManager.saveElements(elementData.element);
                console.log('Selected element data:', JSON.stringify(elementData, null, 2));
                chrome.runtime.sendMessage(elementData);
            }
        }
    });

    function showTypeSelectionPopup(event) {
        return new Promise((resolve) => {
            isPopupOpen = true;  // Set flag when opening popup
            const popup = document.createElement('div');
            popup.style.cssText = `
                position: fixed;
                left: ${event.clientX}px;
                top: ${event.clientY}px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 8px;
                z-index: 10000;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                min-width: 120px;
            `;

            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                right: 4px;
                top: 4px;
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 0 4px;
                color: #666;
            `;
            closeBtn.onclick = () => {
                document.body.removeChild(popup);
                document.removeEventListener('click', closeHandler);
                document.removeEventListener('keydown', handleEsc);
                isPopupOpen = false;  // Reset flag when closing
                resolve(null);
            };
            popup.appendChild(closeBtn);

            const options = ['title', 'price', 'other'];
            options.forEach(type => {
                const button = document.createElement('button');
                button.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                button.style.cssText = `
                    display: block;
                    width: 100%;
                    margin: 4px 0;
                    padding: 4px 8px;
                    border: none;
                    background: #f0f0f0;
                    cursor: pointer;
                    border-radius: 3px;
                `;
                button.onmouseover = () => {
                    button.style.background = '#e0e0e0';
                };
                button.onmouseout = () => {
                    button.style.background = '#f0f0f0';
                };
                button.onclick = () => {
                    if (popup.parentNode) {
                        popup.parentNode.removeChild(popup);
                    }
                    isPopupOpen = false;
                    resolve(type);
                };
                popup.appendChild(button);
            });

            document.body.appendChild(popup);

            // Handle ESC key
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    if (popup.parentNode) {
                        popup.parentNode.removeChild(popup);
                    }
                    document.removeEventListener('keydown', handleEsc);
                    isPopupOpen = false;  // Reset flag when closing
                    resolve(null);
                }
            };
            document.addEventListener('keydown', handleEsc);

            // Close popup if clicking outside
            const closeHandler = (e) => {
                if (!popup.contains(e.target)) {
                    if (popup.parentNode) {
                        popup.parentNode.removeChild(popup);
                    }
                    document.removeEventListener('click', closeHandler);
                    document.removeEventListener('keydown', handleEsc);
                    isPopupOpen = false;  // Reset flag when closing
                    resolve(null);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 0);
        });
    }

    // Update updateStorage function to use new storage format
    async function updateStorage() {
        const elements = Array.from(clickedElements).map(el => ({
            type: el.dataset.elementType || 'other',
            content: getElementContent(el),
            xpath: getElementXPath(el),
            cssSelector: getElementCSSSelector(el),
            url: window.location.href
        }));

        for (const element of elements) {
            await StorageManager.saveElements(element);
        }
    }

    // Add new function to handle clearing
    async function clearAllSelections() {
        try {
            await StorageManager.clearElements(window.location.href);
            clickedElements.forEach(element => removeHighlight(element));
            clickedElements.clear();
        } catch (err) {
            console.error('Error clearing selections:', err);
        }
    }
}
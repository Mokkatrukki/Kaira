(function() {
    /**
     * Content Script for Kaira Extension
     * Handles element selection, highlighting, and storage management
     * @module ContentScript
     */

    // Prevent multiple script loads
    if (window.hasRun === true) {
        console.log('Content script already loaded');
        return;
    }
    window.hasRun = true;

    /**
     * Configuration constants
     * @const {Object}
     */
    const CONFIG = {
        RETRY_DELAY: 1000,
        MAX_RETRIES: 5,
        HIGHLIGHT_COLORS: {
            SELECTED: 'red',
            HOVER: 'grey'
        }
    };

    /**
     * Manages all storage operations for selected elements
     * @typedef {Object} StorageManager
     */
    const StorageManager = {
        /**
         * Saves element data to chrome storage
         * @param {Object} element - Element data to save
         * @param {string} element.url - URL where element was selected
         * @param {string} element.type - Element type (title/price/other)
         * @param {string} element.content - Element text content
         * @param {string} element.xpath - Element XPath
         * @param {string} element.cssSelector - Element CSS selector
         * @returns {Promise<void>}
         */
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

        /**
         * Retrieves elements for a specific origin
         * @param {string} origin - URL origin to fetch elements for
         * @returns {Promise<Object>} Object containing templates
         */
        async getElementsByOrigin(origin) {
            try {
                const data = await chrome.storage.local.get(origin);
                return data[origin] || { templates: {} };
            } catch (err) {
                console.error('Error getting elements:', err);
                return { templates: {} };
            }
        },

        /**
         * Clears all elements for a specific URL
         * @param {string} url - URL to clear elements for
         * @returns {Promise<void>}
         */
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

    /**
     * Handles DOM element selection and manipulation
     * @typedef {Object} ElementManager
     */
    const ElementManager = {
        clickedElements: new Set(),
        selectionEnabled: false,
        isPopupOpen: false,
        uniqueIdCounter: 0,

        /**
         * Highlights an element with a colored border
         * @param {HTMLElement} element - Element to highlight
         * @param {string} color - Border color
         * @param {string} [width='2px'] - Border width
         */
        highlightElement(element, color, width = '2px') {
            element.style.border = `${width} solid ${color}`;
        },

        /**
         * Removes highlight from an element
         * @param {HTMLElement} element - Element to remove highlight from
         */
        removeHighlight(element) {
            element.style.border = '';
        },

        /**
         * Generates a unique ID for an element
         * @param {HTMLElement} element - Element to assign ID to
         * @returns {string} Unique identifier
         */
        assignUniqueId(element) {
            if (!element.dataset.uniqueId) {
                element.dataset.uniqueId = `unique-id-${this.uniqueIdCounter++}`;
            }
            return element.dataset.uniqueId;
        }
    };

    /**
     * Handles element selection type popup
     * @typedef {Object} PopupManager
     */
    const PopupManager = {
        /**
         * Shows popup for selecting element type
         * @param {MouseEvent} event - Click event
         * @returns {Promise<string|null>} Selected type or null if cancelled
         */
        showTypeSelectionPopup(event) {
            return new Promise((resolve) => {
                ElementManager.isPopupOpen = true;  // Set flag when opening popup
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
                    ElementManager.isPopupOpen = false;  // Reset flag when closing
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
                        ElementManager.isPopupOpen = false;
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
                        ElementManager.isPopupOpen = false;  // Reset flag when closing
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
                        ElementManager.isPopupOpen = false;  // Reset flag when closing
                        resolve(null);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeHandler), 0);
            });
        }
    };

    /**
     * Utility functions for element information
     * @typedef {Object} ElementUtils
     */
    const ElementUtils = {
        /**
         * Gets XPath for an element
         * @param {HTMLElement} element - Element to get XPath for
         * @returns {string} XPath string
         */
        getElementXPath(element) {
            if (element && element.nodeType === 1) {
                const idx = Array.from(element.parentNode.children)
                    .filter(child => child.tagName === element.tagName)
                    .indexOf(element) + 1;
                const path = this.getElementXPath(element.parentNode);
                return `${path}/${element.tagName.toLowerCase()}[${idx}]`;
            }
            return '';
        },

        /**
         * Gets unique CSS selector for an element
         * @param {HTMLElement} element - Element to get selector for
         * @returns {string} CSS selector
         */
        getElementCSSSelector(element) {
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
        },

        /**
         * Gets text content from an element
         * @param {HTMLElement} element - Element to get content from
         * @returns {string} Element content
         */
        getElementContent(element) {
            return element.textContent?.trim() || element.value || '';
        }
    };

    // Event Listeners
    document.addEventListener('mouseover', (event) => {
        if (ElementManager.selectionEnabled && !ElementManager.isPopupOpen && event.target.tagName) {  // Add popup check
            console.log('Mouseover element:', event.target);
            if (!ElementManager.clickedElements.has(event.target)) {
                ElementManager.highlightElement(event.target, CONFIG.HIGHLIGHT_COLORS.HOVER);
            }
        }
    });

    document.addEventListener('mouseout', (event) => {
        if (ElementManager.selectionEnabled && !ElementManager.isPopupOpen && event.target.tagName) {  // Add popup check
            console.log('Mouseout element:', event.target);
            if (!ElementManager.clickedElements.has(event.target)) {
                ElementManager.removeHighlight(event.target);
            }
        }
    });

    document.addEventListener('click', async (event) => {
        if (ElementManager.selectionEnabled && !ElementManager.isPopupOpen && event.target.tagName) {  // Add popup check
            event.preventDefault();
            if (ElementManager.clickedElements.has(event.target)) {
                ElementManager.clickedElements.delete(event.target);
                ElementManager.removeHighlight(event.target);
                await updateStorage();
            } else {
                // Show element type selection popup
                const type = await PopupManager.showTypeSelectionPopup(event);
                if (!type) return; // User cancelled

                ElementManager.clickedElements.add(event.target);
                ElementManager.highlightElement(event.target, CONFIG.HIGHLIGHT_COLORS.SELECTED, '3px');
                const uniqueId = ElementManager.assignUniqueId(event.target);
                const elementData = {
                    action: 'elementSelected',
                    element: {
                        type: type, // 'title', 'price', or 'other'
                        tagName: event.target.tagName,
                        id: event.target.id,
                        className: event.target.className,
                        uniqueId: uniqueId,
                        xpath: ElementUtils.getElementXPath(event.target),
                        cssSelector: ElementUtils.getElementCSSSelector(event.target),
                        content: ElementUtils.getElementContent(event.target),
                        url: window.location.href
                    }
                };
                
                await StorageManager.saveElements(elementData.element);
                console.log('Selected element data:', JSON.stringify(elementData, null, 2));
                chrome.runtime.sendMessage(elementData);
            }
        }
    });

    // Message Handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Message received:', message);
        if (message.action === 'toggleSelection') {
            ElementManager.selectionEnabled = message.enabled;
            console.log('Selection enabled:', ElementManager.selectionEnabled);
        } else if (message.action === 'clearSelection') {
            clearAllSelections();
        } else if (message.action === 'changeElementType') {
            handleElementTypeChange(message.cssSelector, message.newType);
        } else if (message.action === 'disableContentScript') {
            window.hasRun = false;
            ElementManager.selectionEnabled = false;
            console.log('Content script disabled');
        }
        sendResponse({ success: true });
        return true;  // Required for async response
    });

    /**
     * Restores previously selected elements with retry mechanism
     * @param {number} [retryCount=0] - Current retry attempt
     * @returns {Promise<void>}
     */
    async function restoreClickedElements(retryCount = 0) {
        try {
            const data = await StorageManager.getElementsByOrigin(window.location.origin);
            const templates = data?.templates?.[window.location.href] || [];
            
            let foundElements = 0;
            templates.forEach(template => {
                try {
                    const element = document.querySelector(template.cssSelector);
                    if (element) {
                        ElementManager.clickedElements.add(element);
                        ElementManager.highlightElement(element, CONFIG.HIGHLIGHT_COLORS.SELECTED, '3px');
                        foundElements++;
                    }
                } catch (err) {
                    console.warn('Invalid selector:', template.cssSelector, err);
                }
            });

            // If we haven't found all elements and have retries left, try again
            if (foundElements < templates.length && retryCount < CONFIG.MAX_RETRIES) {
                console.log(`Found ${foundElements}/${templates.length} elements, retrying in ${CONFIG.RETRY_DELAY}ms... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
                await sleep(CONFIG.RETRY_DELAY);
                await restoreClickedElements(retryCount + 1);
            }
        } catch (err) {
            console.error('Error restoring elements:', err);
        }
    }

    // Initialize by restoring clicked elements
    restoreClickedElements();

    /**
     * Updates storage with current clicked elements
     * @returns {Promise<void>}
     */
    async function updateStorage() {
        const elements = Array.from(ElementManager.clickedElements).map(el => ({
            type: el.dataset.elementType || 'other',
            content: ElementUtils.getElementContent(el),
            xpath: ElementUtils.getElementXPath(el),
            cssSelector: ElementUtils.getElementCSSSelector(el),
            url: window.location.href
        }));

        for (const element of elements) {
            await StorageManager.saveElements(element);
        }
    }

    /**
     * Clears all selected elements
     * @returns {Promise<void>}
     */
    async function clearAllSelections() {
        try {
            await StorageManager.clearElements(window.location.href);
            ElementManager.clickedElements.forEach(element => ElementManager.removeHighlight(element));
            ElementManager.clickedElements.clear();
        } catch (err) {
            console.error('Error clearing selections:', err);
        }
    }

    /**
     * Handles element type change
     * @param {string} cssSelector - CSS selector of the element
     * @param {string} newType - New type to set
     * @returns {Promise<void>}
     */
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

    /**
     * Sleeps for a specified duration
     * @param {number} ms - Duration in milliseconds
     * @returns {Promise<void>}
     */
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
})();
(function() {
    /**
     * Sidepanel Script for Kaira Extension
     * Handles UI interactions and element display in the extension's sidepanel
     * @module SidepanelScript
     */

    /**
     * Configuration and state management
     * @typedef {Object} PanelState
     */
    const PanelState = {
        isActive: false
    };

    /**
     * UI element references
     * @typedef {Object} UIElements
     */
    const UIElements = {
        toggleBtn: document.getElementById('toggleSelect'),
        clearBtn: document.getElementById('clearSelect'),
        exportBtn: document.getElementById('exportJson'),
        jsonModal: document.getElementById('jsonModal'),
        closeModalBtn: document.querySelector('.close-modal'),
        jsonOutput: document.getElementById('jsonOutput'),
        copyJsonBtn: document.getElementById('copyJson'),
        selectedElementsContainer: document.getElementById('selectedElements')
    };

    /**
     * Storage management functions
     * @typedef {Object} StorageManager
     */
    const StorageManager = {
        /**
         * Loads stored elements from chrome storage
         * @returns {Promise<void>}
         */
        async loadStoredElements() {
            try {
                const data = await chrome.storage.local.get(null);
                for (const origin in data) {
                    const templates = data[origin].templates || {};
                    for (const url in templates) {
                        templates[url].forEach(element => {
                            UIManager.displaySelectedElement({
                                ...element,
                                url: url
                            });
                        });
                    }
                }
            } catch (err) {
                console.error('Error loading stored elements:', err);
            }
        },

        /**
         * Clears elements for a specific URL
         * @param {string} url - URL to clear elements for
         * @returns {Promise<void>}
         */
        async clearElements(url) {
            try {
                await chrome.storage.local.remove(url);
                console.log('Cleared elements for:', url);
            } catch (err) {
                console.error('Error clearing elements:', err);
            }
        }
    };

    /**
     * UI Management functions
     * @typedef {Object} UIManager
     */
    const UIManager = {
        /**
         * Displays a selected element in the sidepanel
         * @param {Object} element - Element data to display
         */
        displaySelectedElement(element) {
            const container = document.getElementById('selectedElements');
        
            // Get or create origin section
            const origin = new URL(element.url).origin;
            let originSection = container.querySelector(`[data-origin="${origin}"]`);
            if (!originSection) {
                originSection = document.createElement('div');
                originSection.className = 'origin-section';
                originSection.dataset.origin = origin;
                originSection.innerHTML = `
                    <h2 class="origin-header">${origin}</h2>
                    <div class="templates-container"></div>
                `;
                container.appendChild(originSection);
            }

            // Get or create template section for this URL
            const templatesContainer = originSection.querySelector('.templates-container');
            let templateSection = templatesContainer.querySelector(`[data-url="${element.url}"]`);
            if (!templateSection) {
                templateSection = document.createElement('div');
                templateSection.className = 'template-section';
                templateSection.dataset.url = element.url;
                templateSection.innerHTML = `
                    <h3 class="template-header">Template: ${new URL(element.url).pathname}</h3>
                    <div class="elements-list"></div>
                `;
                templatesContainer.appendChild(templateSection);
            }

            // Create element card
            const elementsList = templateSection.querySelector('.elements-list');
            const elementCard = document.createElement('div');
            elementCard.className = 'element-card';
            
            const content = element.content || 'No content';
            const truncatedContent = content.length > 50 ? content.substring(0, 47) + '...' : content;
            
            elementCard.innerHTML = `
                <div class="card-header">
                    <div class="element-type">
                        <select class="type-selector">
                            <option value="title" ${element.type === 'title' ? 'selected' : ''}>Title</option>
                            <option value="price" ${element.type === 'price' ? 'selected' : ''}>Price</option>
                            <option value="other" ${element.type === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="content-line">${truncatedContent}</div>
                </div>
                <div class="card-details hidden">
                    <pre>XPath: ${element.xpath}</pre>
                    <pre>CSS Selector: ${element.cssSelector}</pre>
                </div>
                <button class="show-more">Show more</button>
            `;

            // Add type change handler
            const typeSelector = elementCard.querySelector('.type-selector');
            typeSelector.addEventListener('change', async (e) => {
                const newType = e.target.value;
                try {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'changeElementType',
                        cssSelector: element.cssSelector,
                        newType: newType
                    });
                } catch (err) {
                    console.error('Error changing element type:', err);
                }
            });

            // Add show/hide functionality
            const showMoreBtn = elementCard.querySelector('.show-more');
            const details = elementCard.querySelector('.card-details');
            
            showMoreBtn.addEventListener('click', () => {
                details.classList.toggle('hidden');
                showMoreBtn.textContent = details.classList.contains('hidden') ? 'Show more' : 'Show less';
            });

            elementsList.appendChild(elementCard);
        },

        /**
         * Initializes UI event listeners
         */
        initializeEventListeners() {
            // Toggle button
            UIElements.toggleBtn.addEventListener('click', async () => {
                PanelState.isActive = !PanelState.isActive;
                this.updateToggleButton();
                await this.injectContentScript();
                await this.sendToggleMessage();
            });

            // Clear button
            UIElements.clearBtn.addEventListener('click', this.handleClearAction.bind(this));

            // Export functionality
            UIElements.exportBtn.addEventListener('click', this.handleExport.bind(this));
            UIElements.closeModalBtn.addEventListener('click', () => UIElements.jsonModal.classList.add('hidden'));
            UIElements.copyJsonBtn.addEventListener('click', () => {
                UIElements.jsonOutput.select();
                document.execCommand('copy');
            });
        },

        /**
         * Updates toggle button state
         */
        updateToggleButton() {
            UIElements.toggleBtn.textContent = PanelState.isActive ? 'Disable Selection' : 'Enable Selection';
            UIElements.toggleBtn.classList.toggle('active', PanelState.isActive);
        },

        /**
         * Injects content script into active tab
         */
        async injectContentScript() {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        },

        /**
         * Sends toggle message to content script
         */
        async sendToggleMessage() {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleSelection',
                    enabled: PanelState.isActive
                });
            } catch (err) {
                console.error('Error:', err);
            }
        },

        /**
         * Handles clear action
         */
        async handleClearAction() {
            if (!confirm('Are you sure you want to clear ALL stored data? This action cannot be undone.')) {
                return;
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            try {
                await chrome.storage.local.clear();
                await chrome.tabs.sendMessage(tab.id, { action: 'clearSelection' });
                UIElements.selectedElementsContainer.innerHTML = '';
            } catch (err) {
                console.error('Error:', err);
            }
        },

        /**
         * Handles export action
         */
        async handleExport() {
            try {
                const data = await chrome.storage.local.get(null);
                UIElements.jsonOutput.value = JSON.stringify(data, null, 2);
                UIElements.jsonModal.classList.remove('hidden');
            } catch (err) {
                console.error('Error exporting JSON:', err);
            }
        }
    };

    // Initialize message listener for selected elements
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'elementSelected') {
            UIManager.displaySelectedElement(message.element);
        }
    });

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('Sidepanel loaded');
        await StorageManager.loadStoredElements();
        UIManager.initializeEventListeners();
    });
})();



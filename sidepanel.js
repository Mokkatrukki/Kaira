document.addEventListener('DOMContentLoaded', () => {
    console.log('Sidepanel loaded');
    const toggleBtn = document.getElementById('toggleSelect');
    let isActive = false;

    // Storage management functions
    const StorageManager = {
        async clearElements(url) {
            try {
                await chrome.storage.local.remove(url);
                console.log('Cleared elements for:', url);
            } catch (err) {
                console.error('Error clearing elements:', err);
            }
        }
    };

    toggleBtn.addEventListener('click', async () => {
        isActive = !isActive;
        console.log('Toggle clicked, new state:', isActive);
        toggleBtn.textContent = isActive ? 'Disable Selection' : 'Enable Selection';
        toggleBtn.classList.toggle('active', isActive);

        // Inject content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        // Send message to active tab
        try {
            console.log('Sending message to tab:', tab.id);
            await chrome.tabs.sendMessage(tab.id, {
                action: 'toggleSelection',
                enabled: isActive
            });
        } catch (err) {
            console.error('Error:', err);
        }
    });

    const clearBtn = document.getElementById('clearSelect');
    clearBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear ALL stored data? This action cannot be undone.')) {
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        try {
            // Clear all storage
            await chrome.storage.local.clear();
            
            // Notify content script
            await chrome.tabs.sendMessage(tab.id, {
                action: 'clearSelection'
            });
            
            // Clear the displayed elements in sidepanel
            document.getElementById('selectedElements').innerHTML = '';
        } catch (err) {
            console.error('Error:', err);
        }
    });

    const exportBtn = document.getElementById('exportJson');
    const jsonModal = document.getElementById('jsonModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const jsonOutput = document.getElementById('jsonOutput');
    const copyJsonBtn = document.getElementById('copyJson');

    exportBtn.addEventListener('click', async () => {
        try {
            const data = await chrome.storage.local.get(null);
            jsonOutput.value = JSON.stringify(data, null, 2);
            jsonModal.classList.remove('hidden');
        } catch (err) {
            console.error('Error exporting JSON:', err);
        }
    });

    closeModalBtn.addEventListener('click', () => {
        jsonModal.classList.add('hidden');
    });

    copyJsonBtn.addEventListener('click', () => {
        jsonOutput.select();
        document.execCommand('copy');
    });

    // Add message listener for selected elements
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'elementSelected') {
            displaySelectedElement(message.element);
        }
    });

    function displaySelectedElement(element) {
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
    }
});



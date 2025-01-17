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
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        try {
            // Clear storage for current tab
            await StorageManager.clearElements(tab.url);
            await chrome.tabs.sendMessage(tab.id, {
                action: 'clearSelection'
            });
            // Clear the displayed elements in sidepanel
            document.getElementById('selectedElements').innerHTML = '';
        } catch (err) {
            console.error('Error:', err);
        }
    });

    // Add message listener for selected elements
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'elementSelected') {
            displaySelectedElement(message.element);
        }
    });

    function displaySelectedElement(element) {
        const container = document.getElementById('selectedElements');
        const elementCard = document.createElement('div');
        elementCard.className = 'element-card';
        
        const content = element.content || 'No content';
        const truncatedContent = content.length > 50 ? content.substring(0, 47) + '...' : content;
        const url = element.url || 'N/A';
        const urlHtml = url !== 'N/A' ? `<a href="${url}" target="_blank">${url}</a>` : 'N/A';
        
        elementCard.innerHTML = `
            <div class="card-header">
                <div class="url-line">${urlHtml}</div>
                <div class="content-line">${truncatedContent}</div>
            </div>
            <div class="card-details hidden">
                <pre>Tag: ${element.tagName}</pre>
                <pre>Class: ${element.className || 'N/A'}</pre>
                <pre>XPath: ${element.xpath}</pre>
                <pre>CSS Selector: ${element.cssSelector}</pre>
            </div>
            <button class="show-more">Show more</button>
        `;

        const showMoreBtn = elementCard.querySelector('.show-more');
        const details = elementCard.querySelector('.card-details');
        
        showMoreBtn.addEventListener('click', () => {
            details.classList.toggle('hidden');
            showMoreBtn.textContent = details.classList.contains('hidden') ? 'Show more' : 'Show less';
        });

        container.appendChild(elementCard);
    }
});

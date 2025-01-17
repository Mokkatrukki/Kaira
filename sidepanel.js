document.addEventListener('DOMContentLoaded', () => {
    console.log('Sidepanel loaded');
    const toggleBtn = document.getElementById('toggleSelect');
    let isActive = false;

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
        elementCard.innerHTML = `
            <pre>Content: ${element.content}</pre>
            <pre>Tag: ${element.tagName}</pre>
            <pre>Url: ${element.url || 'N/A'}</pre>
            <pre>Class: ${element.className || 'N/A'}</pre>
            <pre>XPath: ${element.xpath}</pre>
            <pre>CSS Selector: ${element.cssSelector}</pre>
            
        `;
        container.appendChild(elementCard);
    }
});

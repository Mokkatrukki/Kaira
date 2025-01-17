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
});

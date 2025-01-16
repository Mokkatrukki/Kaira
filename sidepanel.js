document.addEventListener('DOMContentLoaded', () => {
    console.log('Sidepanel loaded');
    const toggleBtn = document.getElementById('toggleSelect');
    let isActive = false;

    toggleBtn.addEventListener('click', () => {
        isActive = !isActive;
        console.log('Toggle clicked, new state:', isActive);
        toggleBtn.textContent = isActive ? 'Disable Selection' : 'Enable Selection';
        toggleBtn.classList.toggle('active', isActive);

        // Send message to active tab
        chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
            try {
                // Ensure content script is injected before sending message
                await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                });
                
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleSelection',
                    enabled: isActive
                });
            } catch (err) {
                console.error('Error:', err);
            }
        });
    });
});

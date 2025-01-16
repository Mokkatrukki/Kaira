let selectionEnabled = false;
console.log('Content script loaded');

chrome.runtime.onMessage.addListener((message) => {
    console.log('Message received:', message);
    if (message.action === 'toggleSelection') {
        selectionEnabled = message.enabled;
        console.log('Selection enabled:', selectionEnabled);
    }
});

document.addEventListener('mouseover', function(event) {
    if (selectionEnabled && event.target.tagName) {
        console.log('Mouseover element:', event.target);
        event.target.style.border = '1px solid red';
    }
});

document.addEventListener('mouseout', function(event) {
    if (selectionEnabled && event.target.tagName) {
        console.log('Mouseout element:', event.target);
        event.target.style.border = '';
    }
});
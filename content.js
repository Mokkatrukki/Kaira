if (window.hasRun === true) {
    console.log('Content script already loaded');
} else {
    window.hasRun = true;
    let selectionEnabled = false;
    let clickedElements = new Set();
    console.log('Content script loaded');

    chrome.runtime.onMessage.addListener((message) => {
        console.log('Message received:', message);
        if (message.action === 'toggleSelection') {
            selectionEnabled = message.enabled;
            console.log('Selection enabled:', selectionEnabled);
        }
    });

    function highlightElement(element, color, width = '2px') {
        element.style.border = `${width} solid ${color}`;
    }

    function removeHighlight(element) {
        element.style.border = '';
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

    document.addEventListener('click', function(event) {
        if (selectionEnabled && event.target.tagName) {
            if (clickedElements.has(event.target)) {
                clickedElements.delete(event.target);
                removeHighlight(event.target);
            } else {
                clickedElements.add(event.target);
                highlightElement(event.target, 'red', '3px');
                chrome.runtime.sendMessage({
                    action: 'elementSelected',
                    element: {
                        tagName: event.target.tagName,
                        id: event.target.id,
                        className: event.target.className
                    }
                });
            }
            event.preventDefault();
        }
    });
}
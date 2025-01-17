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
                const uniqueId = assignUniqueId(event.target);
                const elementData = {
                    action: 'elementSelected',
                    element: {
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
                console.log('Selected element data:', JSON.stringify(elementData, null, 2));
                chrome.runtime.sendMessage(elementData);
            }
            event.preventDefault();
        }
    });
}
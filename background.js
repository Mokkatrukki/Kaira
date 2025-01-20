chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent({populate: true}, (window) => {
        if (chrome.sidePanel && chrome.sidePanel.open) {
            chrome.sidePanel.open({ windowId: window.id });
        } else {
            chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
        }
    });
});

let activeTabId = null;

chrome.tabs.onActivated.addListener(({ tabId }) => {
    if (activeTabId && activeTabId !== tabId) {
        try {
            chrome.tabs.sendMessage(activeTabId, {
                action: 'toggleSelection',
                enabled: false
            });
        } catch (err) {
            console.log('Tab communication error (expected for extension pages):', err);
        }
    }
    activeTabId = tabId;
});

// Handle opening extension pages
function openExtensionPage(page) {
    chrome.tabs.create({
        url: chrome.runtime.getURL(page),
        active: true
    });
}

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openControlPage') {
        openExtensionPage('control.html');
        sendResponse({ success: true });
    }
    return true;
});
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

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: activeInfo.tabId },
            files: ['content.js']
        });
    } catch (err) {
        console.error('Failed to inject content script:', err);
    }
});
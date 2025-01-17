// Storage management for selected elements
export class StorageManager {
    static async saveElements(element) {
        try {
            const origin = new URL(element.url).origin;
            const currentData = await chrome.storage.local.get(origin) || {};
            
            if (!currentData[origin]) {
                currentData[origin] = {
                    templates: {}
                };
            }

            // Store template under the specific URL
            if (!currentData[origin].templates[element.url]) {
                currentData[origin].templates[element.url] = [];
            }

            currentData[origin].templates[element.url].push({
                type: element.type,
                content: element.content,
                xpath: element.xpath,
                cssSelector: element.cssSelector,
                timestamp: new Date().toISOString()
            });

            await chrome.storage.local.set({ [origin]: currentData[origin] });
            console.log('Saved element for origin:', origin);
        } catch (err) {
            console.error('Error saving elements:', err);
        }
    }

    static async getElementsByOrigin(origin) {
        try {
            const data = await chrome.storage.local.get(origin);
            return data[origin] || { templates: {} };
        } catch (err) {
            console.error('Error getting elements:', err);
            return { templates: {} };
        }
    }

    static async getAllOrigins() {
        try {
            const data = await chrome.storage.local.get(null);
            return Object.keys(data);
        } catch (err) {
            console.error('Error getting origins:', err);
            return [];
        }
    }

    static async clearOrigin(origin) {
        try {
            await chrome.storage.local.remove(origin);
            console.log('Cleared elements for origin:', origin);
        } catch (err) {
            console.error('Error clearing elements:', err);
        }
    }
}

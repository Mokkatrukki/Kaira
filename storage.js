// Storage management for selected elements
export class StorageManager {
    static async saveElements(url, selectors) {
        try {
            if (selectors.length > 0) {
                console.log('Saving selectors:', selectors);
                await chrome.storage.local.set({ [url]: selectors });
                const saved = await chrome.storage.local.get(url);
                console.log('Verified saved data:', saved);
            }
        } catch (err) {
            console.error('Error saving elements:', err);
        }
    }

    static async getElements(url) {
        try {
            const data = await chrome.storage.local.get(url);
            console.log('Retrieved data:', data);
            return data[url] || [];
        } catch (err) {
            console.error('Error getting elements:', err);
            return [];
        }
    }

    static async clearElements(url) {
        try {
            await chrome.storage.local.remove(url);
            console.log('Cleared elements for:', url);
        } catch (err) {
            console.error('Error clearing elements:', err);
        }
    }
}

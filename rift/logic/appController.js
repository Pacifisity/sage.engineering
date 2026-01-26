import { state } from './state.js';
import { UI } from './ui.js';
import { DriveService } from './drive.js';
import { getElements } from './selectors.js';

export const AppController = {
    async initCloudSync() {
        const elements = getElements();
        try {
            console.log("Fetching data from cloud...");
            const cloudData = await DriveService.loadStories();
            
            // Only overwrite if cloud data actually exists and isn't empty
            if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
                state.books = cloudData;
                state.save(state.books); // Keep local storage in sync with cloud
                UI.renderBooks(state.books, state.currentFilter, elements.library);
                console.log("Cloud data loaded successfully.");
            } else {
                console.log("No cloud data found or folder is empty.");
            }
        } catch (error) {
            console.error("Failed to load cloud data:", error);
        }
    },

    async sync() {
        const elements = getElements();

        try {
            // 1. Persist to Local Storage
            state.save(state.books);

            // 2. Update the Visuals
            UI.renderBooks(state.books, state.currentFilter, elements.library);

            // 3. Sync to Cloud (if authenticated)
            if (DriveService.accessToken) {
                await DriveService.saveStories(state.books);
                console.log("Cloud sync successful.");
            }
        } catch (error) {
            console.error("Critical Sync Error:", error);
            // Optionally trigger a UI notification here
            UI.showToast?.("Sync failed, but progress was saved locally.");
        }
    },

    /**
     * Handles the specific logic for importing new data
     */
    async handleImport(newData) {
        if (!Array.isArray(newData)) throw new Error("Invalid data format");
        
        state.books = newData;
        await this.sync();
    }
};
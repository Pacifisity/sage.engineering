import { state } from './state.js';
import { UI } from './ui.js';
import { DriveService } from './drive.js';
import { getElements } from './selectors.js';

/**
 * Orchestrates high-level application logic, coordinating between 
 * the data state, UI rendering, and cloud services.
 */
export const AppController = {
    /**
     * Initializes cloud synchronization by fetching remote data and
     * updating the local state if remote content exists.
     */
    async initCloudSync() {
        const elements = getElements();
        try {
            console.log("Fetching data from cloud...");
            const cloudData = await DriveService.loadStories();
            
            // Validate cloud data to prevent overwriting local state with empty values
            if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
                state.books = cloudData;
                state.save(state.books); // Persist cloud data to local storage
                UI.renderBooks(state.books, state.currentFilter, elements.library);
                console.log("Cloud data loaded successfully.");
            } else {
                console.log("No cloud data found or remote file is empty.");
            }
        } catch (error) {
            console.error("Failed to load cloud data:", error);
        }
    },

    /**
     * Synchronizes current application state across all persistence layers:
     * 1. Updates LocalStorage
     * 2. Re-renders UI
     * 3. Uploads to Cloud (if authenticated)
     */
    async sync() {
        const elements = getElements();

        try {
            // Local persistence remains the primary source of truth for speed
            state.save(state.books);

            // Update UI immediately for a responsive feel
            UI.renderBooks(state.books, state.currentFilter, elements.library);

            // Secondary background sync to Google Drive
            if (DriveService.accessToken) {
                await DriveService.saveStories(state.books);
                console.log("Cloud sync successful.");
            }
        } catch (error) {
            console.error("Critical Sync Error:", error);
            // Graceful degradation: inform user if remote sync fails
            UI.showToast?.("Sync failed, but progress was saved locally.");
        }
    },

    /**
     * Processes imported JSON data, overwrites current state, and triggers a full sync.
     * @param {Array} newData - The parsed array of book objects to import.
     */
    async handleImport(newData) {
        if (!Array.isArray(newData)) throw new Error("Invalid data format");
        
        state.books = newData;
        await this.sync();
    }
};
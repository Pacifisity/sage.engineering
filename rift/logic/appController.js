import { state } from './state.js';
import { UI } from './ui.js';
import { DriveService } from './drive.js';
import { getElements } from './selectors.js';

export const AppController = {
    /**
     * The single source of truth for refreshing the application state.
     * Call this whenever data is added, deleted, or modified.
     */
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
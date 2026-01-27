import { state } from './state.js';
import { UI } from './ui.js';
import { DriveService } from './drive.js';
import { getElements } from './selectors.js';
import { ModalController } from './ModalController.js'; // Import this

export const AppController = {
    /**
     * Helper to check if two data sets are functionally identical
     */
    isDataEqual(local, cloud) {
        return JSON.stringify(local) === JSON.stringify(cloud);
    },

    async initCloudSync() {
        const elements = getElements();
        try {
            console.log("Fetching data from cloud...");
            const cloudData = await DriveService.loadStories();

            // 1. If cloud is empty, just push our local data up to initialize it
            if (!cloudData || !Array.isArray(cloudData) || cloudData.length === 0) {
                console.log("Cloud empty. Initializing cloud with local data...");
                await DriveService.saveStories(state.books);
                return;
            }

            // 2. If data is identical, do nothing
            if (this.isDataEqual(state.books, cloudData)) {
                console.log("Local and Cloud are in sync.");
                return;
            }

            // 3. CONFLICT: Data exists and is different. Ask the user.
            const userChoice = await this.resolveSyncConflict(elements);

            if (userChoice === 'cloud') {
                state.books = cloudData;
                state.save(state.books);
                console.log("User chose Cloud data.");
            } else {
                // User chose Local. Overwrite the cloud with local data.
                await DriveService.saveStories(state.books);
                console.log("User chose Local data. Overwriting cloud...");
            }

            UI.renderBooks(state.books, state.currentFilter, elements.library);
            
        } catch (error) {
            console.error("Failed to load cloud data:", error);
        }
    },

    /**
     * Wraps the Modal choice in a Promise so initCloudSync can 'await' it.
     */
    resolveSyncConflict(elements) {
        return new Promise((resolve) => {
            ModalController.open(elements.syncModal); // Assumes you added this to selectors

            const cloudBtn = elements.syncModal.querySelector('#use-cloud-btn');
            const localBtn = elements.syncModal.querySelector('#use-local-btn');

            cloudBtn.onclick = () => {
                ModalController.closeAll();
                resolve('cloud');
            };

            localBtn.onclick = () => {
                ModalController.closeAll();
                resolve('local');
            };
        });
    },

    async sync() {
        const elements = getElements();
        try {
            state.save(state.books);
            UI.renderBooks(state.books, state.currentFilter, elements.library);

            if (DriveService.accessToken) {
                await DriveService.saveStories(state.books);
                console.log("Cloud sync successful.");
            }
        } catch (error) {
            console.error("Critical Sync Error:", error);
            UI.showToast?.("Sync failed, but progress was saved locally.");
        }
    },

    async handleImport(newData) {
        if (!Array.isArray(newData)) throw new Error("Invalid data format");
        
        state.books = newData;
        // Since sync() checks for DriveService.accessToken, 
        // calling this will automatically overwrite the cloud.
        await this.sync();
        console.log("Imported JSON and overwrote cloud data.");
    }
};
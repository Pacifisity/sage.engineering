import { state } from './state.js';
import { UI } from './ui.js';
import { DriveService } from './drive.js';
import { getElements } from './selectors.js';
import { ModalController } from './modalController.js'; // Import this
import { ThemeService } from './theme.js';

export const AppController = {
    normalizeKey(book) {
        const title = (book?.title || '').trim().toLowerCase();
        const author = (book?.author || '').trim().toLowerCase();
        return `${title}::${author}`;
    },

    normalizeValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return String(value);
        return String(value).trim();
    },

    isBookEqual(localBook, cloudBook) {
        const fields = [
            'title',
            'author',
            'status',
            'rating',
            'trackingType',
            'currentCount',
            'url',
            'notes',
            'isFavorite'
        ];

        return fields.every((field) =>
            this.normalizeValue(localBook?.[field]) === this.normalizeValue(cloudBook?.[field])
        );
    },

    buildDiffSummary(localBooks, cloudBooks) {
        const local = Array.isArray(localBooks) ? localBooks : [];
        const cloud = Array.isArray(cloudBooks) ? cloudBooks : [];

        const cloudById = new Map();
        cloud.forEach(book => cloudById.set(book.id, book));

        const cloudByKey = new Map();
        cloud.forEach(book => {
            const key = this.normalizeKey(book);
            if (!cloudByKey.has(key)) cloudByKey.set(key, []);
            cloudByKey.get(key).push(book);
        });

        const matchedCloudIds = new Set();
        const samples = {
            localOnly: [],
            cloudOnly: [],
            changed: []
        };

        let localOnlyCount = 0;
        let cloudOnlyCount = 0;
        let changedCount = 0;
        let sameCount = 0;

        local.forEach(localBook => {
            let match = null;

            if (localBook?.id && cloudById.has(localBook.id)) {
                match = cloudById.get(localBook.id);
            } else {
                const key = this.normalizeKey(localBook);
                const candidates = cloudByKey.get(key) || [];
                match = candidates.find(c => !matchedCloudIds.has(c.id));
            }

            if (match) {
                matchedCloudIds.add(match.id);
                if (this.isBookEqual(localBook, match)) {
                    sameCount++;
                } else {
                    changedCount++;
                    if (samples.changed.length < 3) samples.changed.push(localBook.title || 'Untitled');
                }
            } else {
                localOnlyCount++;
                if (samples.localOnly.length < 3) samples.localOnly.push(localBook.title || 'Untitled');
            }
        });

        cloud.forEach(cloudBook => {
            if (!matchedCloudIds.has(cloudBook.id)) {
                cloudOnlyCount++;
                if (samples.cloudOnly.length < 3) samples.cloudOnly.push(cloudBook.title || 'Untitled');
            }
        });

        return {
            localOnlyCount,
            cloudOnlyCount,
            changedCount,
            sameCount,
            samples
        };
    },

    renderDiffSummary(modalElement, summary) {
        if (!modalElement) return;
        const container = modalElement.querySelector('#sync-diff-summary');
        if (!container) return;

        container.innerHTML = '';

        const title = document.createElement('h4');
        title.textContent = 'Conflict summary';
        container.appendChild(title);

        const row = document.createElement('div');
        row.className = 'summary-row';

        const pills = [
            { label: 'Local only', value: summary.localOnlyCount },
            { label: 'Cloud only', value: summary.cloudOnlyCount },
            { label: 'Changed', value: summary.changedCount },
            { label: 'Same', value: summary.sameCount }
        ];

        pills.forEach(pill => {
            const el = document.createElement('div');
            el.className = 'summary-pill';
            el.textContent = `${pill.label}: ${pill.value}`;
            row.appendChild(el);
        });

        container.appendChild(row);

        const addSampleList = (label, items) => {
            if (!items || items.length === 0) return;
            const listTitle = document.createElement('div');
            listTitle.style.marginTop = '10px';
            listTitle.textContent = label;
            container.appendChild(listTitle);

            const list = document.createElement('ul');
            items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                list.appendChild(li);
            });
            container.appendChild(list);
        };

        addSampleList('Local-only samples', summary.samples.localOnly);
        addSampleList('Cloud-only samples', summary.samples.cloudOnly);
        addSampleList('Changed samples', summary.samples.changed);
    },
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
            const cloudResponse = await DriveService.loadStories();

            // Extract data and metadata
            let cloudData = cloudResponse;
            let cloudTimestamp = null;
            
            if (cloudResponse && typeof cloudResponse === 'object' && cloudResponse.data && cloudResponse.modifiedTime) {
                cloudData = cloudResponse.data;
                cloudTimestamp = cloudResponse.modifiedTime;
            }

            const normalized = this.normalizeCloudPayload(cloudData);
            const cloudBooks = normalized.books;
            const cloudTheme = normalized.theme;

            // 1. If cloud is empty, just push our local data up to initialize it
            if (!cloudBooks || !Array.isArray(cloudBooks) || cloudBooks.length === 0) {
                console.log("Cloud empty. Initializing cloud with local data...");
                await DriveService.saveStories({ books: state.books, theme: ThemeService.getTheme() });
                return;
            }

            // 2. If data is identical, do nothing
            if (this.isDataEqual(state.books, cloudBooks)) {
                const localTheme = ThemeService.getTheme();
                const cloudUpdated = cloudTheme?.updatedAt || 0;
                const localUpdated = localTheme?.updatedAt || 0;

                if (cloudTheme && cloudUpdated > localUpdated) {
                    ThemeService.save({ accent: cloudTheme.accent, updatedAt: cloudUpdated });
                } else if (DriveService.accessToken && localUpdated > cloudUpdated) {
                    await DriveService.saveStories({ books: state.books, theme: localTheme });
                }

                console.log("Local and Cloud are in sync.");
                return;
            }

            // 3. CONFLICT: Data exists and is different. Ask the user.
            if (!state.books || state.books.length === 0) {
                state.books = cloudBooks;
                state.save(state.books);
                this.resolveThemeDifferences(cloudTheme, true);
                UI.renderBooks(state.books, state.currentFilter, elements.library, '', 'status-rating', 'content-update');
                console.log("Local empty. Auto-selected Cloud data.");
                return;
            }

            const diffSummary = this.buildDiffSummary(state.books, cloudBooks);
            const userChoice = await this.resolveSyncConflict(elements, cloudTimestamp, diffSummary);

            if (userChoice === 'cloud') {
                state.books = cloudBooks;
                state.save(state.books);
                this.resolveThemeDifferences(cloudTheme, true);
                console.log("User chose Cloud data.");
            } else {
                // User chose Local. Overwrite the cloud with local data.
                await DriveService.saveStories({ books: state.books, theme: ThemeService.getTheme() });
                console.log("User chose Local data. Overwriting cloud...");
            }

            UI.renderBooks(state.books, state.currentFilter, elements.library, '', 'status-rating', 'content-update');
            
        } catch (error) {
            console.error("Failed to load cloud data:", error);
        }
    },

    /**
     * Wraps the Modal choice in a Promise so initCloudSync can 'await' it.
     * Shows a disabled countdown timer to prevent accidental clicks.
     * @param {Object} elements - DOM elements
     * @param {string|null} cloudTimestamp - ISO timestamp of when cloud data was last modified
     */
    resolveSyncConflict(elements, cloudTimestamp = null, diffSummary = null) {
        return new Promise((resolve) => {
            ModalController.open(elements.syncModal);

            // Display cloud data timestamp
            const timestampEl = elements.syncModal.querySelector('#cloud-timestamp');
            if (timestampEl && cloudTimestamp) {
                timestampEl.textContent = this.formatTimestamp(cloudTimestamp);
            }

            if (diffSummary) {
                this.renderDiffSummary(elements.syncModal, diffSummary);
            }

            const cloudBtn = elements.syncModal.querySelector('#use-cloud-btn');
            const localBtn = elements.syncModal.querySelector('#use-local-btn');
            const buttons = [cloudBtn, localBtn];

            // Initial state: buttons disabled with countdown
            const countdownDuration = 3000; // 3 seconds
            const startTime = Date.now();

            const updateCountdown = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / countdownDuration, 1);

                buttons.forEach(btn => {
                    const countdown = btn.querySelector('.sync-countdown');
                    if (countdown) {
                        countdown.style.width = (progress * 100) + '%';
                    }
                });

                if (progress < 1) {
                    requestAnimationFrame(updateCountdown);
                } else {
                    // Timer complete - enable buttons
                    buttons.forEach(btn => {
                        btn.disabled = false;
                        btn.classList.add('ready');
                    });
                }
            };

            requestAnimationFrame(updateCountdown);

            // Setup click handlers
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

    /**
     * Formats an ISO timestamp to a human-readable relative time string
     * @param {string} isoTimestamp - ISO 8601 timestamp string
     * @returns {string} Human-readable time (e.g., "3 hours ago")
     */
    formatTimestamp(isoTimestamp) {
        try {
            const date = new Date(isoTimestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
            
            // For older times, show the date
            return `${date.toLocaleDateString()}`;
        } catch {
            return 'Unknown time';
        }
    },

    async sync() {
        const elements = getElements();
        try {
            state.save(state.books);
            UI.renderBooks(state.books, state.currentFilter, elements.library, '', 'status-rating', 'smart');

            if (DriveService.accessToken) {
                await DriveService.saveStories({ books: state.books, theme: ThemeService.getTheme() });
                console.log("Cloud sync successful.");
            }
        } catch (error) {
            console.error("Critical Sync Error:", error);
            UI.showToast?.("Sync failed, but progress was saved locally.");
        }
    },

    normalizeCloudPayload(payload) {
        if (Array.isArray(payload)) {
            return { books: payload, theme: null };
        }

        if (payload && typeof payload === 'object') {
            const books = Array.isArray(payload.books) ? payload.books : Array.isArray(payload.data) ? payload.data : [];
            const theme = payload.theme || null;
            return { books, theme };
        }

        return { books: [], theme: null };
    },

    resolveThemeDifferences(cloudTheme, preferCloud = false) {
        const localTheme = ThemeService.getTheme();
        if (!cloudTheme) return;

        const cloudUpdated = cloudTheme.updatedAt || 0;
        const localUpdated = localTheme.updatedAt || 0;

        if (preferCloud || cloudUpdated > localUpdated) {
            ThemeService.save({ ...cloudTheme, updatedAt: cloudUpdated });
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
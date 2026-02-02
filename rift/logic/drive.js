import { UI } from './ui.js';

/**
 * Service to handle Google Drive AppData synchronization.
 * Uses the Google Identity Services (GIS) implicit flow.
 */
export const DriveService = {
    CLIENT_ID: '1090774428999-pjc7fkh4g278cioh00mimq8ru0ljq940.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.appdata',
    tokenClient: null,
    accessToken: null,
    autoSyncInterval: null,
    AUTO_SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes in milliseconds

    /**
     * Initializes the Google Identity client and restores existing sessions.
     */
    init: function(onReady) {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (resp) => {
                if (resp.error) return console.error("Login Error:", resp.error);
                this.handleNewToken(resp, onReady);
            },
        });

        // Restore session from storage if it hasn't expired (with 5-minute buffer)
        const session = JSON.parse(localStorage.getItem('google_drive_session'));
        if (session && session.token && Date.now() < (session.expiry - 300000)) {
            this.accessToken = session.token;
            UI.updateSyncStatus(true);
            this.startAutoSync();
            if (onReady) onReady();
        } else if (session) {
            // If we HAD a session but it's expired, try to recover it silently
            this.requestSilentToken()
                .then(() => { this.startAutoSync(); if (onReady) onReady(); })
                .catch(() => { console.log("Could not auto-restore session."); });
        }
    },

    /**
     * Processes new tokens and persists them to localStorage.
     */
    handleNewToken: function(resp, onReady) {
        this.accessToken = resp.access_token;
        const expiry = Date.now() + (resp.expires_in * 1000);
        
        localStorage.setItem('google_drive_session', JSON.stringify({
            token: resp.access_token,
            expiry: expiry
        }));

        UI.updateSyncStatus(true);
        this.startAutoSync();
        
        // Trigger background sync initialization
        import('./appController.js').then(m => m.AppController.initCloudSync());
        
        if (onReady) onReady();
    },

    /**
     * Starts periodic auto-sync to Google Drive (every 5 minutes)
     */
    startAutoSync: function() {
        // Clear existing interval to prevent duplicates
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }

        // Auto-sync every 5 minutes when user is authenticated
        this.autoSyncInterval = setInterval(() => {
            if (this.accessToken) {
                import('./appController.js').then(m => {
                    m.AppController.sync();
                    console.log("[Auto-Sync] Syncing to Google Drive...");
                }).catch(err => console.error("Auto-sync failed:", err));
            }
        }, this.AUTO_SYNC_INTERVAL);

        console.log("[Auto-Sync] Background sync started (every 5 minutes)");
    },

    /**
     * Stops the auto-sync interval
     */
    stopAutoSync: function() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log("[Auto-Sync] Background sync stopped");
        }
    },

    /**
     * Initiates the OAuth2 login flow.
     */
    login: function() {
        // use select_account to allow user switching without forcing full consent prompts
        this.tokenClient.requestAccessToken({ prompt: 'select_account' });
    },

    async fetchDrive(url, options = {}) {
        // 1. Check if we even have a token
        if (!this.accessToken) {
            throw new Error("No access token available. Please login.");
        }

        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`,
        };

        let response = await fetch(url, options);

        // 2. Handle 401 Unauthorized (Token Expired)
        if (response.status === 401) {
            console.log("Token expired, attempting silent refresh...");
            
            try {
                const newToken = await this.requestSilentToken();
                options.headers['Authorization'] = `Bearer ${newToken}`;
                return await fetch(url, options); // Retry the original request
            } catch (err) {
                console.error("Silent refresh failed. User must click login.");
                this.logout();
                throw err;
            }
        }
        return response;
    },

    /**
     * Prompts Google for a new token without showing a UI popup.
     */
    requestSilentToken() {
        return new Promise((resolve, reject) => {
            this.tokenClient.callback = (resp) => {
                if (resp.error) {
                    reject(resp.error);
                } else {
                    this.handleNewToken(resp);
                    resolve(resp.access_token);
                }
            };

            this.tokenClient.requestAccessToken({ prompt: 'none' });
        });
    },

    /**
     * Clears local authentication state.
     */
    logout: function() {
        localStorage.removeItem('google_drive_session');
        this.accessToken = null;
        this.stopAutoSync();
        UI.updateSyncStatus(false);
    },

    /**
     * Locates 'stories.json' within the user's hidden Drive AppData folder.
     */
    async getFileId() {
        const query = encodeURIComponent("name='stories.json' and 'appDataFolder' in parents");
        const response = await this.fetchDrive(
            `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder`
        );
        const data = await response.json();
        return (data.files && data.files.length > 0) ? data.files[0].id : null;
    },

    /**
     * Uploads story data to Google Drive.
     */
    saveStories: async function(payload) {
        const fileId = await this.getFileId();
        const content = JSON.stringify(payload);

        if (fileId) {
            return await this.fetchDrive(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                { 
                    method: 'PATCH', 
                    body: content,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        } else {
            // Create a new file using a multipart upload to set metadata and content at once
            const boundary = '-------314159265358979323846';
            const delimiter = `\r\n--${boundary}\r\n`;
            const close_delim = `\r\n--${boundary}--`;

            const metadata = JSON.stringify({
                name: 'stories.json',
                parents: ['appDataFolder']
            });

            const multipartBody = 
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                metadata +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                content +
                close_delim;

            return await this.fetchDrive(
                `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
                    body: multipartBody
                }
            );
        }
    },

    /**
     * Downloads story data from Google Drive and returns with metadata.
     * @returns {Promise<{data: Array, modifiedTime: string}|Array>} Stories with optional metadata or empty array
     */
    loadStories: async function() {
        const fileId = await this.getFileId();
        if (!fileId) return [];

        try {
            // Fetch metadata to get the modified time
            const metadataRes = await this.fetchDrive(
                `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`
            );
            const metadata = metadataRes.ok ? await metadataRes.json() : {};

            // Fetch the actual file content
            const fileRes = await this.fetchDrive(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
            );
            
            if (!fileRes.ok) return [];
            const data = await fileRes.json();
            
            // Return data with metadata if available
            if (metadata.modifiedTime) {
                return { data, modifiedTime: metadata.modifiedTime };
            }
            return data;
        } catch (error) {
            console.error("Error loading stories:", error);
            return [];
        }
    }
};
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
            if (onReady) onReady();
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
        
        // Trigger background sync initialization
        import('./appController.js').then(m => m.AppController.initCloudSync());
        
        if (onReady) onReady();
    },

    /**
     * Initiates the OAuth2 login flow.
     */
    login: function() {
        // use select_account to allow user switching without forcing full consent prompts
        this.tokenClient.requestAccessToken({ prompt: 'select_account' });
    },

    /**
     * Wrapper for fetch that injects Auth headers and handles silent token refresh.
     */
    async fetchDrive(url, options = {}) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`,
        };

        let response = await fetch(url, options);

        // Handle expired tokens by attempting a silent background refresh
        if (response.status === 401) {
            return new Promise((resolve, reject) => {
                this.tokenClient.callback = async (resp) => {
                    if (resp.error) {
                        this.logout();
                        reject(new Error("Refresh failed"));
                        return;
                    }
                    this.handleNewToken(resp);
                    
                    options.headers['Authorization'] = `Bearer ${this.accessToken}`;
                    const retryRes = await fetch(url, options);
                    resolve(retryRes);
                };
                
                // prompt: '' attempts to get a token without showing a popup
                this.tokenClient.requestAccessToken({ prompt: '' });
            });
        }
        return response;
    },

    /**
     * Clears local authentication state.
     */
    logout: function() {
        localStorage.removeItem('google_drive_session');
        this.accessToken = null;
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
    saveStories: async function(books) {
        const fileId = await this.getFileId();
        const content = JSON.stringify(books);

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
     * Downloads story data from Google Drive.
     */
    loadStories: async function() {
        const fileId = await this.getFileId();
        if (!fileId) return [];

        const fileRes = await this.fetchDrive(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
        );
        
        if (!fileRes.ok) return [];
        return await fileRes.json();
    }
};
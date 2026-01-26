import { UI } from './ui.js';

export const DriveService = {
    CLIENT_ID: '1090774428999-pjc7fkh4g278cioh00mimq8ru0ljq940.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.appdata',
    tokenClient: null,
    accessToken: null,
    isRefreshing: false,

    init: function(onReady) {
        gapi.load('client', async () => {
            await gapi.client.init({
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });

            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: (resp) => {
                    this.isRefreshing = false;
                    if (resp.error) {
                        console.error("Login Error:", resp.error);
                        return;
                    }

                    this.accessToken = resp.access_token;
                    gapi.client.setToken({ access_token: resp.access_token });

                    // Save session
                    const expiry = Date.now() + (resp.expires_in * 1000);
                    localStorage.setItem('google_drive_session', JSON.stringify({
                        token: resp.access_token,
                        expiry: expiry
                    }));

                    // 1. Update UI first
                    UI.updateSyncStatus(true);

                    // 2. Trigger initial sync (Dynamic import to avoid circular dependency)
                    import('./appController.js').then(module => {
                        module.AppController.sync();
                    }).catch(err => console.error("Sync trigger failed:", err));

                    if (onReady) onReady();
                },
            });

            // --- SMART AUTO-RESUME ---
            const session = JSON.parse(localStorage.getItem('google_drive_session'));
            
            if (session && session.token) {
                const isExpired = Date.now() > (session.expiry - 300000);
                if (!isExpired) {
                    this.accessToken = session.token;
                    gapi.client.setToken({ access_token: session.token });
                    
                    // UPDATE UI ON SUCCESSFUL AUTO-RESUME
                    UI.updateSyncStatus(true);
                    
                    if (onReady) onReady();
                } else {
                    this.requestSilentToken();
                }
            }
        });
    },

    requestSilentToken: function() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        this.tokenClient.requestAccessToken({ prompt: 'none' });
    },

    login: function() {
        if (!this.tokenClient) {
            console.error("Token client not initialized yet.");
            return;
        }
        this.isRefreshing = true;
        this.tokenClient.requestAccessToken({ prompt: 'select_account' });
    },

    execute: async function(apiCall) {
        if (!this.accessToken) {
            console.warn("No access token available for sync.");
            return null;
        }
        
        try {
            return await apiCall();
        } catch (err) {
            // If the token expired mid-session
            if (err.status === 401) {
                this.handleAuthError(err);
            }
            throw err;
        }
    },

    handleAuthError: function(err) {
        this.accessToken = null;
        localStorage.removeItem('google_drive_session');
        UI.updateSyncStatus(false);
    },

    saveStories: async function(books) {
        return this.execute(async () => {
            const response = await gapi.client.drive.files.list({
                q: "name = 'stories.json'",
                spaces: 'appDataFolder',
                fields: 'files(id)'
            });

            const fileId = response.result.files.length > 0 ? response.result.files[0].id : null;
            const metadata = {
                name: 'stories.json',
                mimeType: 'application/json',
                parents: ['appDataFolder']
            };

            const content = JSON.stringify(books);

            if (fileId) {
                return await gapi.client.request({
                    path: `/upload/drive/v3/files/${fileId}`,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    body: content
                });
            } else {
                return await gapi.client.request({
                    path: '/upload/drive/v3/files',
                    method: 'POST',
                    params: { uploadType: 'multipart' },
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(metadata) + '\r\n\r\n' + content
                });
            }
        });
    },

    loadStories: async function() {
        return this.execute(async () => {
            const response = await gapi.client.drive.files.list({
                q: "name = 'stories.json'",
                spaces: 'appDataFolder',
                fields: 'files(id)'
            });

            if (response.result.files.length === 0) return [];

            const fileId = response.result.files[0].id;
            const file = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            return file.result;
        });
    }
};
export const DriveService = {
    CLIENT_ID: '1090774428999-pjc7fkh4g278cioh00mimq8ru0ljq940.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.appdata',
    tokenClient: null,
    accessToken: null,
    isRefreshing: false, // Prevents popup spam

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
                        console.warn("Silent auth failed:", resp.error);
                        return;
                    }
                    
                    this.accessToken = resp.access_token;
                    const expiry = Date.now() + (resp.expires_in * 1000);
                    localStorage.setItem('google_drive_session', JSON.stringify({
                        token: resp.access_token,
                        expiry: expiry
                    }));

                    if (onReady) onReady();
                },
            });

            // --- SMART AUTO-RESUME ---
            const session = JSON.parse(localStorage.getItem('google_drive_session'));
            
            if (session && session.token) {
                const isExpired = Date.now() > (session.expiry - 300000); // 5 min buffer
                if (!isExpired) {
                    this.accessToken = session.token;
                    if (onReady) onReady();
                } else {
                    // Token expired. Try to get a new one silently.
                    this.requestSilentToken();
                }
            }
        });
    },

    requestSilentToken: function() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        // prompt: 'none' is the key. It fails quietly if it can't login.
        this.tokenClient.requestAccessToken({ prompt: 'none' });
    },

    login: function() {
        this.isRefreshing = true;
        this.tokenClient.requestAccessToken({ prompt: 'select_account' });
    },

    // Wrap your API calls in this helper to auto-fix expired sessions
    execute: async function(apiCall) {
        try {
            if (!this.accessToken) {
                // Try one last silent refresh before giving up
                this.requestSilentToken();
                throw { status: 401 };
            }
            return await apiCall();
        } catch (err) {
            if (err.status === 401) {
                this.handleAuthError(err);
            }
            throw err;
        }
    },

    handleAuthError: function(err) {
        this.accessToken = null;
        localStorage.removeItem('google_drive_session');
        if (typeof updateAccountUI === 'function') updateAccountUI();
    },

    saveStories: async function(books) {
        return this.execute(async () => {
            // 1. Check if the file already exists
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
                // Update existing file
                return await gapi.client.request({
                    path: `/upload/drive/v3/files/${fileId}`,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    body: content
                });
            } else {
                // Create new file
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
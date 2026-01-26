import { UI } from './ui.js';

export const DriveService = {
    CLIENT_ID: '1090774428999-pjc7fkh4g278cioh00mimq8ru0ljq940.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.appdata',
    tokenClient: null,
    accessToken: null,

    init: function(onReady) {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (resp) => {
                if (resp.error) return console.error("Login Error:", resp.error);
                this.handleNewToken(resp, onReady);
            },
        });

        // Auto-resume from localStorage
        const session = JSON.parse(localStorage.getItem('google_drive_session'));
        if (session && session.token && Date.now() < (session.expiry - 300000)) {
            this.accessToken = session.token;
            UI.updateSyncStatus(true);
            if (onReady) onReady();
        }
    },

    handleNewToken: function(resp, onReady) {
        this.accessToken = resp.access_token;
        const expiry = Date.now() + (resp.expires_in * 1000);
        localStorage.setItem('google_drive_session', JSON.stringify({
            token: resp.access_token,
            expiry: expiry
        }));

        UI.updateSyncStatus(true);
        
        // CHANGE THIS: Call initCloudSync instead of sync()
        import('./appController.js').then(m => m.AppController.initCloudSync());
        
        if (onReady) onReady();
    },

    login: function() {
        // 'consent' ensures the user can re-check the "Drive" permissions box if they missed it
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    },

    async fetchDrive(url, options = {}) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`,
        };
        const response = await fetch(url, options);
        if (response.status === 401) {
            localStorage.removeItem('google_drive_session');
            UI.updateSyncStatus(false);
            throw new Error("Unauthorized");
        }
        return response;
    },

    /**
     * Finds the stories.json file in the hidden appData folder
     */
    async getFileId() {
        const query = encodeURIComponent("name='stories.json' and 'appDataFolder' in parents");
        const response = await this.fetchDrive(
            `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder`
        );
        const data = await response.json();
        return (data.files && data.files.length > 0) ? data.files[0].id : null;
    },

    saveStories: async function(books) {
        const fileId = await this.getFileId();
        const content = JSON.stringify(books);

        if (fileId) {
            // Update existing file
            return await this.fetchDrive(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                { 
                    method: 'PATCH', 
                    body: content,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        } else {
            // Create new file using Multipart upload
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
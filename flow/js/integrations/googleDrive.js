const CLIENT_ID =
  "256449869367-57edh8eio8ulu6nipc0i4g0mt23dbjm3.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "flow-tasks.json";

let tokenClient = null;
let accessToken = "";
let tokenExpiryTime = null;
let refreshTimerId = null;
let statusHandler = () => {};
let authHandler = () => {};

function setStatus(message) {
  if (statusHandler) {
    statusHandler(message);
  }
}

function scheduleTokenRefresh() {
  // Clear any existing refresh timer
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }

  if (!tokenExpiryTime) {
    return;
  }

  const now = Date.now();
  const timeUntilExpiry = tokenExpiryTime - now;
  
  // Refresh 5 minutes before expiry (or immediately if less than 5 minutes remain)
  const refreshBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
  const timeUntilRefresh = Math.max(0, timeUntilExpiry - refreshBuffer);

  refreshTimerId = setTimeout(() => {
    if (accessToken && tokenClient) {
      // Request new token silently
      tokenClient.requestAccessToken({ prompt: "" });
    }
  }, timeUntilRefresh);
}

function setTokenAndScheduleRefresh(token, expiresIn = 3600) {
  accessToken = token;
  // expiresIn is in seconds, convert to milliseconds
  tokenExpiryTime = Date.now() + (expiresIn * 1000);
  
  // Persist to localStorage
  localStorage.setItem("googleAccessToken", token);
  localStorage.setItem("googleTokenExpiry", tokenExpiryTime.toString());
  
  scheduleTokenRefresh();
}

export function initGoogleDrive(onStatus, onAuth) {
  statusHandler = onStatus || (() => {});
  authHandler = onAuth || (() => {});
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    return false;
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response && response.access_token) {
        const expiresIn = response.expires_in || 3600; // Default to 1 hour if not provided
        setTokenAndScheduleRefresh(response.access_token, expiresIn);
        setStatus("Signed in");
        authHandler(true);
      }
    }
  });
  
  // Try to restore token from localStorage
  const storedToken = localStorage.getItem("googleAccessToken");
  const storedExpiry = localStorage.getItem("googleTokenExpiry");
  
  if (storedToken && storedExpiry) {
    const expiryTime = parseInt(storedExpiry, 10);
    const now = Date.now();
    
    // If token is still valid (not expired)
    if (expiryTime > now) {
      accessToken = storedToken;
      tokenExpiryTime = expiryTime;
      scheduleTokenRefresh();
      setStatus("Signed in");
      authHandler(true);
      return true;
    } else {
      // Token expired, clear it
      localStorage.removeItem("googleAccessToken");
      localStorage.removeItem("googleTokenExpiry");
    }
  }
  
  setStatus("Not signed in");
  return true;
}

export function isSignedIn() {
  return Boolean(accessToken);
}

export function requestSignIn() {
  if (!tokenClient) {
    setStatus("Google not ready");
    return;
  }
  tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
}

export function signOut() {
  if (!accessToken) {
    setStatus("Signed out");
    authHandler(false);
    return;
  }
  const token = accessToken;
  accessToken = "";
  tokenExpiryTime = null;
  
  // Clear localStorage
  localStorage.removeItem("googleAccessToken");
  localStorage.removeItem("googleTokenExpiry");
  
  // Clear the refresh timer
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
  
  window.google.accounts.oauth2.revoke(token, () => {
    setStatus("Signed out");
    authHandler(false);
  });
}

async function refreshTokenIfNeeded() {
  // If token is expired or about to expire, try to refresh
  const now = Date.now();
  if (tokenExpiryTime && now >= tokenExpiryTime - (60 * 1000)) { // Within 1 minute of expiry
    return new Promise((resolve) => {
      if (!tokenClient) {
        resolve(false);
        return;
      }
      // Store original callback
      const originalCallback = tokenClient.callback;
      // Temporarily override to wait for refresh
      const tempCallback = (response) => {
        if (response && response.access_token) {
          const expiresIn = response.expires_in || 3600;
          setTokenAndScheduleRefresh(response.access_token, expiresIn);
          resolve(true);
        } else {
          resolve(false);
        }
        // Restore original callback
        if (originalCallback) {
          tokenClient.callback = originalCallback;
        }
      };
      tokenClient.callback = tempCallback;
      tokenClient.requestAccessToken({ prompt: "" });
    });
  }
  return true;
}

async function findFileId() {
  const query = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=${query}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error("Unable to list files");
  }
  const data = await response.json();
  return data.files && data.files.length ? data.files[0].id : null;
}

async function uploadContent(content) {
  const fileId = await findFileId();
  
  // Only include parents when creating a new file (POST)
  // For updates (PATCH), parents field is not allowed
  const metadata = fileId 
    ? { name: FILE_NAME }
    : { name: FILE_NAME, parents: ["appDataFolder"] };
    
  const boundary = `flow_${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    `${content}\r\n` +
    `--${boundary}--`;

  const uploadUrl = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const response = await fetch(uploadUrl, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DRIVE] Upload failed:', response.status, response.statusText);
    console.error('[DRIVE] Error response:', errorText);
    throw new Error(`Unable to save file: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

export async function saveToDrive(payload) {
  if (!accessToken) {
    console.error('[DRIVE] No access token');
    setStatus("Sign in to save");
    return false;
  }
  
  console.log('[DRIVE] saveToDrive - payload has', payload.length, 'tasks');
  console.log('[DRIVE] Access token exists:', accessToken ? 'yes' : 'no');
  console.log('[DRIVE] Token expiry:', tokenExpiryTime ? new Date(tokenExpiryTime).toLocaleString() : 'not set');
  
  // Refresh token if needed
  const refreshed = await refreshTokenIfNeeded();
  console.log('[DRIVE] Token refresh check:', refreshed);
  
  try {
    await uploadContent(JSON.stringify(payload, null, 2));
    console.log('[DRIVE] Save successful');
    setStatus("Saved to Google Drive");
    return true;
  } catch (error) {
    console.error('[DRIVE] Save failed:', error);
    console.error('[DRIVE] Error message:', error.message);
    console.error('[DRIVE] Error stack:', error.stack);
    setStatus("Save failed: " + error.message);
    return false;
  }
}

export async function loadFromDrive() {
  if (!accessToken) {
    setStatus("Sign in to load");
    return null;
  }
  
  // Refresh token if needed
  await refreshTokenIfNeeded();
  
  try {
    const fileId = await findFileId();
    if (!fileId) {
      setStatus("No saved file found");
      return null;
    }
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (!response.ok) {
      throw new Error("Unable to load file");
    }
    const data = await response.json();
    setStatus("Loaded from Google Drive");
    return data;
  } catch (error) {
    setStatus("Load failed");
    return null;
  }
}

const CLIENT_ID =
  "256449869367-57edh8eio8ulu6nipc0i4g0mt23dbjm3.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";

let tokenClient = null;
let accessToken = "";
let tokenExpiryTime = null;
let refreshTimerId = null;
let authHandler = () => {};

function scheduleTokenRefresh() {
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }

  if (!tokenExpiryTime) {
    return;
  }

  const now = Date.now();
  const timeUntilExpiry = tokenExpiryTime - now;
  const refreshBuffer = 5 * 60 * 1000; // 5 minutes
  const timeUntilRefresh = Math.max(0, timeUntilExpiry - refreshBuffer);

  refreshTimerId = setTimeout(() => {
    if (accessToken && tokenClient) {
      tokenClient.requestAccessToken({ prompt: "" });
    }
  }, timeUntilRefresh);
}

function setTokenAndScheduleRefresh(token, expiresIn = 3600) {
  accessToken = token;
  tokenExpiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem("googleAccessToken", token);
  localStorage.setItem("googleTokenExpiry", tokenExpiryTime.toString());
  scheduleTokenRefresh();
}

export function initAuth(onAuth) {
  authHandler = onAuth || (() => {});
  if (!window.google?.accounts?.oauth2) {
    return false;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response?.access_token) {
        const expiresIn = response.expires_in || 3600;
        setTokenAndScheduleRefresh(response.access_token, expiresIn);
        authHandler(true);
      }
    }
  });

  // Restore token from localStorage
  const storedToken = localStorage.getItem("googleAccessToken");
  const storedExpiry = localStorage.getItem("googleTokenExpiry");

  if (storedToken && storedExpiry) {
    const expiryTime = parseInt(storedExpiry, 10);
    const now = Date.now();

    if (expiryTime > now) {
      accessToken = storedToken;
      tokenExpiryTime = expiryTime;
      scheduleTokenRefresh();
      authHandler(true);
      return true;
    } else {
      localStorage.removeItem("googleAccessToken");
      localStorage.removeItem("googleTokenExpiry");
    }
  }

  return true;
}

export function isAuthenticated() {
  return Boolean(accessToken);
}

export function getToken() {
  return accessToken;
}

export function requestSignIn() {
  if (!tokenClient) {
    return;
  }
  tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
}

export function signOut() {
  if (!accessToken) {
    authHandler(false);
    return;
  }

  const token = accessToken;
  accessToken = "";
  tokenExpiryTime = null;

  localStorage.removeItem("googleAccessToken");
  localStorage.removeItem("googleTokenExpiry");

  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }

  window.google.accounts.oauth2.revoke(token, () => {
    authHandler(false);
  });
}

export async function refreshTokenIfNeeded() {
  const now = Date.now();
  if (tokenExpiryTime && now >= tokenExpiryTime - 60 * 1000) {
    return new Promise((resolve) => {
      if (!tokenClient) {
        resolve(false);
        return;
      }
      const originalCallback = tokenClient.callback;
      const tempCallback = (response) => {
        if (response?.access_token) {
          const expiresIn = response.expires_in || 3600;
          setTokenAndScheduleRefresh(response.access_token, expiresIn);
          resolve(true);
        } else {
          resolve(false);
        }
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

const CLIENT_ID =
  "256449869367-57edh8eio8ulu6nipc0i4g0mt23dbjm3.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "flow-tasks.json";

let tokenClient = null;
let accessToken = "";
let statusHandler = () => {};
let authHandler = () => {};

function setStatus(message) {
  if (statusHandler) {
    statusHandler(message);
  }
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
        accessToken = response.access_token;
        setStatus("Signed in");
        authHandler(true);
      }
    }
  });
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
  window.google.accounts.oauth2.revoke(token, () => {
    setStatus("Signed out");
    authHandler(false);
  });
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
  const metadata = {
    name: FILE_NAME,
    parents: ["appDataFolder"]
  };
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
    throw new Error("Unable to save file");
  }
}

export async function saveToDrive(payload) {
  if (!accessToken) {
    setStatus("Sign in to save");
    return false;
  }
  try {
    await uploadContent(JSON.stringify(payload, null, 2));
    setStatus("Saved to Google Drive");
    return true;
  } catch (error) {
    setStatus("Save failed");
    return false;
  }
}

export async function loadFromDrive() {
  if (!accessToken) {
    setStatus("Sign in to load");
    return null;
  }
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

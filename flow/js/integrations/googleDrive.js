import {
  initAuth,
  isAuthenticated,
  requestSignIn,
  signOut,
  refreshTokenIfNeeded
} from "./googleAuth.js";
import { saveFile, loadFile } from "./driveOperations.js";

let statusHandler = () => {};

function setStatus(message) {
  if (statusHandler) {
    statusHandler(message);
  }
}

export function initGoogleDrive(onStatus, onAuth) {
  statusHandler = onStatus || (() => {});
  const initialized = initAuth((signedIn) => {
    setStatus(signedIn ? "Signed in" : "Not signed in");
    if (onAuth) {
      onAuth(signedIn);
    }
  });
  
  if (initialized && !isAuthenticated()) {
    setStatus("Not signed in");
  }
  
  return initialized;
}

export function isSignedIn() {
  return isAuthenticated();
}

export { requestSignIn };

export function signOutFromDrive() {
  signOut();
  setStatus("Signed out");
}

export async function saveToDrive(payload) {
  if (!isAuthenticated()) {
    console.error("[DRIVE] No access token");
    setStatus("Sign in to save");
    return false;
  }

  console.log("[DRIVE] saveToDrive - payload has", payload.length, "tasks");

  await refreshTokenIfNeeded();

  try {
    await saveFile(payload);
    setStatus("Saved to Google Drive");
    return true;
  } catch (error) {
    setStatus("Save failed: " + error.message);
    return false;
  }
}

export async function loadFromDrive() {
  if (!isAuthenticated()) {
    setStatus("Sign in to load");
    return null;
  }

  await refreshTokenIfNeeded();

  try {
    const data = await loadFile();
    if (!data) {
      setStatus("No saved file found");
      return null;
    }
    setStatus("Loaded from Google Drive");
    return data;
  } catch (error) {
    setStatus("Load failed");
    return null;
  }
}

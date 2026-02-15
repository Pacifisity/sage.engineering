import {
  initGoogleDrive,
  isSignedIn,
  loadFromDrive,
  requestSignIn,
  saveToDrive,
  signOut
} from "../integrations/googleDrive.js";
import { normalizeTask } from "../core/data.js";

const SYNC_DELAY_MS = 900;

export function createGoogleSync({ getTasks, setTasks, renderAll, setAuthState }) {
  let syncTimer = null;
  let didInitialSync = false;

  function summarize(list) {
    const count = list.length;
    const completed = list.filter((item) => item.completed).length;
    const latest = list.reduce((max, item) => {
      const stamp = item.updatedAt || item.createdAt || 0;
      return Math.max(max, stamp);
    }, 0);
    const latestLabel = latest ? new Date(latest).toLocaleString() : "-";
    return { count, completed, latestLabel };
  }

  function fingerprint(list) {
    const normalized = list
      .map((item) => ({
        id: item.id,
        name: item.name,
        priority: item.priority,
        startDate: item.startDate || null,
        dueDate: item.dueDate || null,
        createdAt: item.createdAt || 0,
        updatedAt: item.updatedAt || 0,
        completed: Boolean(item.completed)
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return JSON.stringify(normalized);
  }

  function updateAuthState() {
    if (setAuthState) {
      setAuthState(isSignedIn());
    }
  }

  async function handleInitialSync() {
    if (didInitialSync) {
      return;
    }
    didInitialSync = true;
    const cloudData = await loadFromDrive();
    if (!Array.isArray(cloudData)) {
      scheduleSync();
      return;
    }
    const cloudTasks = cloudData.map(normalizeTask);
    const localTasks = getTasks();
    const localFingerprint = fingerprint(localTasks);
    const cloudFingerprint = fingerprint(cloudTasks);
    if (localFingerprint === cloudFingerprint) {
      return;
    }
    const localInfo = summarize(localTasks);
    const cloudInfo = summarize(cloudTasks);
    const message =
      "Cloud data found. Choose which to keep:\n\n" +
      `Local: ${localInfo.count} tasks (${localInfo.completed} completed), updated ${localInfo.latestLabel}\n` +
      `Cloud: ${cloudInfo.count} tasks (${cloudInfo.completed} completed), updated ${cloudInfo.latestLabel}\n\n` +
      "OK = use cloud data, Cancel = keep local and overwrite cloud.";
    const useCloud = window.confirm(message);
    if (useCloud) {
      setTasks(cloudTasks, false);
      renderAll();
    } else {
      scheduleSync();
    }
  }

  function scheduleSync() {
    if (!isSignedIn()) {
      return;
    }
    if (syncTimer) {
      clearTimeout(syncTimer);
    }
    syncTimer = setTimeout(async () => {
      await saveToDrive(getTasks());
    }, SYNC_DELAY_MS);
  }

  function initGoogle() {
    if (!initGoogleDrive(updateAuthState, (signedIn) => {
      updateAuthState();
      if (signedIn) {
        handleInitialSync();
      }
    })) {
      updateAuthState();
      setTimeout(initGoogle, 500);
    }
  }

  function handleAuthClick() {
    if (isSignedIn()) {
      signOut();
      didInitialSync = false;
      updateAuthState();
    } else {
      requestSignIn();
    }
  }

  return {
    initGoogle,
    handleAuthClick,
    scheduleSync,
    updateAuthState
  };
}

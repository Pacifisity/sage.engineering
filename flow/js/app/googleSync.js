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

export function createGoogleSync({ getTasks, setTasks, renderAll, setAuthState, resolveConflict }) {
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
      console.log('[SYNC] Already did initial sync, skipping');
      return;
    }
    console.log('[SYNC] Starting initial sync...');
    didInitialSync = true;
    const cloudData = await loadFromDrive();
    if (!Array.isArray(cloudData)) {
      console.log('[SYNC] No cloud data found, uploading local tasks');
      const local = getTasks();
      console.log('[SYNC] Uploading tasks:', local.length, 'tasks');
      await saveToDrive(local);
      return;
    }
    
    console.log('[SYNC] Cloud data loaded:', cloudData.length, 'tasks');
    
    // Get current local tasks (already normalized once on page load)
    const localTasks = getTasks();
    console.log('[SYNC] Local tasks:', localTasks.length, 'tasks');
    
    // Create fingerprints - normalize cloudData temporarily ONLY for comparison
    // Do NOT store this normalized version anywhere
    const localFingerprint = fingerprint(localTasks);
    const cloudFingerprint = fingerprint(cloudData.map(normalizeTask));
    
    console.log('[SYNC] Local fingerprint:', localFingerprint.substring(0, 100) + '...');
    console.log('[SYNC] Cloud fingerprint:', cloudFingerprint.substring(0, 100) + '...');
    console.log('[SYNC] Fingerprints match:', localFingerprint === cloudFingerprint);
    
    if (localFingerprint === cloudFingerprint) {
      console.log('[SYNC] Data matches, no sync needed');
      return;
    }
    
    console.log('[SYNC] CONFLICT DETECTED - fingerprints do not match');
    
    // Get summaries for conflict UI - use raw cloudData with temp normalization
    const localInfo = summarize(localTasks);
    const cloudInfo = summarize(cloudData.map(normalizeTask));
    
    // Resolve conflict with RAW data (setTasks will normalize)
    let chosenData;
    if (resolveConflict) {
      console.log('[SYNC] Showing conflict resolution UI');
      const result = await resolveConflict(
        localTasks, 
        cloudData.map(normalizeTask), // temp normalize for display only
        localInfo, 
        cloudInfo
      );
      console.log('[SYNC] User chose:', result.action);
      if (result.action === "cloud") {
        chosenData = cloudData; // RAW cloud data
      } else if (result.action === "merge" && Array.isArray(result.mergedTasks)) {
        chosenData = result.mergedTasks; // merge result
      } else {
        chosenData = localTasks; // local data (already normalized)
      }
    } else {
      const useCloud = window.confirm("Cloud data found. Use cloud data?");
      console.log('[SYNC] User chose:', useCloud ? 'cloud' : 'local');
      chosenData = useCloud ? cloudData : localTasks;
    }
    
    console.log('[SYNC] Chosen data:', chosenData.length, 'tasks');
    console.log('[SYNC] First task before setTasks:', JSON.stringify(chosenData[0]));
    
    // setTasks will normalize chosenData, save to localStorage, and render
    setTasks(chosenData, false);
    
    const afterSetTasks = getTasks();
    console.log('[SYNC] After setTasks, first task:', JSON.stringify(afterSetTasks[0]));
    console.log('[SYNC] Saving to Drive:', afterSetTasks.length, 'tasks');
    
    // Save to Drive whatever is now in localStorage (via getTasks)
    await saveToDrive(afterSetTasks);
    console.log('[SYNC] Initial sync complete');
  }

  async function syncNow() {
    if (!isSignedIn()) {
      console.log('[SYNC] Not signed in, skipping sync');
      return;
    }
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    const tasks = getTasks();
    console.log('[SYNC] syncNow() - saving', tasks.length, 'tasks to Drive');
    console.log('[SYNC] First task:', JSON.stringify(tasks[0]));
    await saveToDrive(tasks);
    console.log('[SYNC] syncNow() complete');
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
    syncNow,
    updateAuthState
  };
}

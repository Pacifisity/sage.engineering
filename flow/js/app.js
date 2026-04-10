import { setActiveView } from "./core/ui.js";
import { setupFileHandlers } from "./integrations/fileIO.js";
import { createGoogleSync } from "./app/googleSync.js";
import { createTaskManager } from "./app/tasks.js";
import { createFocusTimer } from "./app/focusTimer.js";
import { loadFocusQuote, updateQuoteToggleButton } from "./app/quoteManager.js";
import { resolveSyncConflict } from "./app/conflictUI.js";
import { setAuthButtonState } from "./app/profilePanel.js";
import { setupEventHandlers, updateScheduleWeekLabel } from "./app/eventHandlers.js";
import { initFocusNotes, setupFocusNotesEvents } from "./app/focusNotes.js";
import { initTheme, updateThemeToggleButton } from "./app/themeManager.js";

const dom = {
  tasksList: document.getElementById("tasksList"),
  backlogList: document.getElementById("backlogList"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  profileBtn: document.getElementById("profileBtn"),
  profilePanel: document.getElementById("profilePanel"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  googleBtn: document.getElementById("googleBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  quoteToggleBtn: document.getElementById("quoteToggleBtn"),
  searchInput: document.getElementById("searchInput"),
  backlogSearchInput: document.getElementById("backlogSearchInput"),
  navButtons: Array.from(document.querySelectorAll(".nav-btn")),
  tasksView: document.getElementById("tasksView"),
  backlogView: document.getElementById("backlogView"),
  scheduleView: document.getElementById("scheduleView"),
  scheduleDays: document.getElementById("scheduleDays"),
  scheduleGrid: document.getElementById("scheduleGrid"),
  scheduleWeekLabel: document.getElementById("scheduleWeekLabel"),
  schedulePrev: document.getElementById("schedulePrev"),
  scheduleNext: document.getElementById("scheduleNext"),
  focusView: document.getElementById("focusView"),
  focusTask: document.getElementById("focusTask"),
  focusNotes: document.getElementById("focusNotes"),
  focusQuote: document.getElementById("focusQuote"),
  focusTimerDisplay: document.getElementById("focusTimerDisplay"),
  focusTimerReset: document.getElementById("focusTimerReset"),
  focusStart: document.getElementById("focusStart"),
  breakStart: document.getElementById("breakStart"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  closeModal: document.getElementById("closeModal"),
  taskForm: document.getElementById("taskForm"),
  modalTitle: document.getElementById("modalTitle"),
  taskName: document.getElementById("taskName"),
  taskPriority: document.getElementById("taskPriority"),
  taskStart: document.getElementById("taskStart"),
  taskDue: document.getElementById("taskDue"),
  taskNotes: document.getElementById("taskNotes"),
  deleteTaskBtn: document.getElementById("deleteTaskBtn"),
  syncModalBackdrop: document.getElementById("syncModalBackdrop"),
  syncLocalSummary: document.getElementById("syncLocalSummary"),
  syncCloudSummary: document.getElementById("syncCloudSummary"),
  syncKeepLocal: document.getElementById("syncKeepLocal"),
  syncUseCloud: document.getElementById("syncUseCloud"),
  syncMerge: document.getElementById("syncMerge"),
  mergeModalBackdrop: document.getElementById("mergeModalBackdrop"),
  mergeList: document.getElementById("mergeList"),
  mergeClose: document.getElementById("mergeClose"),
  mergeCancel: document.getElementById("mergeCancel"),
  mergeApply: document.getElementById("mergeApply")
};

const taskManager = createTaskManager(dom, () => googleSync.scheduleSync());
const googleSync = createGoogleSync({
  getTasks: taskManager.getTasks,
  setTasks: taskManager.setTasks,
  renderAll: taskManager.renderAll,
  setAuthState: (signedIn) => setAuthButtonState(dom, signedIn),
  resolveConflict: (localTasks, cloudTasks, localInfo, cloudInfo) =>
    resolveSyncConflict(dom, localTasks, cloudTasks, localInfo, cloudInfo)
});
const focusTimer = createFocusTimer(dom);

dom.scheduleWeekOffset = 0;

// File import/export
setupFileHandlers({
  exportBtn: dom.exportBtn,
  importBtn: dom.importBtn,
  importFile: dom.importFile,
  onExport: () => taskManager.getTasks(),
  onImport: async (incoming) => {
    taskManager.setTasks(incoming, false);
    await googleSync.syncNow();
  }
});

// Setup all event handlers
setupEventHandlers(dom, taskManager, googleSync, focusTimer);
initFocusNotes(taskManager);
setupFocusNotesEvents();

// Initialize
googleSync.initGoogle();
loadFocusQuote(dom, () => taskManager.renderAll());
taskManager.renderAll();
updateScheduleWeekLabel(dom);
const savedView = localStorage.getItem("activeView") || "focus";
setActiveView(
  savedView,
  {
    tasks: dom.tasksView,
    backlog: dom.backlogView,
    schedule: dom.scheduleView,
    focus: dom.focusView
  },
  dom.navButtons
);
setAuthButtonState(dom, false);
initTheme();
updateThemeToggleButton(dom.themeToggleBtn);
updateQuoteToggleButton(dom.quoteToggleBtn);
focusTimer.updateDisplay();

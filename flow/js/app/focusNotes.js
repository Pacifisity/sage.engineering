let taskManager;
let saveTimeout;

export function initFocusNotes(taskMgrRef) {
  taskManager = taskMgrRef;
}

export function setupFocusNotesEvents() {
  document.addEventListener("input", handleNotesInput);
}

function handleNotesInput(e) {
  const textarea = e.target.closest("#focusNotesInput");
  if (!textarea) return;

  const taskId = textarea.getAttribute("data-task-id");
  if (!taskId) return;

  // Clear existing timeout
  if (saveTimeout) clearTimeout(saveTimeout);

  // Auto-save after 1 second of inactivity
  saveTimeout = setTimeout(() => {
    const notes = textarea.value.trim();
    taskManager.updateTask(taskId, { notes });
  }, 1000);
}

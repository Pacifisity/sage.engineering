import { setActiveView, toggleHidden } from "./core/ui.js";
import { setupFileHandlers } from "./integrations/fileIO.js";
import { createGoogleSync } from "./app/googleSync.js";
import { createTaskManager } from "./app/tasks.js";

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
  searchInput: document.getElementById("searchInput"),
  backlogSearchInput: document.getElementById("backlogSearchInput"),
  navButtons: Array.from(document.querySelectorAll(".nav-btn")),
  tasksView: document.getElementById("tasksView"),
  backlogView: document.getElementById("backlogView"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  closeModal: document.getElementById("closeModal"),
  taskForm: document.getElementById("taskForm"),
  modalTitle: document.getElementById("modalTitle"),
  taskName: document.getElementById("taskName"),
  taskPriority: document.getElementById("taskPriority"),
  taskStart: document.getElementById("taskStart"),
  taskDue: document.getElementById("taskDue"),
  deleteTaskBtn: document.getElementById("deleteTaskBtn")
};

function setAuthButtonState(signedIn) {
  if (!dom.googleBtn) {
    return;
  }
  dom.googleBtn.textContent = signedIn ? "Sign out" : "Sign in";
  dom.googleBtn.classList.toggle("auth-signin", !signedIn);
  dom.googleBtn.classList.toggle("auth-signout", signedIn);
}

const taskManager = createTaskManager(dom, () => googleSync.scheduleSync());
const googleSync = createGoogleSync({
  getTasks: taskManager.getTasks,
  setTasks: taskManager.setTasks,
  renderAll: taskManager.renderAll,
  setAuthState: setAuthButtonState
});

if (dom.addTaskBtn) {
  dom.addTaskBtn.addEventListener("click", () => taskManager.openModal());
}

if (dom.closeModal) {
  dom.closeModal.addEventListener("click", () => taskManager.closeModalWindow());
}

if (dom.modalBackdrop) {
  dom.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === dom.modalBackdrop) {
      taskManager.closeModalWindow();
    }
  });
}

if (dom.navButtons.length) {
  dom.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.view, {
        tasks: dom.tasksView,
        backlog: dom.backlogView
      }, dom.navButtons);
    });
  });
}

if (dom.profileBtn) {
  dom.profileBtn.addEventListener("click", () => {
    toggleHidden(dom.profilePanel, dom.profilePanel.classList.contains("hidden"));
  });
}

if (dom.googleBtn) {
  dom.googleBtn.addEventListener("click", () => {
    googleSync.handleAuthClick();
  });
}

if (dom.searchInput) {
  dom.searchInput.addEventListener("input", (event) => {
    taskManager.setSearchQuery(event.target.value);
  });
}

if (dom.backlogSearchInput) {
  dom.backlogSearchInput.addEventListener("input", (event) => {
    taskManager.setBacklogSearchQuery(event.target.value);
  });
}

document.addEventListener("click", (event) => {
  if (!dom.profilePanel.contains(event.target) && !dom.profileBtn.contains(event.target)) {
    if (!dom.profilePanel.classList.contains("hidden")) {
      toggleHidden(dom.profilePanel, false);
    }
  }
});

if (dom.taskForm) {
  dom.taskForm.addEventListener("submit", (event) => {
    taskManager.handleTaskFormSubmit(event);
  });
}

if (dom.backlogList) {
  dom.backlogList.addEventListener("click", (event) => {
    taskManager.handleBacklogListClick(event);
  });
}

if (dom.tasksList) {
  dom.tasksList.addEventListener("click", (event) => {
    taskManager.handleTasksListClick(event);
  });
}

if (dom.deleteTaskBtn) {
  dom.deleteTaskBtn.addEventListener("click", () => {
    taskManager.handleDeleteFromModal();
  });
}

setupFileHandlers({
  exportBtn: dom.exportBtn,
  importBtn: dom.importBtn,
  importFile: dom.importFile,
  onExport: () => taskManager.getTasks(),
  onImport: (incoming) => {
    taskManager.setTasks(incoming, true);
  }
});

taskManager.renderAll();
setActiveView("tasks", { tasks: dom.tasksView, backlog: dom.backlogView }, dom.navButtons);
setAuthButtonState(false);

googleSync.initGoogle();

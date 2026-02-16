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
  scheduleView: document.getElementById("scheduleView"),
  scheduleDays: document.getElementById("scheduleDays"),
  scheduleGrid: document.getElementById("scheduleGrid"),
  schedulePrev: document.getElementById("schedulePrev"),
  scheduleNext: document.getElementById("scheduleNext"),
  focusView: document.getElementById("focusView"),
  focusTask: document.getElementById("focusTask"),
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

function setAuthButtonState(signedIn) {
  if (!dom.googleBtn) {
    return;
  }
  dom.googleBtn.textContent = signedIn ? "Sign out" : "Sign in";
  dom.googleBtn.classList.toggle("auth-signin", !signedIn);
  dom.googleBtn.classList.toggle("auth-signout", signedIn);
}

function showSyncModal(localInfo, cloudInfo) {
  return new Promise((resolve) => {
    if (!dom.syncModalBackdrop) {
      resolve({ action: "local" });
      return;
    }
    dom.syncLocalSummary.textContent =
      `${localInfo.count} tasks, ${localInfo.completed} completed` +
      ` · Updated ${localInfo.latestLabel}`;
    dom.syncCloudSummary.textContent =
      `${cloudInfo.count} tasks, ${cloudInfo.completed} completed` +
      ` · Updated ${cloudInfo.latestLabel}`;

    dom.syncModalBackdrop.classList.remove("hidden");
    dom.syncModalBackdrop.setAttribute("aria-hidden", "false");

    const cleanup = () => {
      dom.syncModalBackdrop.classList.add("hidden");
      dom.syncModalBackdrop.setAttribute("aria-hidden", "true");
      dom.syncKeepLocal.onclick = null;
      dom.syncUseCloud.onclick = null;
      dom.syncMerge.onclick = null;
    };

    dom.syncKeepLocal.onclick = () => {
      cleanup();
      resolve({ action: "local" });
    };
    dom.syncUseCloud.onclick = () => {
      cleanup();
      resolve({ action: "cloud" });
    };
    dom.syncMerge.onclick = () => {
      cleanup();
      resolve({ action: "merge" });
    };
  });
}

function formatDateRange(task) {
  const start = task.startDate || "-";
  const due = task.dueDate || "-";
  return `Start: ${start} · Due: ${due}`;
}

function showMergeModal(conflicts) {
  return new Promise((resolve) => {
    if (!dom.mergeModalBackdrop || !dom.mergeList) {
      resolve(null);
      return;
    }
    dom.mergeList.innerHTML = "";
    conflicts.forEach((conflict, index) => {
      const item = document.createElement("div");
      item.className = "merge-item";
      item.innerHTML = `
        <div class="merge-title">${conflict.name}</div>
        <div class="merge-options">
          <label class="merge-option">
            <input type="radio" name="merge-${index}" value="local" ${conflict.defaultChoice === "local" ? "checked" : ""} />
            <div>Keep local</div>
            <div class="merge-meta">${formatDateRange(conflict.local)}</div>
          </label>
          <label class="merge-option">
            <input type="radio" name="merge-${index}" value="cloud" ${conflict.defaultChoice === "cloud" ? "checked" : ""} />
            <div>Keep cloud</div>
            <div class="merge-meta">${formatDateRange(conflict.cloud)}</div>
          </label>
        </div>
      `;
      dom.mergeList.appendChild(item);
    });

    dom.mergeModalBackdrop.classList.remove("hidden");
    dom.mergeModalBackdrop.setAttribute("aria-hidden", "false");

    const cleanup = () => {
      dom.mergeModalBackdrop.classList.add("hidden");
      dom.mergeModalBackdrop.setAttribute("aria-hidden", "true");
      dom.mergeApply.onclick = null;
      dom.mergeCancel.onclick = null;
      dom.mergeClose.onclick = null;
    };

    const cancel = () => {
      cleanup();
      resolve(null);
    };

    dom.mergeCancel.onclick = cancel;
    dom.mergeClose.onclick = cancel;
    dom.mergeApply.onclick = () => {
      const selections = conflicts.map((conflict, idx) => {
        const selected = dom.mergeList.querySelector(
          `input[name="merge-${idx}"]:checked`
        );
        return {
          id: conflict.id,
          choice: selected ? selected.value : conflict.defaultChoice
        };
      });
      cleanup();
      resolve(selections);
    };
  });
}

async function resolveSyncConflict(localTasks, cloudTasks, localInfo, cloudInfo) {
  const choice = await showSyncModal(localInfo, cloudInfo);
  if (choice.action !== "merge") {
    return { action: choice.action };
  }

  const localMap = new Map(localTasks.map((task) => [task.id, task]));
  const cloudMap = new Map(cloudTasks.map((task) => [task.id, task]));
  const merged = [];
  const conflicts = [];

  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
  allIds.forEach((id) => {
    const local = localMap.get(id);
    const cloud = cloudMap.get(id);
    if (local && cloud) {
      const datesMatch = (local.startDate || null) === (cloud.startDate || null) &&
        (local.dueDate || null) === (cloud.dueDate || null);
      if (datesMatch) {
        const localStamp = local.updatedAt || local.createdAt || 0;
        const cloudStamp = cloud.updatedAt || cloud.createdAt || 0;
        merged.push(localStamp >= cloudStamp ? local : cloud);
      } else {
        const localStamp = local.updatedAt || local.createdAt || 0;
        const cloudStamp = cloud.updatedAt || cloud.createdAt || 0;
        conflicts.push({
          id,
          name: local.name || cloud.name,
          local,
          cloud,
          defaultChoice: localStamp >= cloudStamp ? "local" : "cloud"
        });
      }
    } else if (local) {
      merged.push(local);
    } else if (cloud) {
      merged.push(cloud);
    }
  });

  if (conflicts.length === 0) {
    return { action: "merge", mergedTasks: merged };
  }

  const selections = await showMergeModal(conflicts);
  if (!selections) {
    return { action: "local" };
  }

  selections.forEach((selection) => {
    const conflict = conflicts.find((item) => item.id === selection.id);
    if (!conflict) {
      return;
    }
    merged.push(selection.choice === "cloud" ? conflict.cloud : conflict.local);
  });

  return { action: "merge", mergedTasks: merged };
}

const taskManager = createTaskManager(dom, () => googleSync.scheduleSync());
const googleSync = createGoogleSync({
  getTasks: taskManager.getTasks,
  setTasks: taskManager.setTasks,
  renderAll: taskManager.renderAll,
  setAuthState: setAuthButtonState,
  resolveConflict: resolveSyncConflict
});

let scheduleWeekOffset = 0;
dom.scheduleWeekOffset = scheduleWeekOffset;

const focusTimer = {
  focusSeconds: 50 * 60,
  breakSeconds: 10 * 60,
  remainingSeconds: 0,
  intervalId: null,
  running: false,
  mode: "focus"
};

function formatFocusTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function updateFocusTimerDisplay() {
  if (dom.focusTimerDisplay) {
    dom.focusTimerDisplay.textContent = formatFocusTime(focusTimer.remainingSeconds);
  }
}

function stopFocusTimer() {
  if (focusTimer.intervalId) {
    clearInterval(focusTimer.intervalId);
    focusTimer.intervalId = null;
  }
  focusTimer.running = false;
}

function startFocusTimer() {
  if (focusTimer.running) {
    return;
  }
  focusTimer.running = true;
  focusTimer.intervalId = setInterval(() => {
    focusTimer.remainingSeconds -= 1;
    if (focusTimer.remainingSeconds <= 0) {
      focusTimer.remainingSeconds = 0;
      stopFocusTimer();
    }
    updateFocusTimerDisplay();
  }, 1000);
}

function setTimerMode(mode) {
  focusTimer.mode = mode;
  focusTimer.remainingSeconds = mode === "break" ? focusTimer.breakSeconds : focusTimer.focusSeconds;
  updateFocusTimerDisplay();
}

function animateSchedule(direction) {
  if (!dom.scheduleGrid) {
    return;
  }
  dom.scheduleGrid.classList.remove("animate-week", "animate-left", "animate-right");
  void dom.scheduleGrid.offsetWidth;
  dom.scheduleGrid.classList.add("animate-week");
  if (direction === "left") {
    dom.scheduleGrid.classList.add("animate-left");
  }
  if (direction === "right") {
    dom.scheduleGrid.classList.add("animate-right");
  }
}

async function loadFocusQuote() {
  if (!dom.focusQuote) {
    return;
  }
  const setQuote = (quote, author) => {
    const authorLine = (author && author !== "Flow") ? `<span>— ${author}</span>` : "";
    dom.focusQuote.innerHTML = `${quote}${authorLine}`;
  };
  const fallbackText = () => {
    setQuote(
      "Focus on the next small step. You are closer than you think.",
      ""
    );
  };

  const fetchQuote = async (url, transform) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Quote request failed");
    }
    const data = await response.json();
    return transform(data);
  };

  try {
    const localQuotes = await fetchQuote("data/quotes.json", (data) => data);
    if (!Array.isArray(localQuotes) || localQuotes.length === 0) {
      throw new Error("No local quotes");
    }
    // Calculate day of year (1-365/366)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    // Find quote for today, or fallback to first quote
    const localEntry = localQuotes.find((q) => q.day === dayOfYear) || localQuotes[0];
    setQuote(localEntry.quote, localEntry.author || "");
  } catch (error) {
    fallbackText();
  }
}

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
        backlog: dom.backlogView,
        schedule: dom.scheduleView,
        focus: dom.focusView
      }, dom.navButtons);
      if (button.dataset.view === "schedule") {
        taskManager.renderAll();
        animateSchedule();
      }
    });
  });
}

if (dom.schedulePrev) {
  dom.schedulePrev.addEventListener("click", () => {
    scheduleWeekOffset -= 1;
    dom.scheduleWeekOffset = scheduleWeekOffset;
    taskManager.renderAll();
    animateSchedule("right");
  });
}

if (dom.scheduleNext) {
  dom.scheduleNext.addEventListener("click", () => {
    scheduleWeekOffset += 1;
    dom.scheduleWeekOffset = scheduleWeekOffset;
    taskManager.renderAll();
    animateSchedule("left");
  });
}

if (dom.focusTask) {
  dom.focusTask.addEventListener("click", (event) => {
    taskManager.handleFocusClick(event);
  });
}

if (dom.focusTimerReset) {
  dom.focusTimerReset.addEventListener("click", () => {
    stopFocusTimer();
    focusTimer.remainingSeconds = 0;
    updateFocusTimerDisplay();
  });
}

if (dom.focusStart) {
  dom.focusStart.addEventListener("click", () => {
    stopFocusTimer();
    setTimerMode("focus");
    startFocusTimer();
  });
}

if (dom.breakStart) {
  dom.breakStart.addEventListener("click", () => {
    stopFocusTimer();
    setTimerMode("break");
    startFocusTimer();
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
  onImport: async (incoming) => {
    taskManager.setTasks(incoming, false);
    await googleSync.syncNow();
  }
});

taskManager.renderAll();
setActiveView("focus", {
  tasks: dom.tasksView,
  backlog: dom.backlogView,
  schedule: dom.scheduleView,
  focus: dom.focusView
}, dom.navButtons);
setAuthButtonState(false);
updateFocusTimerDisplay();

window.addEventListener("resize", () => {
  taskManager.renderAll();
});

googleSync.initGoogle();
loadFocusQuote();

import { setActiveView, toggleHidden } from "../core/ui.js";
import {
  loadFocusQuote,
  disableQuotes,
  enableQuotes,
  isQuoteDisabled,
  updateQuoteToggleButton
} from "./quoteManager.js";
import { toggleTheme, updateThemeToggleButton } from "./themeManager.js";
import { positionProfilePanel } from "./profilePanel.js";
import { animateSchedule } from "./scheduleAnimation.js";
import { getWeekStart, addDays, toLocalDateKey, formatDateLabel } from "../core/dateUtils.js";

export function updateScheduleWeekLabel(dom) {
  if (!dom.scheduleWeekLabel) {
    return;
  }
  
  const isMobile = window.innerWidth <= 480;
  const daysToShow = isMobile ? 3 : 7;
  
  const today = new Date();
  const startDate = addDays(today, (dom.scheduleWeekOffset || 0) * daysToShow);
  const endDate = addDays(startDate, daysToShow - 1);
  
  const startStr = formatDateLabel(toLocalDateKey(startDate));
  const endStr = formatDateLabel(toLocalDateKey(endDate));
  
  dom.scheduleWeekLabel.textContent = `${startStr} – ${endStr}`;
}

export function setupEventHandlers(dom, taskManager, googleSync, focusTimer) {
  // Task management
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

  if (dom.taskForm) {
    dom.taskForm.addEventListener("submit", (event) => {
      taskManager.handleTaskFormSubmit(event);
    });
  }

  if (dom.deleteTaskBtn) {
    dom.deleteTaskBtn.addEventListener("click", () => {
      taskManager.handleDeleteFromModal();
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

  if (dom.focusTask) {
    dom.focusTask.addEventListener("click", (event) => {
      taskManager.handleFocusClick(event);
    });
  }

  // Search
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

  // Navigation
  if (dom.navButtons.length) {
    dom.navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setActiveView(
          button.dataset.view,
          {
            tasks: dom.tasksView,
            backlog: dom.backlogView,
            schedule: dom.scheduleView,
            focus: dom.focusView
          },
          dom.navButtons
        );
        if (button.dataset.view === "schedule") {
          taskManager.renderAll();
          animateSchedule(dom);
          updateScheduleWeekLabel(dom);
        }
      });
    });
  }

  // Schedule week navigation
  if (dom.schedulePrev) {
    dom.schedulePrev.addEventListener("click", () => {
      dom.scheduleWeekOffset -= 1;
      taskManager.renderAll();
      animateSchedule(dom, "right");
      updateScheduleWeekLabel(dom);
    });
  }

  if (dom.scheduleNext) {
    dom.scheduleNext.addEventListener("click", () => {
      dom.scheduleWeekOffset += 1;
      taskManager.renderAll();
      animateSchedule(dom, "left");
      updateScheduleWeekLabel(dom);
    });
  }

  // Focus timer
  if (dom.focusTimerReset) {
    dom.focusTimerReset.addEventListener("click", () => {
      focusTimer.reset();
    });
  }

  if (dom.focusStart) {
    dom.focusStart.addEventListener("click", () => {
      focusTimer.stop();
      focusTimer.setMode("focus");
      focusTimer.start();
    });
  }

  if (dom.breakStart) {
    dom.breakStart.addEventListener("click", () => {
      focusTimer.stop();
      focusTimer.setMode("break");
      focusTimer.start();
    });
  }

  // Quote controls
  if (dom.focusQuote) {
    dom.focusQuote.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-quote-action]");
      if (!actionButton) {
        return;
      }
      const action = actionButton.dataset.quoteAction;
      if (action === "disable") {
        disableQuotes();
        dom.focusQuote.classList.add("hidden");
        dom.focusQuote.innerHTML = "";
        updateQuoteToggleButton(dom.quoteToggleBtn);
      }
    });
  }

  if (dom.quoteToggleBtn) {
    dom.quoteToggleBtn.addEventListener("click", () => {
      if (isQuoteDisabled()) {
        enableQuotes();
        loadFocusQuote(dom, () => taskManager.renderAll());
      } else {
        disableQuotes();
        dom.focusQuote.classList.add("hidden");
        dom.focusQuote.innerHTML = "";
        taskManager.renderAll();
      }
      updateQuoteToggleButton(dom.quoteToggleBtn);
    });
  }

  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener("click", () => {
      toggleTheme();
      updateThemeToggleButton(dom.themeToggleBtn);
    });
  }

  // Profile panel
  if (dom.profileBtn) {
    dom.profileBtn.addEventListener("click", () => {
      const shouldShow = dom.profilePanel.classList.contains("hidden");
      toggleHidden(dom.profilePanel, shouldShow);
      if (shouldShow) {
        requestAnimationFrame(() => positionProfilePanel(dom));
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (!dom.profilePanel.contains(event.target) && !dom.profileBtn.contains(event.target)) {
      if (!dom.profilePanel.classList.contains("hidden")) {
        toggleHidden(dom.profilePanel, false);
      }
    }
  });

  // Google auth
  if (dom.googleBtn) {
    dom.googleBtn.addEventListener("click", () => {
      googleSync.handleAuthClick();
    });
  }

  // Window resize
  window.addEventListener("resize", () => {
    taskManager.renderAll();
    positionProfilePanel(dom);
  });
}

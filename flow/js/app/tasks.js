import {
  getScore,
  isAvailable,
  loadTasks,
  normalizeTask,
  saveTasks
} from "../core/data.js";
import { fillForm, renderBacklog, renderFocus, renderSchedule, renderTasks } from "../core/ui.js";

export function createTaskManager(dom, onChange) {
  let tasks = loadTasks().map(normalizeTask);
  let editingId = null;
  let searchQuery = "";
  let backlogSearchQuery = "";

  function sortedTasks(list) {
    return [...list].sort((a, b) => getScore(b) - getScore(a));
  }

  function renderAll() {
    const filtered = tasks.filter((task) =>
      task.name.toLowerCase().includes(searchQuery)
    );
    const backlogFiltered = tasks.filter((task) =>
      task.name.toLowerCase().includes(backlogSearchQuery)
    );
    const available = sortedTasks(
      filtered.filter((task) => isAvailable(task) && !task.completed)
    );
    renderTasks(dom.tasksList, available);
    const backlog = [...backlogFiltered].sort((a, b) => b.createdAt - a.createdAt);
    renderBacklog(dom.backlogList, backlog);
    if (dom.scheduleGrid && dom.scheduleDays) {
      renderSchedule({
        days: dom.scheduleDays,
        grid: dom.scheduleGrid,
        weekOffset: dom.scheduleWeekOffset || 0
      }, tasks.filter((task) => !task.completed));
    }
    if (dom.focusTask) {
      const focusCandidate = sortedTasks(
        tasks.filter((task) => isAvailable(task) && !task.completed)
      )[0];
      renderFocus(dom.focusTask, focusCandidate || null);
    }
  }

  function openModal(task) {
    editingId = task ? task.id : null;
    dom.modalTitle.textContent = task ? "Edit task" : "New task";
    fillForm(
      {
        taskName: dom.taskName,
        taskPriority: dom.taskPriority,
        taskStart: dom.taskStart,
        taskDue: dom.taskDue
      },
      task
    );
    if (dom.deleteTaskBtn) {
      dom.deleteTaskBtn.classList.toggle("hidden", !editingId);
    }
    dom.modalBackdrop.classList.remove("hidden");
    dom.modalBackdrop.setAttribute("aria-hidden", "false");
    dom.taskName.focus();
  }

  function closeModalWindow() {
    dom.modalBackdrop.classList.add("hidden");
    dom.modalBackdrop.setAttribute("aria-hidden", "true");
    editingId = null;
  }

  function persist(nextTasks, shouldSync = true) {
    tasks = nextTasks.map(normalizeTask);
    saveTasks(tasks);
    renderAll();
    if (shouldSync && onChange) {
      onChange();
    }
  }

  function upsertTask(data) {
    if (editingId) {
      const updated = tasks.map((task) =>
        task.id === editingId
          ? { ...task, ...data, updatedAt: Date.now() }
          : task
      );
      persist(updated);
      return;
    }
    const now = Date.now();
    const nextTasks = [
      {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        completed: false,
        ...data
      },
      ...tasks
    ];
    persist(nextTasks);
  }

  function deleteTask(id) {
    persist(tasks.filter((task) => task.id !== id));
  }

  function completeTask(id) {
    const updated = tasks.map((task) =>
      task.id === id
        ? { ...task, completed: !task.completed, updatedAt: Date.now() }
        : task
    );
    persist(updated);
  }

  function handleTaskFormSubmit(event) {
    event.preventDefault();
    const payload = {
      name: dom.taskName.value.trim(),
      priority: dom.taskPriority.value,
      startDate: dom.taskStart.value || null,
      dueDate: dom.taskDue.value || null
    };
    if (!payload.name) {
      return;
    }
    upsertTask(payload);
    closeModalWindow();
  }

  function handleTasksListClick(event) {
    const completeId = event.target.getAttribute("data-complete");
    const editId = event.target.getAttribute("data-edit");
    if (completeId) {
      completeTask(completeId);
    }
    if (editId) {
      const task = tasks.find((item) => item.id === editId);
      if (task) {
        openModal(task);
      }
    }
  }

  function handleBacklogListClick(event) {
    const editId = event.target.getAttribute("data-edit");
    const completeId = event.target.getAttribute("data-complete");
    if (editId) {
      const task = tasks.find((item) => item.id === editId);
      if (task) {
        openModal(task);
      }
    }
    if (completeId) {
      completeTask(completeId);
    }
  }

  function handleDeleteFromModal() {
    if (editingId) {
      deleteTask(editingId);
      closeModalWindow();
    }
  }

  function handleFocusClick(event) {
    const completeId = event.target.getAttribute("data-focus-complete");
    const editId = event.target.getAttribute("data-focus-edit");
    if (completeId) {
      completeTask(completeId);
    }
    if (editId) {
      const task = tasks.find((item) => item.id === editId);
      if (task) {
        openModal(task);
      }
    }
  }

  function setSearchQuery(value) {
    searchQuery = value.trim().toLowerCase();
    renderAll();
  }

  function setBacklogSearchQuery(value) {
    backlogSearchQuery = value.trim().toLowerCase();
    renderAll();
  }

  function setTasks(list, shouldSync = false) {
    console.log('[TASKS] setTasks called with', list.length, 'tasks, shouldSync:', shouldSync);
    console.log('[TASKS] Before normalize:', JSON.stringify(list[0]));
    tasks = list.map(normalizeTask);
    console.log('[TASKS] After normalize:', JSON.stringify(tasks[0]));
    saveTasks(tasks);
    console.log('[TASKS] Saved to localStorage');
    renderAll();
    if (shouldSync && onChange) {
      console.log('[TASKS] Triggering onChange (scheduleSync)');
      onChange();
    }
  }

  function getTasks() {
    return tasks;
  }

  return {
    renderAll,
    openModal,
    closeModalWindow,
    handleTaskFormSubmit,
    handleTasksListClick,
    handleBacklogListClick,
    handleFocusClick,
    handleDeleteFromModal,
    setSearchQuery,
    setBacklogSearchQuery,
    setTasks,
    getTasks
  };
}

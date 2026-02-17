import {
  getScore,
  isAvailable,
  loadTasks,
  normalizeTask,
  saveTasks
} from "../core/data.js";
import { renderBacklog, renderFocus, renderSchedule, renderTasks, renderFocusNotes } from "../core/ui.js";
import { createTaskModal } from "./taskModal.js";

export function createTaskManager(dom, onChange) {
  let tasks = loadTasks().map(normalizeTask);
  let searchQuery = "";
  let backlogSearchQuery = "";

  const modal = createTaskModal(dom);

  function sortedTasks(list) {
    return [...list].sort((a, b) => {
      const scoreDiff = getScore(b) - getScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      // Tiebreaker: older tasks first
      return a.createdAt - b.createdAt;
    });
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
      renderSchedule(
        {
          days: dom.scheduleDays,
          grid: dom.scheduleGrid,
          weekOffset: dom.scheduleWeekOffset || 0
        },
        tasks.filter((task) => !task.completed)
      );
    }

    if (dom.focusTask) {
      const focusCandidate = sortedTasks(
        tasks.filter((task) => isAvailable(task) && !task.completed)
      )[0];
      renderFocus(dom.focusTask, focusCandidate || null);
      renderFocusNotes(dom.focusNotes, focusCandidate || null);
    }
  }

  function persist(nextTasks, shouldSync = true) {
    tasks = nextTasks.map(normalizeTask);
    saveTasks(tasks);
    renderAll();
    if (shouldSync && onChange) {
      onChange();
    }
  }

  function upsertTask(editingId, data) {
    if (editingId) {
      const updated = tasks.map((task) =>
        task.id === editingId ? { ...task, ...data, updatedAt: Date.now() } : task
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
      task.id === id ? { ...task, completed: !task.completed, updatedAt: Date.now() } : task
    );
    persist(updated);
  }

  function openModal(task) {
    modal.open(task, upsertTask, deleteTask);
  }

  function closeModalWindow() {
    modal.close();
  }

  function handleTaskFormSubmit(event) {
    modal.handleSubmit(event);
  }

  function handleDeleteFromModal() {
    modal.handleDelete();
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
    console.log("[TASKS] setTasks called with", list.length, "tasks, shouldSync:", shouldSync);
    console.log("[TASKS] Before normalize:", JSON.stringify(list[0]));
    tasks = list.map(normalizeTask);
    console.log("[TASKS] After normalize:", JSON.stringify(tasks[0]));
    saveTasks(tasks);
    console.log("[TASKS] Saved to localStorage");
    renderAll();
    if (shouldSync && onChange) {
      console.log("[TASKS] Triggering onChange (scheduleSync)");
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

import { priorityLabel } from "./data.js";

function formatCountdown(dueDate) {
  if (!dueDate) {
    return "No due date";
  }
  const due = new Date(dueDate + "T00:00:00");
  const now = new Date();
  const diffMs = due - now;
  const absMs = Math.abs(diffMs);
  const totalMinutes = Math.floor(absMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const parts = [];
  if (weeks) parts.push(`${weeks}w`);
  if (days) parts.push(`${days}d`);
  if (hours && parts.length < 2) parts.push(`${hours}h`);
  if (minutes && parts.length < 2) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push("0m");

  const label = parts.join(" ");
  return diffMs >= 0 ? `Due in ${label}` : `Overdue by ${label}`;
}

function formatStartCountdown(startDate) {
  if (!startDate) {
    return "No start date";
  }
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  const diffMs = start - now;
  if (diffMs <= 0) {
    return "Started";
  }
  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const parts = [];
  if (weeks) parts.push(`${weeks}w`);
  if (days) parts.push(`${days}d`);
  if (hours && parts.length < 2) parts.push(`${hours}h`);
  if (minutes && parts.length < 2) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push("0m");

  return `Starts in ${parts.join(" ")}`;
}

export function renderTasks(container, tasks) {
  container.innerHTML = "";
  if (tasks.length === 0) {
    container.innerHTML = '<div class="empty">No available tasks.</div>';
    return;
  }
  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${task.name}</div>
        <div class="card-actions">
          <button class="pill-btn" data-complete="${task.id}">Mark completed</button>
          <button class="muted-btn" data-edit="${task.id}">Edit</button>
        </div>
      </div>
      <div class="card-meta">
        <span class="badge ${task.priority}">${priorityLabel[task.priority]}</span>
        <span>${formatCountdown(task.dueDate)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

export function renderBacklog(container, tasks) {
  container.innerHTML = "";
  if (tasks.length === 0) {
    container.innerHTML = '<div class="empty">Add your first task.</div>';
    return;
  }
  tasks.forEach((task) => {
    const startMessage = formatStartCountdown(task.startDate);
    const showStart = startMessage.startsWith("Starts in");
    const timingMessage = showStart ? startMessage : formatCountdown(task.dueDate);
    const completeLabel = task.completed ? "Unmark completed" : "Mark completed";
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${task.name}</div>
        <div class="card-actions">
          <button class="pill-btn" data-complete="${task.id}">${completeLabel}</button>
          <button class="muted-btn" data-edit="${task.id}">Edit</button>
        </div>
      </div>
      <div class="card-meta">
        <span class="badge ${task.priority}">${priorityLabel[task.priority]}</span>
        <span>${timingMessage}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

export function setActiveView(viewName, views, buttons) {
  views.tasks.classList.toggle("hidden", viewName !== "tasks");
  views.backlog.classList.toggle("hidden", viewName !== "backlog");
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

export function toggleHidden(element, shouldShow) {
  element.classList.toggle("hidden", !shouldShow);
  return shouldShow;
}

export function fillForm(form, task) {
  form.taskName.value = task ? task.name : "";
  form.taskPriority.value = task ? task.priority : "medium";
  form.taskStart.value = task ? task.startDate || "" : "";
  form.taskDue.value = task ? task.dueDate || "" : "";
}

import { getScore } from "./data.js";

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
        <div class="card-title priority-${task.priority}">${task.name}</div>
        <div class="card-actions">
          <button class="pill-btn" data-complete="${task.id}">Mark completed</button>
          <button class="muted-btn" data-edit="${task.id}">Edit</button>
        </div>
      </div>
      <div class="card-meta">
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
        <div class="card-title priority-${task.priority}">${task.name}</div>
        <div class="card-actions">
          <button class="pill-btn" data-complete="${task.id}">${completeLabel}</button>
          <button class="muted-btn" data-edit="${task.id}">Edit</button>
        </div>
      </div>
      <div class="card-meta">
        <span>${timingMessage}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function formatDateLabel(dateValue) {
  if (!dateValue) {
    return "Not set";
  }
  const date = new Date(dateValue + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatDayLabel(dateValue) {
  return new Date(dateValue + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(date.getDate() + count);
  return next;
}

function getWeekStart(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return start;
}

function getDateRange(startKey, endKey) {
  const range = [];
  const start = new Date(startKey + "T00:00:00");
  const end = new Date(endKey + "T00:00:00");
  const direction = start <= end ? 1 : -1;
  let cursor = new Date(start);
  while ((direction === 1 && cursor <= end) || (direction === -1 && cursor >= end)) {
    range.push(toLocalDateKey(cursor));
    cursor = addDays(cursor, direction);
  }
  return range;
}

function toStartOfDay(dateValue) {
  const date = new Date(dateValue + "T00:00:00");
  date.setHours(0, 0, 0, 0);
  return date;
}

function diffDays(start, end) {
  const msPerDay = 86400000;
  return Math.round((end - start) / msPerDay);
}

export function renderSchedule(containers, tasks) {
  const { days, grid, weekOffset = 0 } = containers || {};
  if (!days || !grid) {
    return;
  }

  days.innerHTML = "";
  grid.innerHTML = "";

  const today = new Date();
  const weekStart = getWeekStart(today);
  const startDate = addDays(weekStart, weekOffset * 7);
  const visibleDates = Array.from({ length: 7 }, (_, index) => addDays(startDate, index));

  const visibleStart = toStartOfDay(toLocalDateKey(startDate));
  const visibleEnd = toStartOfDay(toLocalDateKey(visibleDates[6]));

  visibleDates.forEach((date) => {
    const key = toLocalDateKey(date);
    const label = document.createElement("div");
    label.className = "schedule-day-label";
    label.textContent = formatDayLabel(key);
    days.appendChild(label);
  });

  const undatedTasks = [];
  const sortedTasks = [...tasks].sort((a, b) => {
    const scoreDiff = getScore(b) - getScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });
  let rowIndex = 0;
  sortedTasks.forEach((task) => {
    const startKey = task.startDate || task.dueDate;
    const endKey = task.dueDate || task.startDate;
    if (!startKey && !endKey) {
      undatedTasks.push(task);
      return;
    }

    const startDateValue = toStartOfDay(startKey);
    const endDateValue = toStartOfDay(endKey);
    const extendsLeft = startDateValue < visibleStart;
    const extendsRight = endDateValue > visibleEnd;
    if (endDateValue < visibleStart || startDateValue > visibleEnd) {
      return;
    }

    const clampedStart = startDateValue < visibleStart ? visibleStart : startDateValue;
    const clampedEnd = endDateValue > visibleEnd ? visibleEnd : endDateValue;
    const startIndex = diffDays(visibleStart, clampedStart);
    const endIndex = diffDays(visibleStart, clampedEnd);

    const row = document.createElement("div");
    row.className = "schedule-row";
    row.style.setProperty("--row-index", rowIndex);
    rowIndex += 1;
    const span = document.createElement("div");
    span.className = `schedule-span priority-${task.priority}`;
    if (extendsLeft) {
      span.classList.add("extends-left");
    }
    if (extendsRight) {
      span.classList.add("extends-right");
    }
    span.style.gridColumn = `${startIndex + 1} / ${endIndex + 2}`;
    span.innerHTML = `
      <div class="schedule-span-title">${task.name}</div>
      <div class="schedule-span-meta">${formatDateLabel(startKey)} → ${formatDateLabel(endKey)}</div>
    `;
    row.appendChild(span);
    grid.appendChild(row);
  });

  void undatedTasks;
}

export function setActiveView(viewName, views, buttons) {
  views.tasks.classList.toggle("hidden", viewName !== "tasks");
  views.backlog.classList.toggle("hidden", viewName !== "backlog");
  if (views.schedule) {
    views.schedule.classList.toggle("hidden", viewName !== "schedule");
  }
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

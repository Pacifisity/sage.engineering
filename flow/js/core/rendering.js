import { getScore } from "./data.js";
import {
  formatCountdown,
  formatStartCountdown,
  formatDateLabel,
  formatDayLabel,
  toLocalDateKey,
  addDays,
  getWeekStart,
  toStartOfDay,
  diffDays
} from "./dateUtils.js";

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

export function renderFocus(container, task) {
  container.innerHTML = "";
  if (!task) {
    container.innerHTML = '<div class="empty">Nothing scheduled, what\'s next?</div>';
    return;
  }
  container.innerHTML = `
    <div class="focus-task-title priority-${task.priority}">${task.name}</div>
    <div class="focus-task-meta">${formatCountdown(task.dueDate)}</div>
    <div class="focus-task-actions">
      <button class="pill-btn" data-focus-complete="${task.id}">Mark completed</button>
      <button class="muted-btn" data-focus-edit="${task.id}">Edit</button>
    </div>
  `;
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

export const STORAGE_KEY = "flow.tasks.v2";

export const priorityWeight = {
  high: 3,
  medium: 2,
  low: 1
};

export const priorityLabel = {
  high: "High",
  medium: "Medium",
  low: "Low"
};

export function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks, null, 2));
}

export function normalizeTask(task) {
  const now = Date.now();
  const createdAt = task.createdAt != null ? task.createdAt : now;
  const updatedAt = task.updatedAt != null ? task.updatedAt : createdAt;
  return {
    id: task.id != null && task.id !== "" ? task.id : crypto.randomUUID(),
    name: task.name != null && task.name !== "" ? task.name : "Untitled",
    priority: task.priority != null && task.priority !== "" ? task.priority : "medium",
    startDate: normalizeDateKey(task.startDate),
    dueDate: normalizeDateKey(task.dueDate),
    notes: task.notes || "",
    createdAt,
    updatedAt,
    completed: Boolean(task.completed)
  };
}

function normalizeDateKey(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const date = new Date(trimmed + "T00:00:00");
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return trimmed;
}

function toDate(value) {
  const normalized = normalizeDateKey(value);
  return normalized ? new Date(normalized + "T00:00:00") : null;
}

function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((b - a) / ms);
}

export function getScore(task) {
  const now = new Date();
  const start = toDate(task.startDate);
  const due = toDate(task.dueDate);

  const priorityScore = priorityWeight[task.priority] * 50;

  let urgencyScore = 0;
  if (due) {
    const daysUntilDue = daysBetween(now, due);
    urgencyScore = daysUntilDue <= 0 ? 120 : Math.max(0, 70 - daysUntilDue * 4);
  } else {
    urgencyScore = 10;
  }

  let ageScore = 0;
  if (start) {
    const daysSinceStart = Math.max(0, daysBetween(start, now));
    ageScore = Math.min(30, daysSinceStart * 1.5);
    if (start > now) {
      ageScore -= 15;
    }
  }

  return priorityScore + urgencyScore + ageScore;
}

export function isAvailable(task) {
  const start = toDate(task.startDate);
  return !start || start <= new Date();
}

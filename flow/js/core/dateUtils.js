export function formatCountdown(dueDate) {
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

export function formatStartCountdown(startDate) {
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

export function formatDateLabel(dateValue) {
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

export function formatDayLabel(dateValue) {
  return new Date(dateValue + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date, count) {
  const next = new Date(date);
  next.setDate(date.getDate() + count);
  return next;
}

export function getWeekStart(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return start;
}

export function toStartOfDay(dateValue) {
  const date = new Date(dateValue + "T00:00:00");
  date.setHours(0, 0, 0, 0);
  return date;
}

export function diffDays(start, end) {
  const msPerDay = 86400000;
  return Math.round((end - start) / msPerDay);
}

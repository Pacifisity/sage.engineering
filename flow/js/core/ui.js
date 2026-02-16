export { renderTasks, renderBacklog, renderFocus, renderSchedule } from "./rendering.js";

export function setActiveView(viewName, views, buttons) {
  views.tasks.classList.toggle("hidden", viewName !== "tasks");
  views.backlog.classList.toggle("hidden", viewName !== "backlog");
  if (views.schedule) {
    views.schedule.classList.toggle("hidden", viewName !== "schedule");
  }
  if (views.focus) {
    views.focus.classList.toggle("hidden", viewName !== "focus");
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
  if (task) {
    form.taskStart.value = task.startDate || "";
    form.taskDue.value = task.dueDate || "";
  } else {
    form.taskStart.value = new Date().toISOString().slice(0, 10);
    form.taskDue.value = "";
  }
}

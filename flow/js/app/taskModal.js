import { fillForm } from "../core/ui.js";

export function createTaskModal(dom) {
  let editingId = null;

  function open(task, onSubmit, onDelete) {
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

    // Store callbacks for handlers
    dom._taskModalOnSubmit = onSubmit;
    dom._taskModalOnDelete = onDelete;
  }

  function close() {
    dom.modalBackdrop.classList.add("hidden");
    dom.modalBackdrop.setAttribute("aria-hidden", "true");
    editingId = null;
    dom._taskModalOnSubmit = null;
    dom._taskModalOnDelete = null;
  }

  function handleSubmit(event) {
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

    if (dom._taskModalOnSubmit) {
      dom._taskModalOnSubmit(editingId, payload);
    }

    close();
  }

  function handleDelete() {
    if (editingId && dom._taskModalOnDelete) {
      dom._taskModalOnDelete(editingId);
      close();
    }
  }

  return {
    open,
    close,
    handleSubmit,
    handleDelete,
    getEditingId: () => editingId
  };
}

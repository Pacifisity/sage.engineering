export function animateSchedule(dom, direction) {
  if (!dom.scheduleGrid) {
    return;
  }
  dom.scheduleGrid.classList.remove("animate-week", "animate-left", "animate-right");
  void dom.scheduleGrid.offsetWidth;
  dom.scheduleGrid.classList.add("animate-week");
  if (direction === "left") {
    dom.scheduleGrid.classList.add("animate-left");
  }
  if (direction === "right") {
    dom.scheduleGrid.classList.add("animate-right");
  }
}

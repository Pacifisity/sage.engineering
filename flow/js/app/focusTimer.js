export function createFocusTimer(dom) {
  const timer = {
    focusSeconds: 50 * 60,
    breakSeconds: 10 * 60,
    remainingSeconds: 0,
    intervalId: null,
    running: false,
    mode: "focus"
  };

  function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function updateDisplay() {
    if (dom.focusTimerDisplay) {
      dom.focusTimerDisplay.textContent = formatTime(timer.remainingSeconds);
    }
  }

  function stop() {
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
    timer.running = false;
  }

  function start() {
    if (timer.running) {
      return;
    }
    timer.running = true;
    timer.intervalId = setInterval(() => {
      timer.remainingSeconds -= 1;
      if (timer.remainingSeconds <= 0) {
        timer.remainingSeconds = 0;
        stop();
      }
      updateDisplay();
    }, 1000);
  }

  function setMode(mode) {
    timer.mode = mode;
    timer.remainingSeconds = mode === "break" ? timer.breakSeconds : timer.focusSeconds;
    updateDisplay();
  }

  function reset() {
    stop();
    timer.remainingSeconds = 0;
    updateDisplay();
  }

  return {
    start,
    stop,
    reset,
    setMode,
    updateDisplay
  };
}

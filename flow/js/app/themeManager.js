const THEME_OVERRIDE_KEY = "flow.theme.override";

export function getSystemTheme() {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function getThemeOverride() {
  return localStorage.getItem(THEME_OVERRIDE_KEY);
}

export function getCurrentTheme() {
  const override = getThemeOverride();
  if (override) {
    return override;
  }
  return getSystemTheme();
}

export function setThemeOverride(theme) {
  if (theme === null) {
    localStorage.removeItem(THEME_OVERRIDE_KEY);
  } else {
    localStorage.setItem(THEME_OVERRIDE_KEY, theme);
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (theme === "light") {
    document.documentElement.classList.add("light-mode");
  } else {
    document.documentElement.classList.remove("light-mode");
  }
}

export function initTheme() {
  const current = getCurrentTheme();
  applyTheme(current);
  
  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      const override = getThemeOverride();
      if (!override) {
        // Only apply if user hasn't set an override
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }
}

export function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === "light" ? "dark" : "light";
  setThemeOverride(next);
  applyTheme(next);
  return next;
}

export function updateThemeToggleButton(btn) {
  if (!btn) {
    return;
  }
  const override = getThemeOverride();
  const current = getCurrentTheme();
  const isSysDefault = override === null;
  
  let label = current === "light" ? "Dark mode" : "Light mode";
  if (isSysDefault) {
    label += " (system)";
  }
  btn.textContent = label;
}

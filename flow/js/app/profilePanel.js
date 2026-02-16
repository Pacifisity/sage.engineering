export function positionProfilePanel(dom) {
  if (!dom.profileBtn || !dom.profilePanel || dom.profilePanel.classList.contains("hidden")) {
    return;
  }

  const buttonRect = dom.profileBtn.getBoundingClientRect();
  const panelWidth = dom.profilePanel.offsetWidth || 240;
  const gap = 10;
  const minLeft = 12;
  const maxLeft = Math.max(minLeft, window.innerWidth - panelWidth - 12);
  const left = Math.min(Math.max(buttonRect.left, minLeft), maxLeft);

  dom.profilePanel.style.left = `${left}px`;
  dom.profilePanel.style.top = `${buttonRect.bottom + gap}px`;
  dom.profilePanel.style.right = "auto";
}

export function setAuthButtonState(dom, signedIn) {
  if (!dom.googleBtn) {
    return;
  }
  dom.googleBtn.textContent = signedIn ? "Sign out" : "Sign in";
  dom.googleBtn.classList.toggle("auth-signin", !signedIn);
  dom.googleBtn.classList.toggle("auth-signout", signedIn);
}

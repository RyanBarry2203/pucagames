import { reducedMotion } from "../core/ticker.js";

// Footer switch that overrides the system "reduce motion" setting. The choice is saved and the page reloads so
// every module starts again in the chosen mode.
export function initMotionToggle() {
  const toggle = document.querySelector("[data-motion-toggle]");
  if (!toggle) {
    return;
  }
  const label = toggle.querySelector("[data-motion-label]");
  label.textContent = reducedMotion ? "off" : "on";
  toggle.setAttribute("aria-pressed", String(!reducedMotion));

  toggle.addEventListener("click", () => {
    try {
      localStorage.setItem("motion", reducedMotion ? "full" : "reduced");
      window.location.reload();
    } catch {
      // storage is blocked (some private windows), so there is nowhere to remember the choice
      label.textContent = "unavailable here";
      toggle.disabled = true;
    }
  });
}

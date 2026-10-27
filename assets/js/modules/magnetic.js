import { finePointer, reducedMotion } from "../core/ticker.js";

// Elements marked [data-magnetic] lean toward the pointer while it hovers over them.
export function initMagnetic(strength = 0.3) {
  if (!finePointer || reducedMotion) {
    return;
  }
  for (const element of document.querySelectorAll("[data-magnetic]")) {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      element.style.setProperty("--mx", `${(x * strength).toFixed(1)}px`);
      element.style.setProperty("--my", `${(y * strength).toFixed(1)}px`);
    });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--mx", "0px");
      element.style.setProperty("--my", "0px");
    });
  }
}

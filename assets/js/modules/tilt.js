import { finePointer, reducedMotion } from "../core/ticker.js";

// Cards marked [data-tilt] rotate in 3D toward the pointer, with a soft glare that follows it.
// JS only writes CSS variables (--rx, --ry, --gx, --gy, --go); the stylesheet does the actual transform.
export function initTilt(maxDegrees = 7) {
  if (!finePointer || reducedMotion) {
    return;
  }
  for (const card of document.querySelectorAll("[data-tilt]")) {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.classList.add("is-tilting");
      card.style.setProperty("--ry", `${((x - 0.5) * maxDegrees * 2).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${((0.5 - y) * maxDegrees * 2).toFixed(2)}deg`);
      card.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      card.style.setProperty("--go", "1");
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--go", "0");
    });
  }
}

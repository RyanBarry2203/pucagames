import { onFrame, state, finePointer, reducedMotion, lerp } from "../core/ticker.js";

const INTERACTIVE = "a, button, [data-tilt], [data-magnetic]";

// A gold dot that tracks the pointer exactly and a ring that trails behind it. Mouse/trackpad only.
export function initCursor() {
  const cursor = document.querySelector("[data-cursor]");
  if (!cursor || !finePointer || reducedMotion) {
    return;
  }
  document.documentElement.classList.add("has-cursor");

  const ring = cursor.querySelector(".cursor__ring");
  const dot = cursor.querySelector(".cursor__dot");
  let ringX = state.pointerX;
  let ringY = state.pointerY;

  document.addEventListener("pointerover", (event) => {
    cursor.classList.toggle("is-hover", Boolean(event.target.closest(INTERACTIVE)));
  });
  document.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  document.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
  document.documentElement.addEventListener("pointerleave", () => {
    cursor.style.opacity = "0";
  });
  document.documentElement.addEventListener("pointerenter", () => {
    cursor.style.opacity = "1";
  });

  onFrame((s, dt) => {
    if (!s.hasPointer) {
      return;
    }
    // frame-rate independent easing: the ring closes ~18% of the gap every 1/60 s
    const ease = 1 - Math.pow(1 - 0.18, dt * 60);
    ringX = lerp(ringX, s.pointerX, ease);
    ringY = lerp(ringY, s.pointerY, ease);
    dot.style.setProperty("--x", `${s.pointerX}px`);
    dot.style.setProperty("--y", `${s.pointerY}px`);
    ring.style.setProperty("--x", `${ringX}px`);
    ring.style.setProperty("--y", `${ringY}px`);
  });
}

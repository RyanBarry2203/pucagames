import { onFrame, reducedMotion, clamp, lerp } from "../core/ticker.js";

// Scroll speed as a physical force. A smoothed, signed velocity (-1..1) is published as --v for CSS (headings lean
// with it) and drives an SVG displacement filter that ripples the art while you scroll fast, settling when you stop.
export function initVelocity() {
  const displacement = document.querySelector("[data-warp]");
  if (reducedMotion || !displacement) {
    return;
  }
  const root = document.documentElement;
  let v = 0;
  let lastScale = -1;

  onFrame((s, dt) => {
    const target = clamp(s.velocity / 45, -1, 1);
    v = lerp(v, target, 1 - Math.pow(1 - 0.12, dt * 60));
    root.style.setProperty("--v", v.toFixed(3));

    const scale = Math.round(Math.abs(v) * 60);
    if (scale !== lastScale) {
      displacement.setAttribute("scale", scale);
      // only pay for the filter while there is something to see
      root.classList.toggle("is-warping", scale > 1);
      lastScale = scale;
    }
  });
}

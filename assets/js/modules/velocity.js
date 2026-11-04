import { onFrame, onPauseChange, reducedMotion, finePointer, clamp, lerp } from "../core/ticker.js";

// Scroll speed as a physical force. A smoothed, signed velocity (-1..1) is published as --v for CSS (headings lean
// with it) and drives an SVG displacement filter that ripples the art while you scroll fast, settling when you stop.
// The ripple only runs where it is cheap: Chromium with a mouse. Safari and Firefox draw SVG filters on HTML on the
// CPU, so there (and on touch screens) the headings still lean but the art stays still.
export function initVelocity() {
  const displacement = document.querySelector("[data-warp]");
  if (reducedMotion || !displacement) {
    return;
  }
  const root = document.documentElement;
  // only the headings in <main> read --v, so that is where it goes
  const host = document.querySelector("main") || root;
  const warps = finePointer && "userAgentData" in navigator;
  let v = 0;
  let lastV = "";
  let lastScale = -1;

  // a scroll can stop mid-ripple when the frame loop holds still (a game on screen): the filter goes with it
  onPauseChange((paused) => {
    if (paused && lastScale > 0) {
      displacement.setAttribute("scale", 0);
      root.classList.remove("is-warping");
      lastScale = 0;
    }
  });

  onFrame((s, dt) => {
    const target = clamp(s.velocity / 45, -1, 1);
    v = lerp(v, target, 1 - Math.pow(1 - 0.12, dt * 60));
    if (Math.abs(v) < 0.002) {
      v = 0;
    }
    const value = v.toFixed(2);
    if (value !== lastV) {
      host.style.setProperty("--v", value);
      lastV = value;
    }
    if (!warps) {
      return;
    }

    // even steps of 2: the ripple eases in and out smoothly, with half the filter updates of whole numbers
    const scale = Math.round((Math.abs(v) * 60) / 2) * 2;
    if (scale !== lastScale) {
      displacement.setAttribute("scale", scale);
      // only pay for the filter while there is something to see
      root.classList.toggle("is-warping", scale > 0);
      lastScale = scale;
    }
  });
}

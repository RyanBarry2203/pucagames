// One requestAnimationFrame loop shared by every module, plus the scroll and pointer state they all read.
// Modules subscribe with onFrame() instead of adding their own scroll listeners, so everything updates in step.

// Decided in <head> before first paint: the system setting, or the visitor's choice from the footer toggle.
export const reducedMotion = document.documentElement.dataset.motion === "reduced";
export const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export const state = {
  scrollY: window.scrollY,
  velocity: 0,
  vw: window.innerWidth,
  vh: window.innerHeight,
  pointerX: window.innerWidth / 2,
  pointerY: window.innerHeight / 2,
  // pointer position from the viewport centre, -1..1 on each axis
  nx: 0,
  ny: 0,
  hasPointer: false,
  time: 0,
};

const subscribers = new Set();
let frameId = 0;
let lastTime = 0;

export function onFrame(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function tick(now) {
  const dt = Math.min(now - lastTime, 64) / 1000;
  lastTime = now;

  const y = window.scrollY;
  // smoothed so effects driven by scroll speed don't jitter
  state.velocity += (y - state.scrollY - state.velocity) * 0.2;
  state.scrollY = y;
  state.time = now / 1000;

  for (const callback of subscribers) {
    callback(state, dt);
  }
  frameId = requestAnimationFrame(tick);
}

function onPointerMove(event) {
  state.pointerX = event.clientX;
  state.pointerY = event.clientY;
  state.nx = (event.clientX / state.vw) * 2 - 1;
  state.ny = (event.clientY / state.vh) * 2 - 1;
  state.hasPointer = true;
}

function onResize() {
  state.vw = window.innerWidth;
  state.vh = window.innerHeight;
}

export function start() {
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(frameId);
    if (!document.hidden) {
      lastTime = performance.now();
      frameId = requestAnimationFrame(tick);
    }
  });
  lastTime = performance.now();
  frameId = requestAnimationFrame(tick);
}

// True while the element is within (or near) the viewport; lets modules skip work for things off screen.
export function watchVisibility(element, margin = "100px") {
  const flag = { visible: false };
  new IntersectionObserver(([entry]) => {
    flag.visible = entry.isIntersecting;
  }, { rootMargin: margin }).observe(element);
  return flag;
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (from, to, amount) => from + (to - from) * amount;

import { onFrame, onRead, reducedMotion, lerp } from "../core/ticker.js";

// Last Known Location: the hero is lit by one torch that follows the pointer (or drifts by itself on touch screens),
// and every so often the beam stutters, the way the one in the game does before something is there.
export function initLastKnownLocation() {
  const hero = document.querySelector(".page-hero");
  const torchEl = hero?.querySelector("[data-torch]");
  if (!hero || !torchEl || reducedMotion) {
    return;
  }
  hero.classList.add("is-dark", "is-torch");

  const torch = { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
  let nextFlicker = 4;
  let flickerUntil = 0;

  let rect = null;
  onRead(() => {
    rect = hero.getBoundingClientRect();
  });
  onFrame((s, dt) => {
    if (!rect || rect.bottom < 0) {
      return;
    }
    const tx = s.hasPointer ? s.pointerX : rect.left + rect.width * (0.5 + Math.sin(s.time * 0.25) * 0.28);
    const ty = s.hasPointer ? s.pointerY : rect.top + rect.height * (0.45 + Math.cos(s.time * 0.19) * 0.12);
    const ease = 1 - Math.pow(1 - 0.1, dt * 60);
    torch.x = lerp(torch.x, tx, ease);
    torch.y = lerp(torch.y, ty, ease);

    // a tired battery: a stutter every 4 to 9 seconds, 120 ms long, then steady again
    if (s.time >= nextFlicker) {
      flickerUntil = s.time + 0.12;
      nextFlicker = s.time + 4 + Math.random() * 5;
    }
    const stutter = s.time < flickerUntil ? 0.35 + Math.random() * 0.3 : 1;
    const breathe = 1 + Math.sin(s.time * 1.7) * 0.015;

    torchEl.style.setProperty("--tx", `${(torch.x - rect.left).toFixed(1)}px`);
    torchEl.style.setProperty("--ty", `${(torch.y - rect.top).toFixed(1)}px`);
    torchEl.style.setProperty("--tr", (breathe * stutter).toFixed(3));
  });
}

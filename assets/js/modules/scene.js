import { onFrame, reducedMotion, watchVisibility, clamp, lerp } from "../core/ticker.js";

// Hero parallax. Each layer has a depth (how far it shifts with the pointer) and a speed (how much it lags behind
// the scroll), so near layers slide past far ones. The standing stones' carvings glow as the pointer nears them.
export function initScene() {
  const hero = document.querySelector("[data-scene]");
  if (!hero || reducedMotion) {
    return;
  }

  const layers = [...hero.querySelectorAll("[data-depth]")].map((element) => ({
    element,
    depth: Number(element.dataset.depth),
    speed: Number(element.dataset.speed),
  }));
  const content = hero.querySelector("[data-hero-content]");
  const visibility = watchVisibility(hero, "0px");
  let mx = 0;
  let my = 0;

  onFrame((s, dt) => {
    if (!visibility.visible) {
      return;
    }
    const ease = 1 - Math.pow(1 - 0.05, dt * 60);
    mx = lerp(mx, s.nx, ease);
    my = lerp(my, s.ny, ease);

    for (const layer of layers) {
      const x = -mx * layer.depth * 70;
      const y = s.scrollY * layer.speed - my * layer.depth * 34;
      layer.element.style.setProperty("--px", `${x.toFixed(2)}px`);
      layer.element.style.setProperty("--py", `${y.toFixed(2)}px`);
    }

    const out = clamp(s.scrollY / (s.vh * 0.7), 0, 1);
    content.style.setProperty("--lift", `${(s.scrollY * 0.35).toFixed(1)}px`);
    content.style.setProperty("--fade", (1 - out).toFixed(3));
  });

  const stones = [...hero.querySelectorAll(".stone")];
  hero.addEventListener("pointermove", (event) => {
    for (const stone of stones) {
      const rect = stone.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const glow = clamp(1 - Math.hypot(dx, dy) / 220, 0, 1);
      stone.style.setProperty("--glow", glow.toFixed(2));
    }
  }, { passive: true });
  hero.addEventListener("pointerleave", () => {
    for (const stone of stones) {
      stone.style.setProperty("--glow", "0");
    }
  });
}

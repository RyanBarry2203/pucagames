import { onFrame, reducedMotion, watchVisibility, lerp } from "../core/ticker.js";

// Hero pointer parallax: each layer drifts against the pointer by its data-depth, so near layers move most.
// It writes --px/--py, which CSS applies with the `translate` property; the scroll journey (journey.js) animates
// `transform` on the same layers, and the two combine.
export function initScene() {
  const hero = document.querySelector("[data-scene]");
  if (!hero || reducedMotion) {
    return;
  }

  const layers = [...hero.querySelectorAll("[data-depth]")].map((element) => ({
    element,
    depth: Number(element.dataset.depth),
  }));
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
      layer.element.style.setProperty("--px", `${(-mx * layer.depth * 80).toFixed(2)}px`);
      layer.element.style.setProperty("--py", `${(-my * layer.depth * 40).toFixed(2)}px`);
    }
  });
}

import { gsap } from "../core/engine.js";
import { reducedMotion } from "../core/ticker.js";
import { fog } from "./fog.js";
import { world } from "./world.js";

// "Enter the mist": the hero pins while you scroll and the camera seems to push into the stone circle. Near layers
// grow faster than far ones (a dolly zoom built from scale), the copy lifts away and the fog thickens until the next
// section comes through it.
export function initJourney() {
  const hero = document.querySelector("[data-scene]");
  if (!hero || reducedMotion) {
    return;
  }
  const layer = (name) => hero.querySelector(`[data-layer="${name}"]`);
  gsap.set([layer("front"), layer("stones"), layer("hills"), layer("mountain")], { transformOrigin: "50% 82%" });

  gsap.timeline({
    defaults: { ease: "none", duration: 1 },
    scrollTrigger: { trigger: hero, start: "top top", end: "+=140%", scrub: 0.9, pin: true, anticipatePin: 1 },
  })
    .to(hero.querySelector("[data-hero-content]"), { yPercent: -60, opacity: 0, duration: 0.45, ease: "power1.in" }, 0)
    .to(hero.querySelector(".hero__scroll"), { opacity: 0, duration: 0.1 }, 0)
    .to(layer("front"), { scale: 2.6, yPercent: 28, ease: "power2.in" }, 0)
    .to(layer("stones"), { scale: 2, yPercent: 10, ease: "power1.in" }, 0)
    .to(layer("hills"), { scale: 1.55, yPercent: 6 }, 0)
    .to(layer("mountain"), { scale: 1.3, yPercent: 3 }, 0)
    .to(layer("moon"), { scale: 0.8, yPercent: -16 }, 0)
    .to(fog, { density: 1, ease: "power2.in" }, 0)
    // the 3D world (when WebGL is available) flies its camera instead; the flat layers above are its fallback
    .to(world, { fly: 1, ease: "power1.inOut" }, 0)
    .to(hero.querySelector(".hero__veil"), { opacity: 1, duration: 0.3 }, 0.7);
}

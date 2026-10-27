import { start } from "./core/ticker.js";
import { initEngine } from "./core/engine.js";
import { initSplit } from "./modules/split.js";
import { initHeader } from "./modules/header.js";
import { initCursor } from "./modules/cursor.js";
import { initMagnetic } from "./modules/magnetic.js";
import { initReveal } from "./modules/reveal.js";
import { initTilt } from "./modules/tilt.js";
import { initFx } from "./modules/fx.js";
import { initHScroll } from "./modules/hscroll.js";
import { initParallax } from "./modules/parallax.js";
import { initScenes } from "./modules/scenes.js";
import { initVelocity } from "./modules/velocity.js";
import { initMotionToggle } from "./modules/motionToggle.js";
import { initSangueFrio } from "./games/sangueFrio.js";
import { initCorazonNegro } from "./games/corazonNegro.js";

// Entry point for the inner pages (games, press): the same motion engine as the home page, plus each game's own
// signature interaction, chosen by <body data-game>.
const GAMES = {
  "sangue-frio": initSangueFrio,
  "corazon-negro": initCorazonNegro,
};

// the press page loads this file without the GSAP scripts, so only start the scroll engine where it exists
const hasEngine = Boolean(window.gsap && window.ScrollTrigger);

if (hasEngine) {
  initEngine();
}
initSplit();
initHeader();
initCursor();
initMagnetic();
initReveal();
initTilt();
initFx();
initVelocity();
initMotionToggle();

if (hasEngine) {
  GAMES[document.body.dataset.game]?.();
  initHScroll();
  initParallax();
  initScenes();
}

for (const element of document.querySelectorAll("[data-year]")) {
  element.textContent = new Date().getFullYear();
}

start();

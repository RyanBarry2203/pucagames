import { start } from "./core/ticker.js";
import { initSplit } from "./modules/split.js";
import { initHeader } from "./modules/header.js";
import { initCursor } from "./modules/cursor.js";
import { initMagnetic } from "./modules/magnetic.js";
import { initScene } from "./modules/scene.js";
import { initSky } from "./modules/sky.js";
import { initMarquee } from "./modules/marquee.js";
import { initReveal } from "./modules/reveal.js";
import { initTilt } from "./modules/tilt.js";
import { initShapeshifter } from "./modules/shapeshifter.js";
import { initLore } from "./modules/lore.js";
import { initMotionToggle } from "./modules/motionToggle.js";

initSplit();
initHeader();
initCursor();
initMagnetic();
initScene();
initSky();
initMarquee();
initReveal();
initTilt();
initShapeshifter();
initLore();
initMotionToggle();

for (const element of document.querySelectorAll("[data-year]")) {
  element.textContent = new Date().getFullYear();
}

start();

import { start } from "./core/ticker.js";
import { initHeader } from "./modules/header.js";
import { initCursor } from "./modules/cursor.js";
import { initMagnetic } from "./modules/magnetic.js";
import { initReveal } from "./modules/reveal.js";
import { initTilt } from "./modules/tilt.js";
import { initMotionToggle } from "./modules/motionToggle.js";

// Entry point for the inner pages (games, press): the shared chrome without the hero scene.
initHeader();
initCursor();
initMagnetic();
initReveal();
initTilt();
initMotionToggle();

for (const element of document.querySelectorAll("[data-year]")) {
  element.textContent = new Date().getFullYear();
}

start();

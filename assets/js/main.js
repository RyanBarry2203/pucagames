import { start } from "./core/ticker.js";
import { initEngine } from "./core/engine.js";
import { initPreloader } from "./modules/preloader.js";
import { initSplit } from "./modules/split.js";
import { initHeader } from "./modules/header.js";
import { initCursor } from "./modules/cursor.js";
import { initMagnetic } from "./modules/magnetic.js";
import { initScene } from "./modules/scene.js";
import { initSky } from "./modules/sky.js";
import { initFog } from "./modules/fog.js";
import { initWorld } from "./modules/world.js";
import { initJourney } from "./modules/journey.js";
import { initFx } from "./modules/fx.js";
import { initRunners } from "./modules/runners.js";
import { initMarquee } from "./modules/marquee.js";
import { initReveal } from "./modules/reveal.js";
import { initTilt } from "./modules/tilt.js";
import { initHScroll } from "./modules/hscroll.js";
import { initKnots } from "./modules/knots.js";
import { initParallax } from "./modules/parallax.js";
import { initShapeshifter } from "./modules/shapeshifter.js";
import { initLore } from "./modules/lore.js";
import { initMotionToggle } from "./modules/motionToggle.js";
import { initVelocity } from "./modules/velocity.js";
import { initScenes } from "./modules/scenes.js";

initEngine();
initSplit();
initHeader();
initCursor();
initMagnetic();
initScene();
initSky();
initFog();
initWorld();
initFx();
initMarquee();
initReveal();
initTilt();
initShapeshifter();
initLore();
initKnots();
initMotionToggle();
initVelocity();

// Everything that pins or measures scroll positions is created top to bottom, so each ScrollTrigger accounts for
// the pin spacing added above it.
initJourney();
initHScroll();
initParallax();
initScenes();
initRunners();

for (const element of document.querySelectorAll("[data-year]")) {
  element.textContent = new Date().getFullYear();
}

start();
initPreloader().then(() => window.ScrollTrigger.refresh());

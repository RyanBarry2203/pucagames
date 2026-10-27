import { reducedMotion } from "./ticker.js";

// GSAP, its plugins and Lenis load as classic scripts (assets/vendor) before the modules, so they are globals here.
export const gsap = window.gsap;
export const ScrollTrigger = window.ScrollTrigger;
let lenis = null;

// Smooth inertial scrolling (Lenis) driving GSAP's ScrollTrigger, so every scroll animation follows the same
// smoothed position. Gentle mode keeps the browser's own scrolling.
export function initEngine() {
  gsap.registerPlugin(ScrollTrigger, window.DrawSVGPlugin, window.MotionPathPlugin);
  if (reducedMotion) {
    return;
  }
  document.documentElement.style.scrollBehavior = "auto";
  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // in-page links glide through Lenis instead of jumping
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    const target = link && document.querySelector(link.getAttribute("href"));
    if (!target) {
      return;
    }
    event.preventDefault();
    lenis.scrollTo(target, { offset: target.id === "top" ? 0 : -40, duration: 1.6 });
  });
}

export function scrollToY(y) {
  if (lenis) {
    lenis.scrollTo(y, { duration: 1.4 });
  } else {
    window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
  }
}

export function pauseScroll(paused) {
  if (lenis) {
    paused ? lenis.stop() : lenis.start();
  }
}

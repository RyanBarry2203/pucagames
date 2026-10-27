import { gsap, pauseScroll } from "../core/engine.js";

// First-visit intro: a triskele draws itself while fonts and images load, then the night opens out from the centre.
// The <head> script decides whether to show it (html.is-loading); it never runs in gentle mode or twice per visit.
export function initPreloader() {
  const root = document.documentElement;
  const preloader = document.querySelector("[data-preloader]");
  if (!preloader || !root.classList.contains("is-loading")) {
    preloader?.remove();
    return Promise.resolve();
  }

  pauseScroll(true);
  const count = preloader.querySelector("[data-preloader-count]");
  const progress = { value: 0 };
  const drawn = gsap.timeline()
    .fromTo(preloader.querySelectorAll("path, circle"), { drawSVG: "0%" }, {
      drawSVG: "100%", duration: 1.5, stagger: 0.12, ease: "power2.inOut",
    })
    .from(preloader.querySelector(".preloader__name"), { opacity: 0, y: 12, duration: 0.8 }, 0.4);

  const loaded = Promise.all([
    document.fonts.ready,
    new Promise((resolve) => (document.readyState === "complete" ? resolve() : window.addEventListener("load", resolve))),
  ]);
  // never hold anyone for more than 4 seconds on a slow connection
  const ready = Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 4000))]);

  const counting = gsap.to(progress, {
    value: 90, duration: 1.6, ease: "power1.out",
    onUpdate: () => (count.textContent = Math.round(progress.value)),
  });

  return Promise.all([ready, drawn.then(), counting.then()]).then(() => new Promise((resolve) => {
    gsap.timeline({
      onComplete: () => {
        preloader.remove();
        resolve();
      },
    })
      .to(progress, { value: 100, duration: 0.3, onUpdate: () => (count.textContent = Math.round(progress.value)) })
      .add(() => {
        root.classList.remove("is-loading");
        pauseScroll(false);
        try {
          sessionStorage.setItem("intro", "1");
        } catch {
          // without storage the intro simply plays again next time
        }
      })
      .to(preloader, { clipPath: "circle(0% at 50% 50%)", duration: 1.2, ease: "expo.inOut" }, "+=0.1");
  }));
}

import { gsap, ScrollTrigger } from "../core/engine.js";
import { reducedMotion } from "../core/ticker.js";

const DRIFTING_IMAGES = ".game-card__media img, .game-teaser img, .gallery__shot img";

// Horizontal showcases ([data-hscroll] tracks: the games on the home page, the screenshot gallery on a game page).
// On wide screens the section pins and vertical scrolling slides the track sideways, each image drifting inside its
// frame. Phones and gentle mode keep a normal vertical list.
export function initHScroll() {
  if (reducedMotion) {
    return;
  }
  for (const track of document.querySelectorAll("[data-hscroll]")) {
    const section = track.closest("section");

    ScrollTrigger.matchMedia({
      "(min-width: 900px)": () => {
        section.classList.add("is-horizontal");
        const distance = () => track.scrollWidth - window.innerWidth;
        const revealAll = () => [...track.children].forEach((card) => card.classList.add("is-visible"));
        const slide = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 0.7,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // cards can slide past the viewport too fast for their own reveal, so show them all once the pin starts
            onEnter: revealAll,
            onEnterBack: revealAll,
          },
        });

        for (const image of track.querySelectorAll(DRIFTING_IMAGES)) {
          gsap.fromTo(image, { xPercent: -7, scale: 1.18 }, {
            xPercent: 7,
            scale: 1.18,
            ease: "none",
            scrollTrigger: {
              trigger: image.parentElement,
              containerAnimation: slide,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          });
        }
        return () => section.classList.remove("is-horizontal");
      },
    });
  }
}

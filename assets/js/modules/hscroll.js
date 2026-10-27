import { gsap, ScrollTrigger } from "../core/engine.js";
import { reducedMotion } from "../core/ticker.js";

// The games showcase: on wide screens the section pins and vertical scrolling slides the cards sideways, each
// screenshot drifting inside its frame. Phones and gentle mode keep a normal vertical list.
export function initHScroll() {
  const track = document.querySelector("[data-hscroll]");
  if (!track || reducedMotion) {
    return;
  }
  const section = track.closest("section");

  ScrollTrigger.matchMedia({
    "(min-width: 900px)": () => {
      section.classList.add("is-horizontal");
      const distance = () => track.scrollWidth - window.innerWidth;
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
          onEnter: () => [...track.children].forEach((card) => card.classList.add("is-visible")),
          onEnterBack: () => [...track.children].forEach((card) => card.classList.add("is-visible")),
        },
      });

      for (const image of track.querySelectorAll(".game-card__media img, .game-teaser img")) {
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

import { gsap } from "../core/engine.js";
import { reducedMotion } from "../core/ticker.js";

// Scroll-scrubbed depth for art panels ([data-parallax="amount in %"]) and section headings whose words rise out of
// a mask as they arrive.
export function initParallax() {
  if (reducedMotion) {
    return;
  }
  for (const element of document.querySelectorAll("[data-parallax]")) {
    const amount = Number(element.dataset.parallax);
    gsap.fromTo(element, { yPercent: -amount / 2 }, {
      yPercent: amount / 2,
      ease: "none",
      scrollTrigger: { trigger: element.parentElement, start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  for (const heading of document.querySelectorAll("main h2:not(.visually-hidden)")) {
    const text = heading.textContent.trim();
    heading.setAttribute("aria-label", text);
    heading.textContent = "";
    text.split(/\s+/).forEach((word, index) => {
      const outer = document.createElement("span");
      const inner = document.createElement("span");
      outer.className = "rise-word";
      outer.setAttribute("aria-hidden", "true");
      inner.textContent = word;
      outer.append(inner);
      heading.append(index ? " " : "", outer);
    });
    gsap.from(heading.querySelectorAll(".rise-word > span"), {
      yPercent: 115,
      rotate: 5,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.08,
      scrollTrigger: { trigger: heading, start: "top 88%", once: true },
    });
  }
}

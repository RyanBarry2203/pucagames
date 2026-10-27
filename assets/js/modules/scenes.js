import { gsap } from "../core/engine.js";
import { onFrame, reducedMotion, finePointer, clamp, lerp } from "../core/ticker.js";

// Section choreography, scrubbed to the scroll so it plays forwards and backwards with you.
// - Each section has a huge outlined word in Irish drifting sideways behind it.
// - The Book of Kells panel wipes open and turns in 3D as it passes.
// - The Lindisfarne carpet page settles from a slow zoom and turn behind the lore.
// - News cards fly up out of depth; the contact fire flares as you arrive; the footer wordmark rises letter by letter.
// - The shapeshifter stage leans towards the pointer.
const GHOSTS = {
  games: "Cluichí",
  team: "An Púca",
  lore: "Seanchas",
  story: "Sligeach",
  news: "Nuacht",
  contact: "Fáilte",
};

export function initScenes() {
  if (reducedMotion) {
    return;
  }

  for (const [id, word] of Object.entries(GHOSTS)) {
    const section = document.getElementById(id);
    if (!section) {
      continue;
    }
    const host = section.querySelector(".shift__sticky") || section;
    const ghost = document.createElement("span");
    ghost.className = "ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.textContent = word;
    host.prepend(ghost);
    gsap.fromTo(ghost, { xPercent: 12 }, {
      xPercent: -38,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1.2 },
    });
  }

  const illumination = document.querySelector(".story__illumination");
  if (illumination) {
    gsap.timeline({
      scrollTrigger: { trigger: illumination, start: "top 95%", end: "bottom 5%", scrub: 1 },
    })
      .fromTo(illumination, { clipPath: "inset(0 0 100% 0)", rotateY: -28, rotateX: 8 }, {
        clipPath: "inset(0 0 0% 0)", rotateY: 0, rotateX: 0, ease: "power2.out", duration: 0.45,
      })
      .to(illumination, { rotateY: 18, rotateX: -6, ease: "power1.in", duration: 0.55 });
    gsap.fromTo(illumination.querySelector("img"), { scale: 1.45 }, {
      scale: 1,
      ease: "none",
      scrollTrigger: { trigger: illumination, start: "top 95%", end: "center 40%", scrub: 1 },
    });
  }

  const carpet = document.querySelector(".lore__carpet");
  if (carpet) {
    gsap.fromTo(carpet, { scale: 1.5, rotate: -8 }, {
      scale: 1.05,
      rotate: 0,
      ease: "none",
      scrollTrigger: { trigger: carpet.parentElement, start: "top bottom", end: "bottom top", scrub: 1.5 },
    });
  }

  const newsCards = gsap.utils.toArray(".news-card");
  if (newsCards.length) {
    gsap.from(newsCards, {
      y: 160,
      z: -260,
      rotationX: 38,
      opacity: 0,
      duration: 1.3,
      ease: "expo.out",
      stagger: 0.14,
      clearProps: "transform",
      scrollTrigger: { trigger: newsCards[0].parentElement, start: "top 88%", once: true },
    });
  }

  const fire = document.querySelector(".contact__fire");
  if (fire) {
    gsap.fromTo(fire, { scale: 0.65, opacity: 0.15 }, {
      scale: 1.12,
      opacity: 0.95,
      ease: "power2.out",
      scrollTrigger: { trigger: "#contact", start: "top bottom", end: "center center", scrub: 1 },
    });
  }

  const footer = document.querySelector(".site-footer");
  if (footer) {
    const mark = document.createElement("p");
    mark.className = "footer-mark";
    mark.setAttribute("aria-hidden", "true");
    for (const letter of "Púca Games") {
      const span = document.createElement("span");
      span.textContent = letter === " " ? " " : letter;
      mark.append(span);
    }
    footer.append(mark);
    gsap.from(mark.children, {
      yPercent: 110,
      rotate: 8,
      ease: "back.out(1.4)",
      stagger: 0.04,
      scrollTrigger: { trigger: footer, start: "top 90%", end: "bottom bottom", scrub: 1 },
    });
  }

  // the shapeshifter stage leans towards the pointer, as if the animal turns to look at you
  const stage = document.querySelector(".shift__stage");
  if (stage && finePointer) {
    let tx = 0;
    let ty = 0;
    onFrame((s, dt) => {
      const rect = stage.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > s.vh) {
        return;
      }
      const dx = clamp((s.pointerX - (rect.left + rect.width / 2)) / rect.width, -1, 1);
      const dy = clamp((s.pointerY - (rect.top + rect.height / 2)) / rect.height, -1, 1);
      const ease = 1 - Math.pow(1 - 0.08, dt * 60);
      tx = lerp(tx, dy * -14, ease);
      ty = lerp(ty, dx * 18, ease);
      stage.style.setProperty("--tx", `${tx.toFixed(2)}deg`);
      stage.style.setProperty("--ty", `${ty.toFixed(2)}deg`);
    });
  }
}

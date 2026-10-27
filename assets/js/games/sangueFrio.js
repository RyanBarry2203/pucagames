import { onFrame, finePointer, reducedMotion } from "../core/ticker.js";
import { emit } from "../modules/fx.js";

const MAGAZINE = 6;
const MAX_HOLES = 14;
const MARK_LIMIT = 6;

// A Sangue Frio's hero is a shooting range. The cursor is a gun sight; clicking fires: muzzle flash, a kick of the
// sight, screen shake, a bullet hole and a brass casing. Six rounds, then a reload. Hold right-click for the game's
// own mechanic: time slows, the colour drains to sepia, left-clicks mark up to six targets, and letting go fires
// them all in order.
export function initSangueFrio() {
  const range = document.querySelector("[data-range]");
  const hero = range?.closest(".page-hero");
  if (!range || reducedMotion) {
    range?.remove();
    return;
  }
  const holes = range.querySelector("[data-holes]");
  const sight = range.querySelector("[data-sight]");
  const ammo = range.querySelector("[data-ammo]");
  hero.classList.add("is-range");

  let rounds = MAGAZINE;
  let reloading = false;
  let kick = 0;
  let marking = false;
  const marks = [];

  function local(event) {
    const rect = hero.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, cx: event.clientX, cy: event.clientY };
  }

  function shake(strength) {
    hero.animate([
      { transform: "translate(0, 0)" },
      { transform: `translate(${strength}px, ${-strength * 0.6}px)` },
      { transform: `translate(${-strength * 0.7}px, ${strength * 0.4}px)` },
      { transform: "translate(0, 0)" },
    ], { duration: 160, easing: "ease-out" });
  }

  function reload() {
    reloading = true;
    range.classList.add("is-reloading");
    ammo.textContent = "…";
    setTimeout(() => {
      rounds = MAGAZINE;
      reloading = false;
      range.classList.remove("is-reloading");
      ammo.textContent = rounds;
    }, 900);
  }

  function fire(point) {
    if (reloading) {
      return;
    }
    rounds -= 1;
    ammo.textContent = rounds;
    kick = 1;
    shake(7);

    const flash = document.createElement("span");
    flash.className = "range__flash";
    flash.style.left = `${point.x}px`;
    flash.style.top = `${point.y}px`;
    holes.append(flash);
    setTimeout(() => flash.remove(), 120);

    const hole = document.createElement("span");
    hole.className = "range__hole";
    hole.style.left = `${point.x}px`;
    hole.style.top = `${point.y}px`;
    hole.style.rotate = `${Math.random() * 360}deg`;
    holes.append(hole);
    if (holes.querySelectorAll(".range__hole").length > MAX_HOLES) {
      holes.querySelector(".range__hole").remove();
    }
    setTimeout(() => hole.classList.add("is-fading"), 5000);
    setTimeout(() => hole.remove(), 6500);

    // sparks at the impact, a brass casing flicked out to the right
    emit(point.cx, point.cy, { count: 14, speed: 220, life: 0.45, size: 1.4, rise: -40, ember: 0.6 });
    emit(point.cx + 24, point.cy + 10, { count: 1, speed: 160, angle: -Math.PI / 3, spread: 0.4, life: 1.1, size: 2.6, rise: -260, ember: 0 });

    if (rounds <= 0) {
      reload();
    }
  }

  hero.addEventListener("pointerdown", (event) => {
    if (event.target.closest("a, button")) {
      return;
    }
    if (event.button === 2) {
      marking = true;
      hero.classList.add("is-sangue-frio");
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const point = local(event);
    if (marking) {
      if (marks.length < MARK_LIMIT) {
        const mark = document.createElement("span");
        mark.className = "range__mark";
        mark.style.left = `${point.x}px`;
        mark.style.top = `${point.y}px`;
        mark.textContent = marks.length + 1;
        holes.append(mark);
        marks.push({ point, mark });
      }
      return;
    }
    fire(point);
  });

  // letting go of right-click executes every mark in order
  window.addEventListener("pointerup", (event) => {
    if (event.button !== 2 || !marking) {
      return;
    }
    marking = false;
    hero.classList.remove("is-sangue-frio");
    rounds = MAGAZINE;
    marks.splice(0).forEach(({ point, mark }, i) => {
      setTimeout(() => {
        mark.remove();
        fire(point);
        if (rounds <= 0) {
          rounds = MAGAZINE;
        }
      }, 140 + i * 130);
    });
  });
  hero.addEventListener("contextmenu", (event) => event.preventDefault());

  if (!finePointer) {
    return;
  }
  hero.addEventListener("pointerenter", () => range.classList.add("is-aiming"));
  hero.addEventListener("pointerleave", () => range.classList.remove("is-aiming"));
  hero.addEventListener("pointermove", (event) => {
    const point = local(event);
    sight.style.setProperty("--x", `${point.x}px`);
    sight.style.setProperty("--y", `${point.y}px`);
    range.classList.toggle("is-over-ui", Boolean(event.target.closest("a, button")));
  });
  onFrame((s, dt) => {
    if (kick > 0.001) {
      kick *= Math.pow(0.82, dt * 60);
      sight.style.setProperty("--kick", kick.toFixed(3));
    }
  });
}

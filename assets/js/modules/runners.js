import { gsap, ScrollTrigger } from "../core/engine.js";
import { reducedMotion } from "../core/ticker.js";
import { emit } from "./fx.js";

// The Púca's three shapes run across the screen as you scroll into a section, leaving gold dust behind.
// The run is tied to scroll distance (not time), so they freeze mid-stride when you stop and gallop when you scroll.
// With painted frames (data-frames on the stage) they alternate a "reach" and a "gather" pose; until then the line
// art bounds along with a leap, a rock and a little squash and stretch.
// start/end are when the run happens relative to the section arriving; each finishes before that section's own
// centrepiece reaches the bottom of the screen, so a runner never crosses the shapeshifter stage.
const RUNS = [
  { animal: "hound", trigger: "#games", direction: 1, start: "top 110%", end: "top 20%" },
  { animal: "boar", trigger: "#team", direction: -1, start: "top 145%", end: "top 72%" },
  { animal: "fox", trigger: "#lore", direction: 1, start: "top 105%", end: "top 25%" },
];

export function initRunners() {
  const stage = document.querySelector("[data-runners]");
  if (!stage || reducedMotion) {
    return;
  }
  const painted = stage.dataset.frames === "true";

  for (const run of RUNS) {
    const section = document.querySelector(run.trigger);
    if (!section) {
      continue;
    }
    const runner = document.createElement("div");
    runner.className = `runner runner--${run.animal}${run.direction < 0 ? " is-flipped" : ""}`;
    runner.innerHTML = painted
      ? `<div class="runner__body"><img src="assets/img/scene/${run.animal}-reach.png" alt=""><img src="assets/img/scene/${run.animal}-gather.png" alt=""></div>`
      : `<div class="runner__body"><svg viewBox="0 0 400 300"><use href="#${run.animal}" /></svg></div>`;
    stage.append(runner);

    const body = runner.querySelector(".runner__body");
    const frames = painted ? [...body.querySelectorAll("img")] : [];
    let phase = 0;
    let lastX = null;

    ScrollTrigger.create({
      trigger: section,
      start: run.start,
      end: run.end,
      onUpdate(self) {
        const width = window.innerWidth;
        const from = run.direction > 0 ? -0.35 * width : 1.05 * width;
        const to = run.direction > 0 ? 1.05 * width : -0.35 * width;
        const x = from + (to - from) * self.progress;
        if (lastX !== null) {
          phase += Math.abs(x - lastX) * 0.035;
        }
        lastX = x;

        const visible = self.progress > 0.001 && self.progress < 0.999;
        gsap.set(runner, { x, autoAlpha: visible ? 1 : 0 });
        if (!visible) {
          return;
        }

        const stride = Math.sin(phase);
        body.style.transform = `translateY(${(-Math.abs(stride) * 14).toFixed(1)}%) `
          + `rotate(${(Math.cos(phase) * 7 * run.direction).toFixed(2)}deg) `
          + `scale(${(1 + stride * 0.05).toFixed(3)}, ${(1 - stride * 0.05).toFixed(3)})`;
        if (frames.length) {
          const reach = Math.floor(phase / Math.PI) % 2 === 0;
          frames[0].style.opacity = reach ? "1" : "0";
          frames[1].style.opacity = reach ? "0" : "1";
        }

        const rect = body.getBoundingClientRect();
        const tailX = run.direction > 0 ? rect.left + rect.width * 0.2 : rect.right - rect.width * 0.2;
        emit(tailX, rect.top + rect.height * 0.75, { count: 2, speed: 30, life: 1.2, size: 1.5, rise: 22 });
      },
      onLeave: () => gsap.set(runner, { autoAlpha: 0 }),
      onLeaveBack: () => gsap.set(runner, { autoAlpha: 0 }),
    });
  }
}

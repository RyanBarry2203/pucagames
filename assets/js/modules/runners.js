import { gsap, ScrollTrigger } from "../core/engine.js";
import { reducedMotion, state } from "../core/ticker.js";
import { emit } from "./fx.js";

// The Púca's shapes run across the page as you scroll between sections, leaving gold dust behind.
// Each one has its own lane: a strip of empty page just above the section it introduces (inside that section's top
// padding, or its own strip where the section has none), so an animal never crosses a heading, a paragraph or a
// button at any screen size. The run is tied to scroll distance (not time): the animal crosses while its lane passes
// through the window, freezes mid-stride when you stop and gallops when you scroll.
// With painted frames (data-frames) they alternate a "reach" and a "gather" pose; without, the line art bounds along
// with a rock and a little squash and stretch.
const RUNS = [
  { animal: "hound", before: "#games", direction: 1 },
  // the team section is a pinned stage with no padding of its own, so its lane takes its own space
  { animal: "boar", before: "#team", direction: -1, own: true },
  { animal: "fox", before: "#lore", direction: 1 },
  { animal: "horse", before: "#story", direction: -1 },
];

export function initRunners() {
  const host = document.querySelector("[data-runners]");
  if (!host || reducedMotion) {
    return;
  }
  // animals listed in data-frames have painted reach/gather frames in assets/img/scene; the rest use line art
  const painted = new Set((host.dataset.frames || "").split(/\s+/));

  for (const run of RUNS) {
    const section = document.querySelector(run.before);
    if (section) {
      createRun(run, section, painted.has(run.animal));
    }
  }
}

function createRun(run, section, isPainted) {
  const lane = document.createElement("div");
  lane.className = `run-lane run-lane--${run.animal}${run.own ? " run-lane--own" : ""}`;
  lane.setAttribute("aria-hidden", "true");

  const runner = document.createElement("div");
  runner.className = `runner runner--${run.animal}${run.direction < 0 ? " is-flipped" : ""}`;
  runner.innerHTML = isPainted
    ? `<div class="runner__body is-painted">`
      + `<img src="assets/img/scene/${run.animal}-reach.webp" alt="" loading="lazy" decoding="async">`
      + `<img src="assets/img/scene/${run.animal}-gather.webp" alt="" loading="lazy" decoding="async"></div>`
    : `<div class="runner__body"><svg viewBox="0 0 400 300"><use href="#${run.animal}" /></svg></div>`;
  lane.append(runner);
  section.before(lane);

  const body = runner.querySelector(".runner__body");
  const frames = [...body.querySelectorAll("img")];
  // a painted animal waits until both of its frames have arrived, so it never runs half-drawn
  const ready = () => frames.every((frame) => frame.complete && frame.naturalWidth > 0);
  let size = { width: 0, height: 0, lane: 0 };
  let phase = 0;
  let lastX = null;

  ScrollTrigger.create({
    trigger: lane,
    start: "top bottom",
    end: "bottom top",
    onRefresh() {
      size = { width: runner.offsetWidth, height: runner.offsetHeight, lane: lane.offsetHeight };
    },
    onUpdate(self) {
      const from = run.direction > 0 ? -size.width : state.vw;
      const to = run.direction > 0 ? state.vw : -size.width;
      const x = from + (to - from) * self.progress;
      if (lastX !== null) {
        phase += Math.abs(x - lastX) * 0.035;
      }
      lastX = x;

      const visible = self.progress > 0.001 && self.progress < 0.999 && ready();
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

      // the lane's place on screen follows from the trigger's own numbers, so nothing is measured mid-scroll
      const laneTop = self.start + state.vh - self.scroll();
      const tailX = x + (run.direction > 0 ? size.width * 0.2 : size.width * 0.8);
      const tailY = laneTop + size.lane - size.height * 0.25;
      emit(tailX, tailY, { count: 2, speed: 30, life: 1.2, size: 1.5, rise: 22 });
    },
    onLeave: () => gsap.set(runner, { autoAlpha: 0 }),
    onLeaveBack: () => gsap.set(runner, { autoAlpha: 0 }),
  });
}

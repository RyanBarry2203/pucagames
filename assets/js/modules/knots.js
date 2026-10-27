import { gsap } from "../core/engine.js";
import { reducedMotion } from "../core/ticker.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const HEIGHT = 34;
const CELL = 64;

// Knotwork dividers generated to fit any width. Two ribbon strands plait across the rule; each crossing alternates
// which strand goes over (Celtic interlace never lets one strand stay on top). A ribbon is a wide gold stroke with a
// narrow dark stroke down its middle; an "over" segment first paints a dark halo that cuts a gap in the strand
// beneath, which is what makes it read as woven. They weave themselves in, left to right, as they scroll into view.
function segment(x0, yFrom, x1, yTo) {
  const c = (x1 - x0) * 0.42;
  return `M${x0} ${yFrom}C${x0 + c} ${yFrom} ${x1 - c} ${yTo} ${x1} ${yTo}`;
}

function buildPlait(width) {
  const top = 7;
  const bottom = HEIGHT - 7;
  const under = [];
  const over = [];
  for (let x = -CELL; x < width + CELL; x += CELL) {
    const mid = x + CELL / 2;
    // first half: strand A falls over strand B; second half: strand B rises over strand A
    over.push(segment(x, top, mid, bottom));
    under.push(segment(x, bottom, mid, top));
    under.push(segment(mid, bottom, x + CELL, top));
    over.push(segment(mid, top, x + CELL, bottom));
  }
  const ribbon = (d) => `<path class="knot__halo" d="${d}"/><path class="knot__gold" d="${d}"/><path class="knot__core" d="${d}"/>`;
  return `<path class="knot__gold" d="${under.join("")}"/><path class="knot__core" d="${under.join("")}"/>${over.map(ribbon).join("")}`;
}

export function initKnots() {
  const rules = [...document.querySelectorAll("[data-knot]")];
  for (const rule of rules) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "knot");
    rule.append(svg);

    const medallion = document.createElementNS(SVG_NS, "svg");
    medallion.setAttribute("class", "knot-rule__medallion");
    medallion.setAttribute("viewBox", "-50 -50 100 100");
    medallion.innerHTML = '<circle r="44"/><use href="#triskele" x="-34" y="-34" width="68" height="68"/>';
    rule.append(medallion);

    const draw = () => {
      const width = rule.clientWidth;
      svg.setAttribute("viewBox", `0 0 ${width} ${HEIGHT}`);
      svg.innerHTML = buildPlait(width);
    };
    draw();
    new ResizeObserver(draw).observe(rule);

    if (reducedMotion) {
      continue;
    }
    gsap.timeline({ scrollTrigger: { trigger: rule, start: "top 92%", once: true } })
      .fromTo(svg, { clipPath: "inset(0 50% 0 50%)" }, { clipPath: "inset(0 0% 0 0%)", duration: 1.6, ease: "power3.inOut" })
      .fromTo(medallion, { scale: 0, rotate: -180 }, { scale: 1, rotate: 0, duration: 1.2, ease: "back.out(1.6)" }, 0.2);
  }
}

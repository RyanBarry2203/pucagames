import { onFrame, reducedMotion, watchVisibility, clamp } from "../core/ticker.js";
import { scrollToY } from "../core/engine.js";

const TAU = Math.PI * 2;

// "One spirit, three shapes". The section is several screens tall with a sticky stage inside; how far you have
// scrolled through it decides which animal the Púca is. A change of shape undraws one animal, draws the next
// (CSS animates --draw) and throws a burst of gold sparks.
export function initShapeshifter() {
  const section = document.querySelector("[data-shift]");
  if (!section) {
    return;
  }
  const forms = [...section.querySelectorAll("[data-form]")];
  const members = [...section.querySelectorAll("[data-member]")];
  const chips = [...section.querySelectorAll("[data-shift-to]")];
  const sparks = createSparks(section.querySelector("[data-sparks]"));
  const visibility = watchVisibility(section, "0px");
  let index = 0;

  function show(next) {
    if (next === index) {
      return;
    }
    index = next;
    forms.forEach((form, i) => form.classList.toggle("is-active", i === next));
    members.forEach((member, i) => member.classList.toggle("is-active", i === next));
    chips.forEach((chip, i) => {
      chip.classList.toggle("is-active", i === next);
      chip.setAttribute("aria-pressed", String(i === next));
    });
    if (!reducedMotion) {
      sparks.burst();
    }
  }

  chips.forEach((chip, i) => {
    chip.addEventListener("click", () => {
      // jump to the middle of that shape's slice of the scroll
      const total = section.offsetHeight - window.innerHeight;
      const top = section.getBoundingClientRect().top + window.scrollY;
      scrollToY(top + (total * (i + 0.5)) / forms.length);
    });
  });

  onFrame((s, dt) => {
    if (!visibility.visible) {
      return;
    }
    const total = section.offsetHeight - s.vh;
    const progress = clamp(-section.getBoundingClientRect().top / total, 0, 1);
    section.style.setProperty("--p", progress.toFixed(4));
    show(Math.min(forms.length - 1, Math.floor(progress * forms.length)));
    if (!reducedMotion) {
      sparks.update(s.time, dt);
    }
  });
}

// Gold particles on the stage canvas: a slow ring of orbiting motes, plus bursts when the Púca changes shape.
function createSparks(canvas) {
  const ctx = canvas.getContext("2d");
  const particles = [];
  const orbiters = Array.from({ length: 22 }, () => ({
    angle: Math.random() * TAU,
    speed: (0.05 + Math.random() * 0.15) * (Math.random() < 0.5 ? -1 : 1),
    radius: 0.36 + Math.random() * 0.1,
    size: 0.6 + Math.random() * 1.4,
    phase: Math.random() * TAU,
  }));
  let size = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = canvas.clientWidth;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(canvas);

  function dot(x, y, radius, alpha, colour = "240, 223, 168") {
    ctx.fillStyle = `rgba(${colour}, ${(alpha * 0.2).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(${colour}, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }

  return {
    burst() {
      for (let i = 0; i < 70; i++) {
        const angle = Math.random() * TAU;
        const speed = 60 + Math.random() * 220;
        particles.push({
          x: size / 2,
          y: size / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.6 + Math.random() * 0.8,
          r: 0.8 + Math.random() * 2,
          ember: Math.random() < 0.25,
        });
      }
    },
    update(time, dt) {
      ctx.clearRect(0, 0, size, size);
      const centre = size / 2;
      for (const orbiter of orbiters) {
        orbiter.angle += orbiter.speed * dt;
        const r = orbiter.radius * size;
        const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(time * 2 + orbiter.phase));
        dot(centre + Math.cos(orbiter.angle) * r, centre + Math.sin(orbiter.angle) * r, orbiter.size, alpha);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 - 20 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        dot(p.x, p.y, p.r, p.life, p.ember ? "208, 116, 47" : "240, 223, 168");
      }
    },
  };
}

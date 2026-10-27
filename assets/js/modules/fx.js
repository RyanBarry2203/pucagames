import { onFrame, finePointer, reducedMotion } from "../core/ticker.js";

const TAU = Math.PI * 2;
const particles = [];
let ctx = null;

// A full-screen canvas above the page (pointer-events: none) for loose particles: the gold dust that trails the
// cursor, bursts when you click, and the trails the running animals leave. Other modules call emit().
export function emit(x, y, options = {}) {
  if (!ctx) {
    return;
  }
  const { count = 1, speed = 40, spread = TAU, angle = 0, life = 1, size = 1.6, ember = 0.15, rise = 30 } = options;
  for (let i = 0; i < count; i++) {
    const direction = angle + (Math.random() - 0.5) * spread;
    const velocity = speed * (0.4 + Math.random() * 0.6);
    particles.push({
      x,
      y,
      vx: Math.cos(direction) * velocity,
      vy: Math.sin(direction) * velocity,
      rise,
      life,
      maxLife: life,
      size: size * (0.5 + Math.random()),
      colour: Math.random() < ember ? "208, 116, 47" : "240, 223, 168",
    });
  }
}

export function initFx() {
  const canvas = document.querySelector("[data-fx]");
  if (!canvas || reducedMotion) {
    canvas?.remove();
    return;
  }
  ctx = canvas.getContext("2d");

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  if (finePointer) {
    let lastX = 0;
    let lastY = 0;
    window.addEventListener("pointermove", (event) => {
      const moved = Math.hypot(event.clientX - lastX, event.clientY - lastY);
      if (moved > 14) {
        emit(event.clientX, event.clientY, { count: 1, speed: 12, life: 0.9, size: 1.3, rise: 18 });
        lastX = event.clientX;
        lastY = event.clientY;
      }
    }, { passive: true });
  }
  window.addEventListener("pointerdown", (event) => {
    emit(event.clientX, event.clientY, { count: 26, speed: 190, life: 0.9, size: 1.8, rise: -20 });
  });

  onFrame((s, dt) => {
    if (!particles.length) {
      return;
    }
    ctx.clearRect(0, 0, s.vw, s.vh);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 - p.rise * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(${p.colour}, ${(alpha * 0.22).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(${p.colour}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    if (!particles.length) {
      ctx.clearRect(0, 0, s.vw, s.vh);
    }
  });
}

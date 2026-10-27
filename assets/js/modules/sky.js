import { onFrame, reducedMotion, watchVisibility, clamp } from "../core/ticker.js";

const TAU = Math.PI * 2;
const GOLD = "240, 223, 168";
const EMBER = "208, 116, 47";

// The hero's night sky on a canvas: twinkling stars, the odd shooting star, and gold motes rising from the grass
// that drift away from the pointer.
export function initSky() {
  const canvas = document.querySelector("[data-sky]");
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  const visibility = watchVisibility(canvas, "0px");
  const stars = [];
  const motes = [];
  let width = 0;
  let height = 0;
  let shooting = null;
  let nextShot = 4;

  function spawnMote(anywhere) {
    return {
      x: Math.random() * width,
      y: anywhere ? height * (0.5 + Math.random() * 0.5) : height + 8,
      vx: 0,
      rise: 0.2 + Math.random() * 0.45,
      r: 0.6 + Math.random() * 1.5,
      phase: Math.random() * TAU,
      colour: Math.random() < 0.15 ? EMBER : GOLD,
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars.length = 0;
    const starCount = Math.round((width * height) / 4200);
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        // bias toward the top of the sky
        y: Math.pow(Math.random(), 1.7) * height * 0.72,
        r: 0.3 + Math.random() * 1.1,
        phase: Math.random() * TAU,
        speed: 0.6 + Math.random() * 1.8,
      });
    }
    motes.length = 0;
    const moteCount = Math.round(Math.min(80, (width * height) / 16000));
    for (let i = 0; i < moteCount; i++) {
      motes.push(spawnMote(true));
    }
  }

  function drawStars(time) {
    for (const star of stars) {
      const twinkle = reducedMotion ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
      ctx.fillStyle = `rgba(${GOLD}, ${(twinkle * 0.85).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, TAU);
      ctx.fill();
    }
  }

  function drawShootingStar(dt) {
    if (!shooting) {
      return;
    }
    shooting.x += shooting.vx * dt;
    shooting.y += shooting.vy * dt;
    shooting.life -= dt * 1.4;
    if (shooting.life <= 0) {
      shooting = null;
      return;
    }
    const tailX = shooting.x - shooting.vx * 0.12;
    const tailY = shooting.y - shooting.vy * 0.12;
    const gradient = ctx.createLinearGradient(shooting.x, shooting.y, tailX, tailY);
    gradient.addColorStop(0, `rgba(${GOLD}, ${shooting.life.toFixed(2)})`);
    gradient.addColorStop(1, `rgba(${GOLD}, 0)`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(shooting.x, shooting.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
  }

  function drawMotes(s, dt, top) {
    const px = s.pointerX;
    const py = s.pointerY - top;
    for (let i = 0; i < motes.length; i++) {
      const mote = motes[i];
      const dx = mote.x - px;
      const dy = mote.y - py;
      const distance = Math.hypot(dx, dy);
      if (s.hasPointer && distance < 140) {
        const push = (1 - distance / 140) * 2.4;
        mote.vx += (dx / (distance || 1)) * push;
        mote.y += (dy / (distance || 1)) * push * 0.6;
      }
      mote.vx *= 0.92;
      mote.phase += dt;
      mote.x += (mote.vx + Math.sin(mote.phase) * 0.35) * dt * 60;
      mote.y -= mote.rise * dt * 60;
      if (mote.y < height * 0.35 || mote.x < -20 || mote.x > width + 20) {
        motes[i] = spawnMote(false);
        continue;
      }
      // fade in from the grass and out as they climb
      const fade = clamp((height - mote.y) / 120, 0, 1) * clamp((mote.y - height * 0.35) / (height * 0.25), 0, 1);
      ctx.fillStyle = `rgba(${mote.colour}, ${(fade * 0.18).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.r * 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(${mote.colour}, ${(fade * 0.9).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.r, 0, TAU);
      ctx.fill();
    }
  }

  resize();
  window.addEventListener("resize", resize);

  if (reducedMotion) {
    drawStars(0);
    return;
  }

  onFrame((s, dt) => {
    if (!visibility.visible) {
      return;
    }
    ctx.clearRect(0, 0, width, height);
    drawStars(s.time);

    nextShot -= dt;
    if (nextShot <= 0) {
      shooting = {
        x: width * (0.3 + Math.random() * 0.7),
        y: height * Math.random() * 0.3,
        vx: -(500 + Math.random() * 400),
        vy: 160 + Math.random() * 140,
        life: 1,
      };
      nextShot = 7 + Math.random() * 9;
    }
    drawShootingStar(dt);
    drawMotes(s, dt, canvas.getBoundingClientRect().top);
  });
}

import { gsap } from "../core/engine.js";
import { onFrame, finePointer, reducedMotion, watchVisibility, clamp, lerp } from "../core/ticker.js";

// Where the black sun sits in the key art (fractions of the image), and its radius as a fraction of image height.
const SUN = { x: 0.5, y: 0.273, r: 0.085 };
const ART = { width: 1138, height: 640 };

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

// A living corona around the black sun: rays from angular noise that writhe over time, a heartbeat (lub-dub) in
// the brightness, and a flare when the lantern comes near.
const FRAGMENT = `
precision mediump float;
uniform vec2 uResolution;
uniform vec2 uSun;
uniform float uRadius;
uniform float uTime;
uniform float uBeat;
uniform float uFlare;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

void main() {
  vec2 p = gl_FragCoord.xy - uSun;
  float d = length(p);
  float angle = atan(p.y, p.x);
  float rays = noise(angle * 9.0 + uTime * 0.6) * 0.6 + noise(angle * 23.0 - uTime * 1.1) * 0.4;
  float reach = uRadius * (0.55 + rays * 0.9 + uBeat * 0.35 + uFlare * 0.6);
  float outside = max(d - uRadius, 0.0);
  float corona = exp(-outside / reach) * step(uRadius * 0.96, d);
  float ring = exp(-abs(d - uRadius) / (uRadius * 0.06));
  float glow = corona * (0.55 + uBeat * 0.6 + uFlare * 0.5) + ring * 0.8;
  vec3 colour = mix(vec3(0.55, 0.04, 0.02), vec3(1.0, 0.42, 0.18), clamp(ring + corona * 0.4, 0.0, 1.0));
  gl_FragColor = vec4(colour * glow, glow * 0.9);
}`;

// heartbeat envelope: two quick beats, then a pause (a "lub-dub" every 1.4 seconds)
function heartbeat(time) {
  const t = time % 1.4;
  return Math.exp(-Math.pow((t - 0.1) / 0.06, 2)) + 0.7 * Math.exp(-Math.pow((t - 0.36) / 0.07, 2));
}

// The image is shown with object-fit: cover, so work out where the sun lands on screen at this size.
function sunOnScreen(image) {
  const rect = image.getBoundingClientRect();
  const scale = Math.max(rect.width / ART.width, rect.height / ART.height);
  const shownWidth = ART.width * scale;
  const shownHeight = ART.height * scale;
  return {
    x: rect.left + (rect.width - shownWidth) / 2 + SUN.x * shownWidth,
    y: rect.top + (rect.height - shownHeight) / 2 + SUN.y * shownHeight,
    r: SUN.r * shownHeight,
  };
}

function initEclipse(hero, lantern) {
  const canvas = hero.querySelector("[data-eclipse]");
  const image = hero.querySelector(".page-hero__bg");
  const gl = canvas?.getContext("webgl", { premultipliedAlpha: true });
  if (!gl || !image) {
    return;
  }
  const shader = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const u = (name) => gl.getUniformLocation(program, name);
  const uniforms = {
    resolution: u("uResolution"), sun: u("uSun"), radius: u("uRadius"),
    time: u("uTime"), beat: u("uBeat"), flare: u("uFlare"),
  };

  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  const visibility = watchVisibility(hero, "0px");
  let flare = 0;
  onFrame((s) => {
    if (!visibility.visible) {
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const sun = sunOnScreen(image);
    const near = Math.hypot(lantern.x - sun.x, lantern.y - sun.y);
    flare = lerp(flare, clamp(1 - near / 320, 0, 1), 0.06);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.sun, (sun.x - canvasRect.left) * dpr, (canvasRect.bottom - sun.y) * dpr);
    gl.uniform1f(uniforms.radius, sun.r * dpr);
    gl.uniform1f(uniforms.time, s.time);
    gl.uniform1f(uniforms.beat, heartbeat(s.time));
    gl.uniform1f(uniforms.flare, flare);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
}

// The story pages hold the screen while you scroll; each painted page dissolves into the next.
function initPages() {
  const section = document.querySelector("[data-pages]");
  const pages = section ? gsap.utils.toArray(section.querySelectorAll("[data-page]")) : [];
  if (pages.length < 2) {
    return;
  }
  section.classList.add("is-pinned");
  const timeline = gsap.timeline({
    scrollTrigger: { trigger: section, start: "top top", end: `+=${pages.length * 90}%`, scrub: 0.8, pin: true },
  });
  pages.forEach((page, i) => {
    const image = page.querySelector("img");
    timeline.fromTo(image, { scale: 1.18 }, { scale: 1, duration: 1, ease: "none" }, i);
    if (i > 0) {
      timeline.fromTo(page, { opacity: 0, filter: "blur(14px) brightness(2)" }, {
        opacity: 1, filter: "blur(0px) brightness(1)", duration: 0.45, ease: "power1.out",
      }, i - 0.2);
    }
  });
}

// La Novia only moves when you are not looking. A pale figure waits at the edge of the screen; while the pointer is
// far from her she lurches closer in small stop-motion jumps, and when you look straight at her she is gone.
function initNovia() {
  const novia = document.querySelector("[data-novia]");
  if (!novia || !finePointer) {
    novia?.remove();
    return;
  }
  let step = 0;
  let cooldown = 3;
  const place = () => {
    const progress = step / 6;
    novia.style.setProperty("--n-scale", (0.55 + progress * 0.9).toFixed(2));
    novia.style.setProperty("--n-x", `${(-progress * 22).toFixed(1)}vw`);
    novia.style.setProperty("--n-o", (0.22 + progress * 0.5).toFixed(2));
  };
  place();
  onFrame((s, dt) => {
    const rect = novia.getBoundingClientRect();
    const watched = s.hasPointer && Math.hypot(s.pointerX - (rect.left + rect.width / 2), s.pointerY - (rect.top + rect.height / 2)) < 160;
    if (watched && step > 0) {
      novia.classList.add("is-seen");
      step = 0;
      cooldown = 4;
      setTimeout(() => {
        novia.classList.remove("is-seen");
        place();
      }, 900);
      return;
    }
    cooldown -= dt;
    if (cooldown <= 0 && !watched && step < 6) {
      step += 1;
      cooldown = 1.6 + Math.random() * 2.2;
      place();
    }
  });
}

export function initCorazonNegro() {
  const hero = document.querySelector(".page-hero");
  if (!hero || reducedMotion) {
    return;
  }
  hero.classList.add("is-dark");

  // the lantern follows the pointer (or drifts by itself on touch screens)
  const lanternEl = hero.querySelector("[data-lantern]");
  const lantern = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
  onFrame((s, dt) => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < 0) {
      return;
    }
    const tx = s.hasPointer ? s.pointerX : rect.left + rect.width * (0.5 + Math.sin(s.time * 0.4) * 0.3);
    const ty = s.hasPointer ? s.pointerY : rect.top + rect.height * (0.45 + Math.cos(s.time * 0.3) * 0.15);
    const ease = 1 - Math.pow(1 - 0.12, dt * 60);
    lantern.x = lerp(lantern.x, tx, ease);
    lantern.y = lerp(lantern.y, ty, ease);
    // a candle flame never holds still
    const flicker = 1 + Math.sin(s.time * 13) * 0.03 + Math.sin(s.time * 7.3) * 0.04;
    lanternEl.style.setProperty("--lx", `${(lantern.x - rect.left).toFixed(1)}px`);
    lanternEl.style.setProperty("--ly", `${(lantern.y - rect.top).toFixed(1)}px`);
    lanternEl.style.setProperty("--lr", flicker.toFixed(3));
  });

  initEclipse(hero, lantern);
  initPages();
  initNovia();
}

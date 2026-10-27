import { onFrame, state, reducedMotion, watchVisibility } from "../core/ticker.js";

// Living mist over the hero, drawn by a WebGL fragment shader. Layered value noise (fbm) is warped by itself so the
// fog curls rather than slides, and it parts in a swirl around the pointer. `fog.density` (0..1) is animated by the
// hero journey: thin ground mist at the top of the page, a white-out by the end of the pin.
export const fog = { density: 0.12 };

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAGMENT = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDensity;
uniform vec2 uPointer;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0) * 2.4;

  vec2 toPointer = uv - uPointer;
  float swirl = exp(-dot(toPointer, toPointer) * 22.0);
  p += swirl * vec2(-toPointer.y, toPointer.x) * 2.0;

  float t = uTime * 0.035;
  float n = fbm(p + vec2(t * 2.0, t));
  n = fbm(p + n * 1.6 + vec2(-t, t * 0.6));

  float ground = smoothstep(0.7, 0.0, uv.y);
  float amount = mix(ground * 0.6, 1.25, uDensity);
  float alpha = smoothstep(0.32, 0.86, n) * amount * (1.0 - swirl * 0.7);
  alpha = clamp(alpha + uDensity * uDensity * 0.55, 0.0, 1.0);

  vec3 colour = mix(vec3(0.42, 0.5, 0.44), vec3(0.86, 0.83, 0.68), n);
  gl_FragColor = vec4(colour * alpha, alpha);
}`;

export function initFog() {
  const canvas = document.querySelector("[data-fog]");
  const gl = canvas?.getContext("webgl", { premultipliedAlpha: true, antialias: false });
  if (!gl) {
    return;
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    canvas.remove();
    return;
  }
  gl.useProgram(program);

  // one triangle that covers the whole screen
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    time: gl.getUniformLocation(program, "uTime"),
    density: gl.getUniformLocation(program, "uDensity"),
    pointer: gl.getUniformLocation(program, "uPointer"),
  };

  // rendered at half resolution: fog is soft anyway, and it quarters the pixel work
  function resize() {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * 0.5));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * 0.5));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  const pointer = { x: 0.5, y: 0.3 };
  function draw(time) {
    const rect = canvas.getBoundingClientRect();
    if (state.hasPointer) {
      pointer.x += ((state.pointerX - rect.left) / rect.width - pointer.x) * 0.08;
      pointer.y += (1 - (state.pointerY - rect.top) / rect.height - pointer.y) * 0.08;
    }
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.density, fog.density);
    gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (reducedMotion) {
    draw(20);
    return;
  }
  const visibility = watchVisibility(canvas, "0px");
  onFrame((s) => {
    if (visibility.visible) {
      draw(s.time);
    }
  });
}

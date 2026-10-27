import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { onFrame, state, reducedMotion, watchVisibility, lerp } from "../core/ticker.js";

// The hero as a real 3D scene. Each painted layer is a flat panel at its own distance from the camera; fog darkens
// the far ones, gold motes drift through the space between them, mist banks roll at several depths and a bloom pass
// makes the moon and the gold glow. Scrolling flies the camera forward through the brambles towards the stones
// (`world.fly`, animated by journey.js) and the pointer steers it, so the parallax is real perspective.
export const world = { fly: 0, active: false };

const FOV = 38;
const CAMERA_Z = 10;
const BG = 0x0b110f;

// top: where the panel's top edge sits, as a fraction of the frame height from the bottom of the view.
// width: panel width as a multiple of the view width at that depth (over 1 so camera moves never show an edge).
const LAYERS = [
  { name: "mountain", src: "assets/img/scene/mountain.webp", z: -110, top: 0.7, width: 1.2, aspect: 2560 / 1263 },
  { name: "hills", src: "assets/img/scene/hills.webp", z: -75, top: 0.52, width: 1.3, aspect: 2560 / 869 },
  { name: "stones", src: "assets/img/scene/stones.webp", z: -45, top: 0.64, width: 1.02, aspect: 2560 / 993 },
  { name: "front", src: "assets/img/scene/foreground.webp", z: -2, top: 0.42, width: 1.25, aspect: 2560 / 1086 },
];

const MIST_VERTEX = `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

// the mist photo's brightness becomes its opacity; the texture drifts sideways and wobbles a little
const MIST_FRAGMENT = `
uniform sampler2D map;
uniform float time;
uniform float speed;
uniform float opacity;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  vec2 uv = vUv;
  uv.x = fract(uv.x + time * speed);
  uv.y += sin(uv.x * 6.2831 + time * 0.3) * 0.02;
  vec3 colour = texture2D(map, uv).rgb;
  float alpha = smoothstep(0.08, 0.7, dot(colour, vec3(0.333))) * opacity;
  alpha *= smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
  gl_FragColor = vec4(vec3(0.72, 0.8, 0.72) * alpha, alpha);
  #include <fog_fragment>
}`;

const MOTE_VERTEX = `
attribute float seed;
uniform float time;
uniform float pixelRatio;
varying float vTwinkle;
void main() {
  vec3 p = position;
  p.y += mod(time * (0.15 + seed * 0.25) + seed * 20.0, 22.0) - 6.0;
  p.x += sin(time * 0.4 + seed * 40.0) * 0.6;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vTwinkle = 0.45 + 0.55 * sin(time * (1.5 + seed * 3.0) + seed * 60.0);
  gl_PointSize = (2.5 + seed * seed * 9.0) * pixelRatio / -mvPosition.z;
}`;

const MOTE_FRAGMENT = `
varying float vTwinkle;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float glow = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.55) * glow * vTwinkle * 0.8, glow * vTwinkle);
}`;

export async function initWorld() {
  const hero = document.querySelector("[data-scene]");
  const canvas = hero?.querySelector("[data-world]");
  if (!canvas) {
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(BG);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.0065);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  camera.position.set(0, 0, CAMERA_Z);

  const loader = new THREE.TextureLoader();
  const load = (src) => new Promise((resolve, reject) => loader.load(src, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    resolve(texture);
  }, undefined, reject));

  let textures;
  try {
    textures = await Promise.all([
      load("assets/img/scene/sky.jpg"),
      load("assets/img/scene/moon.webp"),
      load("assets/img/scene/mist.jpg"),
      ...LAYERS.map((layer) => load(layer.src)),
    ]);
  } catch {
    renderer.dispose();
    return;
  }
  const [skyTexture, moonTexture, mistTexture, ...layerTextures] = textures;

  const plane = (texture, options = {}) => new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, ...options }),
  );

  const sky = plane(skyTexture, { transparent: false, fog: false });
  sky.position.z = -220;
  sky.material.color.setScalar(0.4);
  scene.add(sky);

  const moon = plane(moonTexture, { fog: false });
  moon.position.z = -170;
  scene.add(moon);

  const layers = LAYERS.map((layer, i) => {
    const mesh = plane(layerTextures[i]);
    mesh.position.z = layer.z;
    mesh.renderOrder = i + 2;
    scene.add(mesh);
    return { ...layer, mesh };
  });

  mistTexture.wrapS = THREE.RepeatWrapping;
  const mists = [
    { z: -90, y: 0.5, speed: 0.004, opacity: 0.5 },
    { z: -58, y: 0.4, speed: -0.006, opacity: 0.45 },
    { z: -22, y: 0.24, speed: 0.009, opacity: 0.35 },
  ].map((mist, i) => {
    const material = new THREE.ShaderMaterial({
      vertexShader: MIST_VERTEX,
      fragmentShader: MIST_FRAGMENT,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        map: { value: mistTexture }, time: { value: 0 }, speed: { value: mist.speed }, opacity: { value: mist.opacity },
      }]),
      transparent: true,
      depthWrite: false,
      fog: true,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.position.z = mist.z;
    mesh.renderOrder = 10 + i;
    scene.add(mesh);
    return { ...mist, mesh, material };
  });

  // gold motes scattered through the whole depth of the scene
  const MOTES = 650;
  const positions = new Float32Array(MOTES * 3);
  const seeds = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 110;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 2] = -120 + Math.random() * 126;
    seeds[i] = Math.random();
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  moteGeometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const moteMaterial = new THREE.ShaderMaterial({
    vertexShader: MOTE_VERTEX,
    fragmentShader: MOTE_FRAGMENT,
    uniforms: { time: { value: 0 }, pixelRatio: { value: renderer.getPixelRatio() * 60 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.renderOrder = 20;
  scene.add(motes);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.7);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // visible half-height of the view at a distance from the camera's start position
  const halfHeight = (distance) => distance * Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  function layout() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const aspect = width / height;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    const fit = (mesh, z, top, widthFactor, imageAspect) => {
      const h = halfHeight(CAMERA_Z - z);
      const w = h * aspect;
      // wide enough for the frame plus overscan, and never shorter than it needs to be to reach below the frame
      let planeWidth = 2 * w * widthFactor;
      let planeHeight = planeWidth / imageAspect;
      const needed = (top * 2 * h) + h * 0.35;
      if (planeHeight < needed) {
        planeHeight = needed;
        planeWidth = planeHeight * imageAspect;
      }
      mesh.scale.set(planeWidth, planeHeight, 1);
      mesh.position.y = -h + top * 2 * h - planeHeight / 2;
    };

    const skyH = halfHeight(CAMERA_Z - sky.position.z);
    const skyScale = Math.max(2 * skyH * aspect * 1.4, 2 * skyH * 1.4 * (2560 / 1429));
    sky.scale.set(skyScale, skyScale / (2560 / 1429), 1);
    sky.position.y = skyH * 0.15;

    const moonH = halfHeight(CAMERA_Z - moon.position.z);
    const moonSize = moonH * (aspect < 1 ? 0.75 : 0.9);
    moon.scale.set(moonSize, moonSize, 1);
    moon.position.set(0, moonH * 0.5, moon.position.z);

    for (const layer of layers) {
      fit(layer.mesh, layer.z, layer.top, layer.width, layer.aspect);
    }
    for (const mist of mists) {
      const h = halfHeight(CAMERA_Z - mist.z);
      mist.mesh.scale.set(2 * h * aspect * 1.8, h * 0.9, 1);
      mist.mesh.position.y = -h + mist.y * 2 * h;
    }
  }
  hero.classList.add("has-world");
  world.active = true;

  // gentle mode: the same scene, but as one still frame (redrawn only when the window changes size)
  if (reducedMotion) {
    camera.lookAt(0, 0, CAMERA_Z - 60);
    const still = () => {
      layout();
      composer.render();
    };
    still();
    new ResizeObserver(still).observe(canvas);
    return;
  }

  layout();
  new ResizeObserver(layout).observe(canvas);
  const visibility = watchVisibility(hero, "0px");
  let lookX = 0;
  let lookY = 0;

  onFrame((s, dt) => {
    if (!visibility.visible) {
      return;
    }
    const ease = 1 - Math.pow(1 - 0.045, dt * 60);
    lookX = lerp(lookX, s.hasPointer ? s.nx : 0, ease);
    lookY = lerp(lookY, s.hasPointer ? s.ny : 0, ease);

    // fly forward through the brambles towards the stones; the pointer steers and the camera breathes a little
    const fly = world.fly;
    camera.position.x = lookX * 1.4;
    camera.position.y = -lookY * 0.7 - fly * 1.6 + Math.sin(s.time * 0.5) * 0.08;
    camera.position.z = CAMERA_Z - fly * 26;
    camera.lookAt(lookX * 0.4, -lookY * 0.2 - fly * 1.2, camera.position.z - 60);

    scene.fog.density = 0.0065 + fly * 0.02;
    bloom.strength = 0.55 + fly * 0.4;
    moteMaterial.uniforms.time.value = s.time;
    for (const mist of mists) {
      mist.material.uniforms.time.value = s.time;
      mist.material.uniforms.opacity.value = mist.opacity * (1 + fly * 1.6);
    }
    moon.rotation.z = Math.sin(s.time * 0.2) * 0.03;
    composer.render();
  });

  // touch screens: tilt the phone to steer instead of the pointer
  if (!state.hasPointer && "DeviceOrientationEvent" in window) {
    window.addEventListener("deviceorientation", (event) => {
      if (event.gamma == null) {
        return;
      }
      state.nx = Math.max(-1, Math.min(1, event.gamma / 30));
      state.ny = Math.max(-1, Math.min(1, (event.beta - 45) / 30));
      state.hasPointer = true;
    });
  }
}

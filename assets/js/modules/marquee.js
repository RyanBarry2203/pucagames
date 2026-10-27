import { onFrame, reducedMotion, watchVisibility } from "../core/ticker.js";

// Endless band of text. It drifts on its own, speeds up with scroll speed and follows the scroll direction.
export function initMarquee() {
  const track = document.querySelector("[data-marquee-track]");
  if (!track) {
    return;
  }
  // a second copy makes the loop seamless: when the first copy has fully passed, jump back by its width
  track.append(...[...track.children].map((node) => node.cloneNode(true)));
  if (reducedMotion) {
    return;
  }

  const visibility = watchVisibility(track);
  let loopWidth = track.scrollWidth / 2;
  new ResizeObserver(() => {
    loopWidth = track.scrollWidth / 2;
  }).observe(track);

  let x = 0;
  let direction = -1;
  onFrame((s, dt) => {
    if (!visibility.visible) {
      return;
    }
    if (Math.abs(s.velocity) > 0.5) {
      direction = s.velocity > 0 ? -1 : 1;
    }
    const speed = 45 + Math.min(Math.abs(s.velocity) * 14, 700);
    x += direction * speed * dt;
    if (x <= -loopWidth) {
      x += loopWidth;
    } else if (x > 0) {
      x -= loopWidth;
    }
    track.style.setProperty("--x", `${x.toFixed(1)}px`);
  });
}

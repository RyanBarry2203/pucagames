import { onFrame, reducedMotion, watchVisibility, clamp } from "../core/ticker.js";

// The lore paragraph lights up word by word as it scrolls through the screen, while a huge faint triquetra turns
// slowly behind it.
export function initLore() {
  const text = document.querySelector("[data-words]");
  if (!text) {
    return;
  }
  const words = text.textContent.trim().split(/\s+/);
  text.textContent = "";
  const spans = words.map((word) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = word;
    text.append(span, " ");
    return span;
  });

  if (reducedMotion) {
    spans.forEach((span) => span.style.setProperty("--w", "1"));
    return;
  }

  const knot = document.querySelector(".lore__knot");
  const visibility = watchVisibility(text, "200px");
  const lit = new Array(spans.length).fill(-1);

  onFrame((s) => {
    if (!visibility.visible) {
      return;
    }
    const rect = text.getBoundingClientRect();
    // fully lit by the time the paragraph's middle reaches the upper third of the screen
    const start = s.vh * 0.9;
    const end = s.vh * 0.3 - rect.height * 0.5;
    const progress = clamp((start - rect.top) / (start - end), 0, 1);
    const reach = progress * spans.length;
    for (let i = 0; i < spans.length; i++) {
      const value = Math.round(clamp(reach - i, 0, 1) * 100) / 100;
      if (value !== lit[i]) {
        spans[i].style.setProperty("--w", value);
        lit[i] = value;
      }
    }
    if (knot) {
      knot.style.setProperty("--rot", `${(s.scrollY * 0.03).toFixed(2)}deg`);
      knot.style.setProperty("--sy", `${(rect.top * -0.15).toFixed(1)}px`);
    }
  });
}

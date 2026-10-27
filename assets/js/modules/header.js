import { onFrame } from "../core/ticker.js";

// Sticky header: hides while scrolling down, returns on scroll up, shows reading progress and the current section.
export function initHeader() {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-mobile-menu]");
  if (!header) {
    return;
  }

  function setMenuOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  }

  toggle.addEventListener("click", () => setMenuOpen(menu.hidden));
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMenuOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  let lastProgress = -1;
  onFrame((state) => {
    const scrolled = state.scrollY > 40;
    header.classList.toggle("is-scrolled", scrolled);
    const goingDown = state.velocity > 1.5 && state.scrollY > state.vh * 0.6;
    if (goingDown && menu.hidden) {
      header.classList.add("is-hidden");
    } else if (state.velocity < -1.5 || state.scrollY < state.vh * 0.6) {
      header.classList.remove("is-hidden");
    }

    const max = document.documentElement.scrollHeight - state.vh;
    const progress = max > 0 ? state.scrollY / max : 0;
    if (Math.abs(progress - lastProgress) > 0.001) {
      header.style.setProperty("--progress", progress.toFixed(4));
      lastProgress = progress;
    }
  });

  const links = [...header.querySelectorAll(".nav__list a")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }
      const id = `#${entry.target.id}`;
      for (const link of links) {
        if (link.getAttribute("href") === id) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean)
    .forEach((section) => observer.observe(section));
}

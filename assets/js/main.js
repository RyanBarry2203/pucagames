(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");

  function setMenuOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    mobileMenu.hidden = !open;
  }

  toggle.addEventListener("click", () => setMenuOpen(mobileMenu.hidden));
  mobileMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMenuOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobileMenu.hidden) {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  // One passive, rAF-throttled scroll handler drives the header state and the lore parallax.
  const loreBg = document.querySelector(".lore__bg");
  let ticking = false;

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
    if (!reducedMotion && loreBg) {
      const rect = loreBg.parentElement.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      loreBg.style.setProperty("--parallax", `${(progress - 0.5) * 12}%`);
    }
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  // Highlight the nav link for the section currently on screen.
  const navLinks = [...document.querySelectorAll(".nav__list a")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const id = `#${entry.target.id}`;
        for (const link of navLinks) {
          if (link.getAttribute("href") === id) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        }
      }
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((section) => sectionObserver.observe(section));

  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -10% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Drifting motes over the hero: mostly gold dust, the odd ember. Paused when the hero is off screen.
  const canvas = document.querySelector("[data-embers]");
  if (!canvas || reducedMotion) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const motes = [];
  let width = 0;
  let height = 0;
  let running = false;
  let heroVisible = true;
  let frameId = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.round(Math.min(90, (width * height) / 16000));
    while (motes.length < target) {
      motes.push(spawn(true));
    }
    motes.length = target;
  }

  function spawn(anywhere) {
    const ember = Math.random() < 0.18;
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      radius: ember ? 1.2 + Math.random() * 1.6 : 0.6 + Math.random() * 1.2,
      speed: 0.15 + Math.random() * 0.45,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.25 + Math.random() * 0.6,
      colour: ember ? "208, 116, 47" : "236, 219, 166",
    };
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < motes.length; i++) {
      const mote = motes[i];
      mote.y -= mote.speed;
      mote.sway += 0.01;
      mote.x += Math.sin(mote.sway) * 0.3;
      if (mote.y < -10) {
        motes[i] = spawn(false);
        continue;
      }
      const fade = Math.min(1, mote.y / (height * 0.35));
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${mote.colour}, ${mote.alpha * fade})`;
      ctx.shadowColor = `rgba(${mote.colour}, .8)`;
      ctx.shadowBlur = mote.radius * 4;
      ctx.fill();
    }
    frameId = requestAnimationFrame(draw);
  }

  function updateRunning() {
    const next = heroVisible && !document.hidden;
    if (next === running) {
      return;
    }
    running = next;
    if (running) {
      frameId = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(frameId);
    }
  }

  resize();
  window.addEventListener("resize", resize);
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    updateRunning();
  }).observe(canvas);
  document.addEventListener("visibilitychange", updateRunning);
})();

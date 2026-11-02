// "Play in your browser" on the game pages: a painted cover with one button, swapped for the game's frame
// (play/<game>/) only when asked, so nobody downloads a game they didn't start. While it runs, the sound is paused
// whenever the player scrolls it away or switches tab, and the game's own QUIT brings the cover back.
// A Sangue Frio's library card for the other game asks this page to take the visitor there.

const VISIBLE_RATIO = 0.3;

export function initPlay() {
  for (const player of document.querySelectorAll("[data-play]")) {
    setUpPlayer(player);
  }
}

function setUpPlayer(player) {
  const { playSrc: src, playTitle: title } = player.dataset;
  const screen = player.querySelector("[data-play-screen]");
  const cover = screen.firstElementChild;
  const start = player.querySelector("[data-play-start]");
  const stop = player.querySelector("[data-play-stop]");
  const fullscreen = player.querySelector("[data-play-fullscreen]");
  const status = player.querySelector("[data-play-status]");
  const idleStatus = status.textContent;
  let frame = null;
  let visibleRatio = 0;

  const send = (message) => frame?.contentWindow?.postMessage(message, location.origin);

  const update = () => {
    if (!frame || document.fullscreenElement === screen) {
      return;
    }
    send(visibleRatio >= VISIBLE_RATIO && !document.hidden ? "puca:resume" : "puca:pause");
  };

  const play = () => {
    frame = document.createElement("iframe");
    frame.src = src;
    frame.title = `${title}, playable`;
    frame.allow = "fullscreen; autoplay; gamepad";
    frame.allowFullscreen = true;
    screen.replaceChildren(frame);
    frame.focus();
    player.classList.add("is-playing");
    stop.hidden = false;
    fullscreen.hidden = !screen.requestFullscreen;
    status.textContent = "Loading. Click the game to take control, Esc gives the mouse back.";
  };

  const unload = () => {
    if (document.fullscreenElement === screen) {
      document.exitFullscreen();
    }
    frame = null;
    screen.replaceChildren(cover);
    player.classList.remove("is-playing");
    stop.hidden = true;
    fullscreen.hidden = true;
    status.textContent = idleStatus;
    start.focus({ preventScroll: true });
  };

  start.addEventListener("click", play);
  stop.addEventListener("click", unload);
  fullscreen.addEventListener("click", () => {
    screen.requestFullscreen().then(() => frame?.focus()).catch(() => window.open(src, "_blank", "noopener"));
  });

  window.addEventListener("message", (event) => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) {
      return;
    }
    const { type, page } = event.data ?? {};
    if (type === "puca:ready") {
      status.textContent = "Click the game to take control. Esc gives the mouse back.";
    } else if (type === "puca:quit") {
      unload();
    } else if (type === "puca:open" && typeof page === "string" && page.startsWith("/games/")) {
      location.href = `${page}#play`;
    }
  });

  new IntersectionObserver(([entry]) => {
    visibleRatio = entry.isIntersecting ? entry.intersectionRatio : 0;
    update();
  }, { threshold: [0, VISIBLE_RATIO] }).observe(player);
  document.addEventListener("visibilitychange", update);
  document.addEventListener("fullscreenchange", update);

  // the cover's light follows the pointer: the torch on Last Known Location, the sight on A Sangue Frio
  cover.addEventListener("pointermove", (event) => {
    const rect = cover.getBoundingClientRect();
    cover.style.setProperty("--px", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
    cover.style.setProperty("--py", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
  });
}

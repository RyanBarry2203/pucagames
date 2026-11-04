// "Play in your browser" on the game pages: a painted cover with one button, swapped for the game's frame
// (play/<game>/) only when asked, so nobody downloads a game they didn't start. While it runs, the game is paused
// whenever the player scrolls it away or switches tab, and the game's own QUIT brings the cover back.
// A Sangue Frio's library card for the other game asks this page to take the visitor there.
// Phones and tablets with no mouse get the same cover, but it offers to send them the link for later instead of
// starting a big mouse-and-keyboard download (they can still load it anyway).

import { setPaused } from "../core/ticker.js";
import { scrollToY } from "../core/engine.js";

const VISIBLE_RATIO = 0.3;

const STATUS = {
  loading: "Loading the game. It only downloads when you ask, and the next visit starts faster.",
  unpacking: "Unpacking the game. The first time takes a little while.",
  ready: "Click the game to take control. Esc gives the mouse back.",
  locked: "The game has the mouse. Esc gives it back.",
  unlocked: "The mouse is free. Click the game to carry on.",
  error: "The game didn't start in this browser. Chrome, Edge or Firefox on a computer will run it.",
  noFullscreen: "Full screen isn't available in this browser, but the game plays fine right here.",
  copied: "Link copied. Open it on a computer with a mouse.",
};

const playableHere = () => {
  const mouse = window.matchMedia("(any-pointer: fine)").matches;
  let webgl2 = false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    webgl2 = Boolean(gl);
    // only a test: the context is handed straight back, since a browser allows just a few at once (iOS Safari fewest)
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }
  return mouse && webgl2;
};

export function initPlay() {
  const players = [...document.querySelectorAll("[data-play]")];
  if (!players.length) {
    return;
  }
  const desktop = playableHere();
  for (const player of players) {
    setUpPlayer(player, desktop);
  }
}

function setUpPlayer(player, desktop) {
  const { playSrc: src, playTitle: title } = player.dataset;
  const screen = player.querySelector("[data-play-screen]");
  const frameBox = screen.closest(".play__frame") || screen;
  const cover = screen.firstElementChild;
  const start = player.querySelector("[data-play-start]");
  const stop = player.querySelector("[data-play-stop]");
  const fullscreen = player.querySelector("[data-play-fullscreen]");
  const share = player.querySelector("[data-play-share]");
  const anyway = player.querySelector("[data-play-anyway]");
  const status = player.querySelector("[data-play-status]");
  const idleStatus = status.textContent;
  let frame = null;
  let visibleRatio = 0;

  if (!desktop) {
    player.classList.add("play--desktop-only");
  }

  const send = (message) => frame?.contentWindow?.postMessage(message, location.origin);
  const setStatus = (text) => {
    status.textContent = text;
  };

  // the whole frame (screen and its bar) in the middle of the window; measured from the layout, not the screen, so
  // the frame's own reveal (it rises into place) doesn't throw the position off
  const centreOnScreen = (immediate) => {
    let top = 0;
    for (let element = frameBox; element; element = element.offsetParent) {
      top += element.offsetTop;
    }
    scrollToY(top - Math.max(0, (window.innerHeight - frameBox.offsetHeight) / 2), { immediate });
  };

  const update = () => {
    if (!frame || document.fullscreenElement === screen) {
      return;
    }
    const active = visibleRatio >= VISIBLE_RATIO && !document.hidden;
    send(active ? "puca:resume" : "puca:pause");
    // the game shares this page's main thread: the page's own effects hold still while it is on screen, and the
    // page's gold cursor makes way for the game's own
    setPaused(active);
    document.documentElement.classList.toggle("is-gaming", active);
  };

  const play = () => {
    frame = document.createElement("iframe");
    frame.src = src;
    frame.title = `${title}, playable`;
    frame.allow = "fullscreen; autoplay; gamepad";
    frame.allowFullscreen = true;
    screen.replaceChildren(frame);
    setPaused(true);
    document.documentElement.classList.add("is-gaming");
    frame.focus();
    player.classList.add("is-playing");
    stop.hidden = false;
    fullscreen.hidden = !document.fullscreenEnabled || !screen.requestFullscreen;
    setStatus(STATUS.loading);
    centreOnScreen(false);
  };

  const unload = () => {
    if (document.fullscreenElement === screen) {
      document.exitFullscreen();
    }
    frame = null;
    setPaused(false);
    document.documentElement.classList.remove("is-gaming");
    screen.replaceChildren(cover);
    player.classList.remove("is-playing");
    stop.hidden = true;
    fullscreen.hidden = true;
    setStatus(idleStatus);
    (desktop ? start : share).focus({ preventScroll: true });
  };

  start.addEventListener("click", play);
  anyway?.addEventListener("click", play);
  stop.addEventListener("click", unload);
  fullscreen.addEventListener("click", () => {
    // never a second copy of the game in a new tab: if the browser says no, it carries on in the page
    screen.requestFullscreen()
      .then(() => frame?.focus())
      .catch(() => setStatus(STATUS.noFullscreen));
  });

  share?.addEventListener("click", () => {
    const url = `${location.origin}${location.pathname}#play`;
    if (navigator.share) {
      navigator.share({ title: `${title} · Púca Games`, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => setStatus(STATUS.copied), () => setStatus(url));
    } else {
      setStatus(url);
    }
  });

  window.addEventListener("message", (event) => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) {
      return;
    }
    const { type, page } = event.data ?? {};
    if (type === "puca:unpacking") {
      setStatus(STATUS.unpacking);
    } else if (type === "puca:ready") {
      setStatus(STATUS.ready);
    } else if (type === "puca:locked") {
      setStatus(STATUS.locked);
    } else if (type === "puca:unlocked") {
      setStatus(STATUS.unlocked);
    } else if (type === "puca:error") {
      setStatus(STATUS.error);
    } else if (type === "puca:quit") {
      unload();
    } else if (type === "puca:open" && typeof page === "string" && page.startsWith("/games/")) {
      location.href = `${page}#play`;
    }
  });

  // how much of the game itself is on screen, not the whole section with its heading and controls list
  new IntersectionObserver(([entry]) => {
    visibleRatio = entry.isIntersecting ? entry.intersectionRatio : 0;
    update();
  }, { threshold: [0, VISIBLE_RATIO] }).observe(screen);
  document.addEventListener("visibilitychange", update);
  document.addEventListener("fullscreenchange", () => {
    update();
    if (frame && !document.fullscreenElement) {
      frame.focus();
    }
  });

  // arriving from a link to #play (the other game's library card): the screen in the middle, the button ready
  if (location.hash === "#play") {
    const arrive = () => requestAnimationFrame(() => {
      centreOnScreen(true);
      (desktop ? start : share)?.focus({ preventScroll: true });
    });
    if (document.readyState === "complete") {
      arrive();
    } else {
      window.addEventListener("load", arrive, { once: true });
    }
  }

  // the cover's light follows the pointer: the torch on Last Known Location, the sight on A Sangue Frio
  cover.addEventListener("pointermove", (event) => {
    const rect = cover.getBoundingClientRect();
    cover.style.setProperty("--px", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
    cover.style.setProperty("--py", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
  });
}

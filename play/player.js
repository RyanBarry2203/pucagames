// Runs inside a game's frame (play/<game>/index.html): starts the Unity build, lets the page around it pause the game
// when the frame scrolls away, and passes the game's QUIT and library calls up to that page (window.pucaGame is what
// the build's PageBridge.jslib calls). Opened on its own, outside a frame, QUIT goes back to the game's page instead.
//
// The mouse: a game that aims with raw mouse movement needs the pointer locked to the canvas, or the browser's own
// arrow wanders off from the game's sight and out of the frame. With data-lock="always" (A Sangue Frio) a "click to
// take aim" panel covers the game whenever it doesn't have the mouse, and that click is what asks for the lock, so
// the click never fires a shot. Without it (Last Known Location) the game asks for the lock itself, and the panel
// only shows if the browser turned a request down. A refused lock never reaches Unity's error alert.
(function () {
  var script = document.currentScript;
  var build = script.dataset.build;
  var home = script.dataset.home;
  var lockAlways = script.dataset.lock === "always";
  var embedded = window.self !== window.top;
  // The library card in A Sangue Frio's menu names the other game by its program name.
  var pages = { LastKnownLocation: "/games/last-known-location/", SangueFrio: "/games/a-sangue-frio/" };

  if (embedded) {
    document.documentElement.classList.add("embedded");
  }

  function tell(message) {
    if (embedded) {
      window.parent.postMessage(message, location.origin);
    }
  }

  var canvas = document.getElementById("unity-canvas");
  var loader = document.querySelector(".loader");
  var status = document.querySelector(".loader__status");
  var fill = document.querySelector(".loader__fill");
  var error = document.querySelector(".loader__error");
  var lock = document.querySelector(".lock");
  var lockTitle = lock.querySelector(".lock__title");
  var lockHint = lock.querySelector(".lock__hint");
  var words = (script.dataset.progress || "Loading").split("|");
  var instance = null;
  var ready = false;
  var paused = false;

  // Every AudioContext the game makes is kept, so a message from the page can suspend or resume them all.
  var Native = window.AudioContext || window.webkitAudioContext;
  var contexts = [];
  if (Native) {
    var Tracked = function (options) {
      var context = new Native(options);
      contexts.push(context);
      return context;
    };
    Tracked.prototype = Native.prototype;
    window.AudioContext = window.webkitAudioContext = Tracked;
  }

  // Scrolled away or tab hidden: the sound stops and so does the game's main loop, so it doesn't keep drawing
  // frames nobody sees on the page's main thread.
  function setPaused(value) {
    paused = value;
    contexts.forEach(function (context) {
      if (value) {
        context.suspend();
      } else {
        context.resume();
      }
    });
    var module = instance && instance.Module;
    var call = module && (value ? module.pauseMainLoop : module.resumeMainLoop);
    if (typeof call === "function") {
      call();
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== location.origin) {
      return;
    }
    if (event.data === "puca:pause") {
      setPaused(true);
    } else if (event.data === "puca:resume") {
      setPaused(false);
    }
  });

  window.pucaGame = {
    quit: function () {
      if (embedded) {
        tell({ type: "puca:quit" });
      } else {
        location.href = home;
      }
    },
    open: function (id) {
      if (!pages[id]) {
        return;
      }
      if (embedded) {
        tell({ type: "puca:open", page: pages[id] });
      } else {
        location.href = pages[id] + "#play";
      }
    },
  };

  // ---- the mouse ----

  var nativeLock = Element.prototype.requestPointerLock;
  var lockUnavailable = !nativeLock;
  var lastUnlock = -Infinity;
  // refusals in a row outside Chrome's after-Esc cooldown; one can be a passing hiccup, two means no lock here
  var strikes = 0;
  var hintTimer = 0;

  function showLock(title, hint) {
    if (!ready || lockUnavailable) {
      return;
    }
    clearTimeout(hintTimer);
    lockTitle.textContent = title;
    lockHint.textContent = hint || lock.dataset.hint;
    lock.hidden = false;
    // the "one moment" hint only holds for the cooldown, then the panel goes back to its ordinary hint
    if (hint) {
      hintTimer = setTimeout(function () {
        lockHint.textContent = lock.dataset.hint;
      }, 1500);
    }
  }

  function hideLock() {
    lock.hidden = true;
  }

  // Unity asks for the lock through this too; a refusal is caught here, so it can't surface as an uncaught error
  if (nativeLock) {
    Element.prototype.requestPointerLock = function (options) {
      var result;
      try {
        result = nativeLock.call(this, options);
      } catch (reason) {
        refused();
        return undefined;
      }
      return result && typeof result.then === "function" ? result.catch(refused) : result;
    };
  }

  // settled a moment later, so a retry still in flight (see requestLock) can succeed first
  var refusal = 0;
  function refused() {
    clearTimeout(refusal);
    refusal = setTimeout(function () {
      if (document.pointerLockElement === canvas) {
        return;
      }
      // Chrome turns a request down for a second or so after Esc; anything else means this browser won't lock
      // here, so the game carries on with a free mouse rather than a panel that can't go away
      if (performance.now() - lastUnlock < 2500) {
        showLock(lock.dataset.resume, lock.dataset.wait);
      } else if (lockAlways && ++strikes >= 2) {
        lockUnavailable = true;
        hideLock();
      } else {
        showLock(lock.dataset.resume);
      }
    }, 250);
  }

  // raw mouse movement, as the game gets from the mouse on the show PC; where that isn't supported, the ordinary lock
  function requestLock() {
    var first;
    try {
      first = nativeLock.call(canvas, { unadjustedMovement: true });
    } catch (reason) {
      canvas.requestPointerLock();
      return;
    }
    // browsers without the promise report a refusal with pointerlockerror instead
    if (first && typeof first.then === "function") {
      first.catch(function (reason) {
        if (reason && reason.name === "NotSupportedError") {
          canvas.requestPointerLock();
        } else {
          refused();
        }
      });
    }
  }

  document.addEventListener("pointerlockerror", refused);

  lock.addEventListener("click", function () {
    canvas.focus();
    requestLock();
  });

  document.addEventListener("pointerlockchange", function () {
    if (document.pointerLockElement === canvas) {
      // the lock works after all, so the panel is back in use for the next Esc
      lockUnavailable = !nativeLock;
      strikes = 0;
      hideLock();
      tell({ type: "puca:locked" });
      return;
    }
    lastUnlock = performance.now();
    if (!ready) {
      return;
    }
    tell({ type: "puca:unlocked" });
    if (lockAlways) {
      showLock(lock.dataset.resume);
    }
  });

  canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  canvas.addEventListener("pointerdown", function () { canvas.focus(); });

  // ---- loading ----

  function progress(value) {
    var percent = Math.round(value * 100);
    fill.style.width = percent + "%";
    status.textContent = words[Math.min(words.length - 1, Math.floor(value * words.length))] + " · " + percent + "%";
  }
  progress(0);

  // Once the files are down, Unity unpacks them (brotli, in JavaScript on hosts like GitHub Pages) and compiles the
  // code: tens of seconds the first time, with no progress to report. The bar says so and counts the seconds.
  var unpackTimer = 0;
  function unpacking() {
    if (unpackTimer || ready) {
      return;
    }
    var started = Date.now();
    loader.classList.add("is-unpacking");
    fill.style.width = "100%";
    var tickUnpack = function () {
      status.textContent = "Unpacking the game · " + Math.round((Date.now() - started) / 1000) + " s";
    };
    tickUnpack();
    unpackTimer = setInterval(tickUnpack, 1000);
    tell({ type: "puca:unpacking" });
  }

  function stopUnpacking() {
    clearInterval(unpackTimer);
    loader.classList.remove("is-unpacking");
  }

  // GitHub Pages refuses files over 100 MB, so a bigger data file ships as numbered parts (data-parts="N"):
  // they are downloaded here, joined into one Blob, and Unity loads that. Downloading is the first 85% of the bar.
  var parts = parseInt(script.dataset.parts || "0", 10);
  var dataBase = "Build/" + build + ".data.unityweb";

  function fetchParts() {
    var loaded = [];
    var totals = [];
    function report() {
      var done = 0;
      var total = 0;
      for (var i = 0; i < parts; i++) {
        done += loaded[i] || 0;
        total += totals[i] || 0;
      }
      if (total > 0) {
        progress(0.85 * done / total);
      }
    }
    var requests = [];
    for (var i = 0; i < parts; i++) {
      requests.push(fetchPart(i));
    }
    function fetchPart(index) {
      return fetch(dataBase + ".part" + (index + 1)).then(function (response) {
        if (!response.ok) {
          throw new Error("part " + (index + 1) + ": HTTP " + response.status);
        }
        totals[index] = parseInt(response.headers.get("Content-Length") || "0", 10);
        var reader = response.body.getReader();
        var chunks = [];
        function pump() {
          return reader.read().then(function (step) {
            if (step.done) {
              return new Blob(chunks);
            }
            chunks.push(step.value);
            loaded[index] = (loaded[index] || 0) + step.value.length;
            report();
            return pump();
          });
        }
        return pump();
      });
    }
    return Promise.all(requests).then(function (blobs) {
      return URL.createObjectURL(new Blob(blobs));
    });
  }

  function start(dataUrl, offset) {
    createUnityInstance(canvas, {
      dataUrl: dataUrl,
      frameworkUrl: "Build/" + build + ".framework.js.unityweb",
      codeUrl: "Build/" + build + ".wasm.unityweb",
      companyName: "Púca Games",
      productName: script.dataset.title,
      productVersion: "1.0",
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      showBanner: function (message, type) {
        if (type === "error") {
          console.error(message);
        } else {
          console.warn(message);
        }
      },
      // Unity would otherwise show the browser's alert box for any error on the page, a browser extension's
      // included. Logged only: a real startup failure reaches fail() through createUnityInstance's catch below.
      errorHandler: function (message) {
        console.error(String(message));
        return true;
      },
    }, function (value) {
      if (value >= 0.9) {
        unpacking();
      } else {
        progress(offset + (1 - offset) * value);
      }
    }).then(function (created) {
      instance = created;
      ready = true;
      stopUnpacking();
      loader.classList.add("is-done");
      canvas.focus();
      if (paused) {
        setPaused(true);
      }
      tell({ type: "puca:ready" });
      if (lockAlways && document.pointerLockElement !== canvas) {
        showLock(lock.dataset.start);
      }
    }).catch(fail);
  }

  function fail(message) {
    stopUnpacking();
    loader.classList.add("is-error");
    status.textContent = "It wouldn't start";
    error.textContent = script.dataset.title + " needs a desktop browser with WebGL 2: Chrome, Edge or Firefox. (" + message + ")";
    tell({ type: "puca:error" });
  }

  var tag = document.createElement("script");
  tag.src = "Build/" + build + ".loader.js";
  tag.onload = function () {
    if (parts > 0) {
      fetchParts().then(function (url) { start(url, 0.85); }).catch(fail);
    } else {
      start(dataBase, 0);
    }
  };
  tag.onerror = function () {
    fail("the loader didn't download");
  };
  document.body.appendChild(tag);
})();

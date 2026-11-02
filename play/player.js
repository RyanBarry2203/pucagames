// Runs inside a game's frame (play/<game>/index.html): starts the Unity build, lets the page around it pause the sound
// when the frame scrolls away, and passes the game's QUIT and library calls up to that page (window.pucaGame is what
// the build's PageBridge.jslib calls). Opened on its own, outside a frame, QUIT goes back to the game's page instead.
(function () {
  var script = document.currentScript;
  var build = script.dataset.build;
  var home = script.dataset.home;
  var embedded = window.self !== window.top;
  // The library card in A Sangue Frio's menu names the other game by its program name.
  var pages = { LastKnownLocation: "/games/last-known-location/", SangueFrio: "/games/a-sangue-frio/" };

  if (embedded) {
    document.documentElement.classList.add("embedded");
  }

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
  window.addEventListener("message", function (event) {
    if (event.origin !== location.origin) {
      return;
    }
    if (event.data === "puca:pause") {
      contexts.forEach(function (context) { context.suspend(); });
    } else if (event.data === "puca:resume") {
      contexts.forEach(function (context) { context.resume(); });
    }
  });

  function tell(message) {
    window.parent.postMessage(message, location.origin);
  }

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

  var canvas = document.getElementById("unity-canvas");
  var loader = document.querySelector(".loader");
  var status = document.querySelector(".loader__status");
  var fill = document.querySelector(".loader__fill");
  var error = document.querySelector(".loader__error");
  var words = (script.dataset.progress || "Loading").split("|");

  canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  canvas.addEventListener("pointerdown", function () { canvas.focus(); });

  function progress(value) {
    var percent = Math.round(value * 100);
    fill.style.width = percent + "%";
    status.textContent = words[Math.min(words.length - 1, Math.floor(value * words.length))] + " · " + percent + "%";
  }
  progress(0);

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
    }, function (value) {
      progress(offset + (1 - offset) * value);
    }).then(function () {
      loader.classList.add("is-done");
      canvas.focus();
      if (embedded) {
        tell({ type: "puca:ready" });
      }
    }).catch(fail);
  }

  function fail(message) {
    loader.classList.add("is-error");
    status.textContent = "It wouldn't start";
    error.textContent = script.dataset.title + " needs a desktop browser with WebGL 2: Chrome, Edge or Firefox. (" + message + ")";
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
  document.body.appendChild(tag);
})();

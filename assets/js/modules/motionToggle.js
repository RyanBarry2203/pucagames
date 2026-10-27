import { reducedMotion } from "../core/ticker.js";

function remember(choice) {
  try {
    localStorage.setItem("motion", choice);
    return true;
  } catch {
    return false;
  }
}

// Footer switch that overrides the system "reduce motion" setting, plus a one-time invitation for visitors whose
// device asks for less motion: the site is built around animation, so they get the choice instead of a silent
// downgrade. Either answer is remembered; the page reloads so every module starts again in the chosen mode.
export function initMotionToggle() {
  const toggle = document.querySelector("[data-motion-toggle]");
  if (toggle) {
    const label = toggle.querySelector("[data-motion-label]");
    label.textContent = reducedMotion ? "off" : "on";
    toggle.setAttribute("aria-pressed", String(!reducedMotion));
    toggle.addEventListener("click", () => {
      if (remember(reducedMotion ? "full" : "reduced")) {
        window.location.reload();
      } else {
        label.textContent = "unavailable here";
        toggle.disabled = true;
      }
    });
  }

  let stored = null;
  try {
    stored = localStorage.getItem("motion");
  } catch {
    return;
  }
  if (!reducedMotion || stored) {
    return;
  }

  const invite = document.createElement("aside");
  invite.className = "motion-invite";
  invite.setAttribute("aria-label", "Animation settings");
  invite.innerHTML = `
    <p><strong>Your device asks for less motion.</strong> This site is built around animation: a flight into the
      stone circle, running animals, living mist. Turn it on?</p>
    <div class="motion-invite__actions">
      <button type="button" class="btn btn--primary" data-choice="full"><span class="btn__shine"></span>Turn animations on</button>
      <button type="button" class="motion-invite__calm" data-choice="reduced">Keep it calm</button>
    </div>`;
  document.body.append(invite);
  requestAnimationFrame(() => invite.classList.add("is-shown"));

  invite.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-choice]")?.dataset.choice;
    if (!choice) {
      return;
    }
    remember(choice);
    if (choice === "full") {
      window.location.reload();
    } else {
      invite.remove();
    }
  });
}

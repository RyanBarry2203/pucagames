// Fades [data-reveal] elements in the first time they scroll into view.
// Siblings that share a grid get a stagger so cards arrive one after another.
export function initReveal() {
  const elements = document.querySelectorAll("[data-reveal]");
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px 5% 0px" });

  for (const element of elements) {
    const siblings = [...element.parentElement.children].filter((child) => child.hasAttribute("data-reveal"));
    const index = Math.min(siblings.indexOf(element), 4);
    if (index > 0) {
      element.style.setProperty("--delay", `${index * 0.1}s`);
    }
    observer.observe(element);
  }
}

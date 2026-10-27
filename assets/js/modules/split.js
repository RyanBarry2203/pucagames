// Splits [data-split] headings into words and letters so CSS can raise each letter in turn.
// Screen readers get one hidden copy of the plain text; the animated letters are hidden from them.
export function initSplit() {
  for (const heading of document.querySelectorAll("[data-split]")) {
    const text = heading.textContent.trim();
    const words = text.split(/\s+/);
    heading.textContent = "";

    const readable = document.createElement("span");
    readable.className = "visually-hidden";
    readable.textContent = text;

    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    let letterIndex = 0;
    words.forEach((word, wordIndex) => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "split-word";
      for (const letter of word) {
        const letterSpan = document.createElement("span");
        letterSpan.className = "split-char";
        letterSpan.textContent = letter;
        letterSpan.style.setProperty("--i", letterIndex++);
        wordSpan.append(letterSpan);
      }
      visual.append(wordSpan);
      if (wordIndex < words.length - 1) {
        visual.append(" ");
      }
    });

    heading.append(readable, visual);
    heading.classList.add("is-split");
  }
}

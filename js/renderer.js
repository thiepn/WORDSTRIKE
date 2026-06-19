const wordElements = new Map();

function playArea() {
  return document.querySelector("#play-area");
}

export function clearWordElements() {
  for (const { position } of wordElements.values()) {
    position.remove();
  }
  wordElements.clear();
}

export function createWordElement(word) {
  const area = playArea();
  if (!area) return;
  const position = document.createElement("div");
  const visual = document.createElement("div");
  position.className = "word-position";
  visual.className = "word-visual";
  position.dataset.wordId = word.id;
  position.setAttribute("aria-label", word.text);
  visual.addEventListener("animationend", (event) => {
    if (event.animationName === "wrong") visual.classList.remove("wrong");
  });
  position.append(visual);
  area.append(position);
  wordElements.set(word.id, { position, visual });
  updateWordElement(word, false);
}

export function updateWordElement(word, isActive) {
  const elements = wordElements.get(word.id);
  if (!elements) return;
  const { position, visual } = elements;
  position.style.transform = `translate(${word.x}px, ${word.y}px) translate(-50%, -50%)`;
  visual.classList.toggle("active", isActive);
  const typed = word.text.slice(0, word.typedIndex);
  const remaining = word.text.slice(word.typedIndex);
  visual.innerHTML = `<span class="typed-letter">${typed}</span><span>${remaining}</span>`;
}

export function removeWordElement(word, completed = false, particlesEnabled = true) {
  const elements = wordElements.get(word.id);
  if (!elements) return;
  if (completed && particlesEnabled) {
    const burst = document.createElement("div");
    burst.className = "burst";
    burst.style.left = `${word.x}px`;
    burst.style.top = `${word.y}px`;
    playArea()?.append(burst);
    window.setTimeout(() => burst.remove(), 350);
  }
  elements.position.remove();
  wordElements.delete(word.id);
}

export function flashWrong(wordId) {
  const visual = wordElements.get(wordId)?.visual;
  if (!visual) return;
  visual.classList.remove("wrong");
  void visual.offsetWidth;
  visual.classList.add("wrong");
}

export function flashDamage(screenShake = true) {
  const area = playArea();
  if (!area) return;
  area.classList.remove("damage-flash");
  void area.offsetWidth;
  area.classList.add("damage-flash");
  if (screenShake) {
    area.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(-5px, 2px)" },
        { transform: "translate(4px, -2px)" },
        { transform: "translate(0, 0)" },
      ],
      { duration: 180 },
    );
  }
  window.setTimeout(() => area.classList.remove("damage-flash"), 260);
}

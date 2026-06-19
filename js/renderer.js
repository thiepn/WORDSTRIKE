const wordElements = new Map();
let bossPhraseElement = null;

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
  visual.classList.toggle("word-abandoned", word.abandoned === true);
  const typed = word.text.slice(0, word.typedIndex);
  const remaining = word.text.slice(word.typedIndex);
  visual.innerHTML = `
    <span class="typed-letter">${typed}</span><span class="remaining-letter">${remaining}</span>
    ${word.abandoned ? '<span class="corrupted-label">LOST</span>' : ""}`;
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

export function clearBossPhrase() {
  if (bossPhraseElement) bossPhraseElement.innerHTML = "";
  bossPhraseElement = null;
}

export function renderBossPhrase(game) {
  const container = document.querySelector("#boss-phrase");
  if (!container) return;
  bossPhraseElement = container;
  const typed = game.currentPhrase.slice(0, game.phraseCharIndex);
  const current = game.currentPhrase[game.phraseCharIndex] || "";
  const remaining = game.currentPhrase.slice(game.phraseCharIndex + (current ? 1 : 0));
  const currentDisplay = current === " " ? "&nbsp;" : current;
  container.innerHTML = [
    `<span class="boss-typed">${typed}</span>`,
    current ? `<span class="boss-current">${currentDisplay}</span>` : "",
    `<span class="boss-remaining">${remaining}</span>`,
  ].join("");
  const progress = document.querySelector("#boss-progress-fill");
  if (progress) {
    const percent = game.currentPhrase.length
      ? (game.phraseCharIndex / game.currentPhrase.length) * 100
      : 0;
    progress.style.width = `${percent}%`;
  }
}

export function flashBossWrong() {
  const frame = document.querySelector(".boss-phrase-frame");
  if (!frame) return;
  frame.classList.remove("wrong");
  void frame.offsetWidth;
  frame.classList.add("wrong");
  window.setTimeout(() => frame.classList.remove("wrong"), 180);
}

export function flashQuickFingersBurst() {
  const screen = document.querySelector(".game-screen");
  if (!screen) return;
  screen.classList.remove("quick-burst-flash");
  void screen.offsetWidth;
  screen.classList.add("quick-burst-flash");
  window.setTimeout(() => screen.classList.remove("quick-burst-flash"), 300);
}

export function flashWordCorruption(wordId) {
  const visual = wordElements.get(wordId)?.visual;
  if (!visual) return;
  visual.classList.remove("word-corruption-flash");
  void visual.offsetWidth;
  visual.classList.add("word-corruption-flash");
  window.setTimeout(() => visual.classList.remove("word-corruption-flash"), 260);
}

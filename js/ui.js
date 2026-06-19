import { calculateAccuracy, calculateWPM } from "./scoring.js";
import { generateLevel } from "./levelGenerator.js";

const app = () => document.querySelector("#app");

function menuButton(label, action, selected = false, extraClass = "") {
  return `<button class="arcade-button ${selected ? "selected" : ""} ${extraClass}" data-action="${action}">${label}</button>`;
}

export function renderTitle(menuIndex, handlers) {
  const items = [
    ["START", "start"],
    ["LEVEL SELECT", "levels"],
    ["SETTINGS", "settings"],
  ];
  app().innerHTML = `
    <section class="screen menu-screen">
      <span class="ambient-word" style="left:8%;top:16%">vector</span>
      <span class="ambient-word" style="right:9%;top:28%;animation-delay:-5s">strike</span>
      <span class="ambient-word" style="left:17%;bottom:13%;animation-delay:-9s">velocity</span>
      <span class="ambient-word" style="right:16%;bottom:16%;animation-delay:-2s">precision</span>
      <div class="title-panel">
        <div class="eyebrow">System online // defend the core</div>
        <h1 class="game-title">WORD<span>STRIKE</span></h1>
        <p class="subtitle">Arcade Typing Defense</p>
        <div class="menu-list">
          ${items.map(([label, action], index) => menuButton(label, action, index === menuIndex)).join("")}
        </div>
        <p class="footer-hint">↑ ↓ SELECT &nbsp;•&nbsp; ENTER CONFIRM</p>
      </div>
    </section>`;
  app().querySelector('[data-action="start"]').onclick = handlers.start;
  app().querySelector('[data-action="levels"]').onclick = handlers.levels;
  app().querySelector('[data-action="settings"]').onclick = handlers.settings;
}

function renderDevPanel(selectedLevel) {
  const config = generateLevel(selectedLevel);
  const fields = [
    ["level", selectedLevel],
    ["isBoss", config.isBoss],
    ["wordCount", config.wordCount],
    ["minWordLength", config.minWordLength],
    ["maxWordLength", config.maxWordLength],
    ["spawnIntervalMs", config.spawnIntervalMs],
    ["wordSpeedPxPerSec", config.wordSpeedPxPerSec],
    ["maxSimultaneousWords", config.maxSimultaneousWords],
    ["lives", config.lives],
    ["targetWPM", config.targetWPM],
    ["wordTier", config.wordTier],
    ["world", config.world],
  ];
  return `
    <aside class="dev-panel" aria-label="Developer level controls">
      <div class="dev-controls">
        <div class="micro-label">Direct level test</div>
        <div class="dev-level-entry">
          <input id="dev-level-input" type="number" min="1" max="100" value="${selectedLevel}" aria-label="Level number">
          <button type="button" data-dev-action="launch">LAUNCH</button>
        </div>
        <div class="dev-quick-buttons">
          ${[1, 10, 20, 50, 100].map((level) => `<button type="button" data-dev-level="${level}">${level}</button>`).join("")}
        </div>
      </div>
      <dl class="dev-config">
        ${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
      </dl>
    </aside>`;
}

export function renderLevelSelect(save, selectedLevel, devMode, handlers) {
  const tiles = Array.from({ length: 100 }, (_, index) => {
    const level = index + 1;
    const locked = level > save.currentFurthestLevel;
    const result = save.levels[String(level)];
    const boss = level % 10 === 0;
    return `
      <button class="level-tile ${locked ? "locked" : ""} ${locked && devMode ? "dev-access" : ""} ${boss ? "boss" : ""} ${level === selectedLevel ? "selected" : ""}"
        data-level="${level}" ${locked && !devMode ? "disabled" : ""}>
        <span class="level-number">${String(level).padStart(2, "0")}</span>
        <span class="level-grade">${result?.grade || (locked ? "LOCKED" : "READY")}</span>
        ${boss ? '<span class="boss-mark">◆ BOSS PREVIEW</span>' : ""}
      </button>`;
  }).join("");
  app().innerHTML = `
    <section class="screen level-screen ${devMode ? "dev-enabled" : ""}">
      <header class="level-header">
        <div>
          <div class="eyebrow">Mission routing</div>
          <h1>LEVEL SELECT</h1>
        </div>
        ${menuButton("BACK", "back")}
      </header>
      ${devMode ? renderDevPanel(selectedLevel) : ""}
      <div class="level-grid-scroll">
        <div class="level-grid" id="level-grid">${tiles}</div>
      </div>
    </section>`;
  app().querySelector('[data-action="back"]').onclick = handlers.back;
  app().querySelectorAll(".level-tile:not(:disabled)").forEach((tile) => {
    tile.onclick = () => handlers.select(Number(tile.dataset.level));
  });
  const selectedTile = app().querySelector(".level-tile.selected");
  selectedTile?.focus({ preventScroll: true });
  selectedTile?.scrollIntoView({ block: "nearest", inline: "nearest" });

  if (devMode) {
    const input = app().querySelector("#dev-level-input");
    const launchInputLevel = () => handlers.devLaunch(Number(input.value));
    input.onchange = () => handlers.devInspect(Number(input.value));
    input.onkeydown = (event) => {
      event.stopPropagation();
      if (event.key === "Enter") launchInputLevel();
    };
    app().querySelector('[data-dev-action="launch"]').onclick = launchInputLevel;
    app().querySelectorAll("[data-dev-level]").forEach((button) => {
      button.onclick = () => handlers.devLaunch(Number(button.dataset.devLevel));
    });
  }
}

export function renderDevModeIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "dev-mode-indicator";
  indicator.textContent = "DEV MODE";
  document.body.append(indicator);
}

export function renderGameplayShell(levelNumber, lives) {
  app().innerHTML = `
    <section class="screen game-screen">
      <header class="hud">
        <div>
          <span class="micro-label">Level</span>
          <span class="hud-value" id="hud-level">${String(levelNumber).padStart(2, "0")}</span><br>
          <span>WPM <span class="hud-value" id="hud-wpm">0</span></span>
          <span>&nbsp; ACC <span class="hud-value" id="hud-accuracy">100%</span></span>
        </div>
        <div class="hud-center">
          <span class="micro-label">Core integrity</span><br>
          <span class="lives" id="hud-lives">${"◆".repeat(lives)}</span>
        </div>
        <div class="hud-right">
          <span class="micro-label">Score</span>
          <span class="hud-value" id="hud-score">0</span><br>
          <span>COMBO <span class="hud-value" id="hud-combo">x1.0</span></span>
        </div>
      </header>
      <div class="play-area" id="play-area">
        <div class="core" aria-label="Central core"></div>
      </div>
    </section>`;
}

export function updateHud(game) {
  const wpm = calculateWPM(game.correctCharacters, game.elapsedMs);
  const accuracy = calculateAccuracy(game.correctKeystrokes, game.totalKeystrokes);
  const multiplier = Math.min(1 + Math.floor(game.combo / 5) * 0.1, 3);
  const values = {
    "#hud-wpm": Math.round(wpm),
    "#hud-accuracy": `${accuracy.toFixed(0)}%`,
    "#hud-lives": "◆".repeat(Math.max(0, game.lives)),
    "#hud-score": game.score.toLocaleString(),
    "#hud-combo": `x${multiplier.toFixed(1)}`,
  };
  for (const [selector, value] of Object.entries(values)) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }
}

export function showPauseOverlay(selectedIndex, handlers) {
  document.querySelector(".pause-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "pause-overlay";
  overlay.innerHTML = `
    <div class="pause-panel">
      <div class="eyebrow">Simulation suspended</div>
      <h2>PAUSED</h2>
      <div class="menu-list">
        ${menuButton("RESUME", "resume", selectedIndex === 0)}
        ${menuButton("LEVEL SELECT", "levels", selectedIndex === 1)}
      </div>
      <p class="footer-hint">ESC RESUME</p>
    </div>`;
  document.querySelector(".game-screen")?.append(overlay);
  overlay.querySelector('[data-action="resume"]').onclick = handlers.resume;
  overlay.querySelector('[data-action="levels"]').onclick = handlers.levels;
}

export function hidePauseOverlay() {
  document.querySelector(".pause-overlay")?.remove();
}

export function renderResults(result, selectedIndex, handlers) {
  const cleared = result.grade !== "Fail";
  const canAdvance = cleared && result.levelNumber < 100;
  let actionIndex = 0;
  const retryButton = menuButton("RETRY", "retry", selectedIndex === actionIndex++);
  const nextButton = canAdvance
    ? menuButton("NEXT LEVEL", "next", selectedIndex === actionIndex++)
    : "";
  const levelsButton = menuButton("LEVEL SELECT", "levels", selectedIndex === actionIndex);
  app().innerHTML = `
    <section class="screen results-screen">
      <div class="results-panel">
        <div class="eyebrow">Level ${String(result.levelNumber).padStart(2, "0")} // ${cleared ? "Core secured" : "Core breached"}</div>
        <div class="grade ${cleared ? `grade-${result.grade.toLowerCase()}` : "fail"}">${result.grade}</div>
        <div class="stats-grid">
          <div class="stat"><span class="micro-label">WPM</span><strong>${Math.round(result.wpm)}</strong></div>
          <div class="stat"><span class="micro-label">Accuracy</span><strong>${result.accuracy.toFixed(1)}%</strong></div>
          <div class="stat"><span class="micro-label">Max combo</span><strong>${result.maxCombo}</strong></div>
          <div class="stat"><span class="micro-label">Score</span><strong>${result.score.toLocaleString()}</strong></div>
          <div class="stat"><span class="micro-label">Lives</span><strong>${result.livesRemaining}/${result.startingLives}</strong></div>
          <div class="stat"><span class="micro-label">Level</span><strong>${result.levelNumber}</strong></div>
        </div>
        <div class="menu-list">
          ${retryButton}
          ${nextButton}
          ${levelsButton}
        </div>
        <p class="footer-hint">ESC LEVEL SELECT</p>
      </div>
    </section>`;
  app().querySelector('[data-action="retry"]').onclick = handlers.retry;
  app().querySelector('[data-action="next"]')?.addEventListener("click", handlers.next);
  app().querySelector('[data-action="levels"]').onclick = handlers.levels;
}

export function renderSettings(save, selectedIndex, handlers) {
  const settings = save.settings;
  const rows = [
    ["Strict mode", "strictMode", "Wrong keys break combo"],
    ["Particles", "particles", "Lightweight word burst effect"],
    ["Screen shake", "screenShake", "Damage impact movement"],
  ];
  app().innerHTML = `
    <section class="screen settings-screen">
      <div class="settings-panel">
        <div class="eyebrow">Local configuration</div>
        <h1>SETTINGS</h1>
        <div class="settings-list">
          ${rows.map(([label, key, description], index) => `
            <div class="setting-row ${index === selectedIndex ? "selected" : ""}">
              <div><strong>${label}</strong><br><span class="micro-label">${description}</span></div>
              <button class="toggle ${settings[key] ? "on" : ""}" data-setting="${key}">${settings[key] ? "ON" : "OFF"}</button>
            </div>`).join("")}
        </div>
        <div class="menu-list">
          ${menuButton("RESET PROGRESS", "reset", selectedIndex === 3, "danger")}
          ${menuButton("BACK", "back", selectedIndex === 4)}
        </div>
        <p class="footer-hint">↑ ↓ SELECT &nbsp;•&nbsp; ENTER TOGGLE &nbsp;•&nbsp; ESC BACK</p>
      </div>
    </section>`;
  app().querySelectorAll("[data-setting]").forEach((button) => {
    button.onclick = () => handlers.toggle(button.dataset.setting);
  });
  app().querySelector('[data-action="reset"]').onclick = handlers.reset;
  app().querySelector('[data-action="back"]').onclick = handlers.back;
}

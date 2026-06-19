import { calculateAccuracy, calculateWPM } from "./scoring.js";
import { generateBossLevel, generateLevel } from "./levelGenerator.js";
import { selectBossPhrases } from "./wordBank.js";
import {
  getModifierById,
  getModifiersForLevel,
  NO_BACKSPACE_ID,
  QUICK_FINGERS_ID,
} from "./modifiers.js";

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

function renderDevPanel(selectedLevel, bossPhraseBank, forcedModifierId) {
  const isBoss = selectedLevel % 10 === 0;
  const config = isBoss ? generateBossLevel(selectedLevel) : generateLevel(selectedLevel);
  const phrases = isBoss ? selectBossPhrases(bossPhraseBank, config) : [];
  const fields = isBoss
    ? [
      ["level", selectedLevel],
      ["bossIndex", config.bossIndex],
      ["phraseCount", config.phraseCount],
      ["wordsPerPhrase", config.wordsPerPhrase],
      ["timeLimitSec", config.timeLimitSec],
      ["wordTier", config.wordTier],
      ["world", config.world],
      ["totalCharacters", phrases.reduce((sum, phrase) => sum + phrase.length, 0)],
      ["totalWords", phrases.reduce((sum, phrase) => sum + phrase.split(" ").length, 0)],
    ]
    : [
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
      ["modifiers", config.modifiers.join(", ") || "none"],
      ["forcedModifier", forcedModifierId && !isBoss ? forcedModifierId : "none"],
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
          ${[42, 52, 72, 22, 47, 87, 10, 50, 100].map((level) => `<button type="button" data-dev-level="${level}">${level}</button>`).join("")}
        </div>
        <div class="dev-force-options">
          <button type="button" class="dev-force-button ${forcedModifierId === QUICK_FINGERS_ID ? "active" : ""}" data-force-modifier="${QUICK_FINGERS_ID}" ${isBoss ? "disabled" : ""}>
            FORCE QUICK
          </button>
          <button type="button" class="dev-force-button ${forcedModifierId === NO_BACKSPACE_ID ? "active" : ""}" data-force-modifier="${NO_BACKSPACE_ID}" ${isBoss ? "disabled" : ""}>
            FORCE NO BACKSPACE
          </button>
        </div>
        ${forcedModifierId && !isBoss ? `<span class="forced-modifier-label">FORCED MODIFIER: ${getModifierById(forcedModifierId)?.name.toUpperCase()}</span>` : ""}
      </div>
      <div>
        <dl class="dev-config">
          ${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
        </dl>
        ${isBoss ? `<div class="dev-phrases"><span class="micro-label">Selected phrases</span>${phrases.map((phrase) => `<code>${phrase}</code>`).join("")}</div>` : ""}
      </div>
    </aside>`;
}

export function renderLevelSelect(
  save,
  selectedLevel,
  devMode,
  bossPhraseBank,
  forcedModifierId,
  handlers,
) {
  const selectedModifiers = getModifiersForLevel(selectedLevel);
  if (
    [QUICK_FINGERS_ID, NO_BACKSPACE_ID].includes(forcedModifierId) &&
    selectedLevel % 10 !== 0 &&
    !selectedModifiers.includes(forcedModifierId)
  ) {
    selectedModifiers.splice(0, selectedModifiers.length, forcedModifierId);
  }
  const selectedModifier = getModifierById(selectedModifiers[0]);
  const tiles = Array.from({ length: 100 }, (_, index) => {
    const level = index + 1;
    const locked = level > save.currentFurthestLevel;
    const result = save.levels[String(level)];
    const boss = level % 10 === 0;
    const modifiers = getModifiersForLevel(level);
    const quickFingers = modifiers.includes(QUICK_FINGERS_ID);
    const noBackspace = modifiers.includes(NO_BACKSPACE_ID);
    return `
      <button class="level-tile ${locked ? "locked" : ""} ${locked && devMode ? "dev-access" : ""} ${boss ? "boss" : ""} ${level === selectedLevel ? "selected" : ""}"
        data-level="${level}" ${locked && !devMode ? "disabled" : ""}>
        <span class="level-number">${String(level).padStart(2, "0")}</span>
        <span class="level-grade">${result?.grade || (locked ? "LOCKED" : "READY")}</span>
        ${boss ? '<span class="boss-mark">◆ BOSS</span>' : ""}
        ${quickFingers ? '<span class="modifier-mark" title="Quick Fingers">Q</span>' : ""}
        ${noBackspace ? '<span class="modifier-mark no-backspace" title="No Backspace">NB</span>' : ""}
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
      ${devMode ? renderDevPanel(selectedLevel, bossPhraseBank, forcedModifierId) : ""}
      <div class="level-detail ${selectedModifier ? "has-modifier" : ""}">
        ${selectedModifier
    ? `<strong>${selectedModifier.name}</strong><span>${selectedModifier.description}</span>`
    : "<span>No normal-level modifier assigned.</span>"}
      </div>
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
    app().querySelectorAll("[data-force-modifier]").forEach((button) => {
      if (!button.disabled) {
        button.onclick = () => handlers.devForceModifier(button.dataset.forceModifier);
      }
    });
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

export function renderGameplayShell(levelNumber, lives, config, devMode = false, forcedModifier = false) {
  const quickFingers = config.modifiers?.includes(QUICK_FINGERS_ID);
  const noBackspace = config.modifiers?.includes(NO_BACKSPACE_ID);
  const hasModifier = quickFingers || noBackspace;
  const modifier = getModifierById(config.modifiers?.[0]);
  app().innerHTML = `
    <section class="screen game-screen ${hasModifier ? "has-modifier" : ""} ${noBackspace ? "no-backspace-mode" : ""}">
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
      ${hasModifier ? `
        <div class="modifier-hud ${noBackspace ? "no-backspace" : ""}" id="modifier-hud">
          <strong>${modifier.name.toUpperCase()}${forcedModifier ? " // FORCED MODIFIER" : ""}</strong>
          <span id="modifier-phase">${quickFingers ? "BRIEFING" : "ZERO RECOVERY"}</span>
          ${noBackspace ? '<span id="abandoned-count">LOST WORDS: 0</span>' : ""}
          ${devMode ? '<small id="modifier-runtime-details"></small>' : ""}
        </div>` : ""}
      <div class="play-area" id="play-area">
        <div class="core" aria-label="Central core"></div>
      </div>
      ${hasModifier ? `
        <div class="modifier-briefing" id="modifier-briefing">
          <span>MODIFIER DETECTED</span>
          <strong>${modifier.name.toUpperCase()}</strong>
          ${quickFingers
    ? "<p>SPAWN RATE SURGES IN BURSTS</p>"
    : "<p>ONE WRONG KEY CORRUPTS THE TARGET<br>CORRUPTED WORDS CANNOT BE RECOVERED</p>"}
        </div>` : ""}
    </section>`;
}

export function updateHud(game) {
  const wpm = calculateWPM(game.correctCharacters, game.elapsedMs);
  const accuracy = calculateAccuracy(
    game.correctKeystrokes,
    game.totalKeystrokes,
    game.missedCharacters,
  );
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
  const briefing = document.querySelector("#modifier-briefing");
  if (briefing) briefing.hidden = game.phase !== "MODIFIER_BRIEFING";
  const runtime = game.modifierRuntime?.quickFingers;
  const modifierHud = document.querySelector("#modifier-hud");
  if (runtime && modifierHud) {
    const seconds = (runtime.remainingMs / 1000).toFixed(1);
    const phaseText = runtime.phase === "complete"
      ? "SPAWN SURGES COMPLETE"
      : runtime.active
        ? "BURST ACTIVE"
        : `BURST IN ${seconds}s`;
    const phaseElement = document.querySelector("#modifier-phase");
    if (phaseElement) {
      phaseElement.textContent = game.phase === "MODIFIER_BRIEFING"
        ? "BRIEFING"
        : phaseText;
    }
    modifierHud.classList.toggle("active", runtime.active);
    modifierHud.classList.toggle(
      "imminent",
      !runtime.active && runtime.remainingMs <= 1000,
    );
    const details = document.querySelector("#modifier-runtime-details");
    if (details) {
      details.textContent = [
        `phase=${runtime.phase}`,
        `transition=${seconds}s`,
        `bursts=${runtime.burstCount}`,
        `base=${game.config.spawnIntervalMs}ms`,
        `effective=${runtime.effectiveSpawnIntervalMs}ms`,
        `active=${game.words.length}/${game.config.maxSimultaneousWords}`,
      ].join(" // ");
    }
  }
  if (game.config.modifiers?.includes(NO_BACKSPACE_ID) && modifierHud) {
    const count = document.querySelector("#abandoned-count");
    if (count) count.textContent = `LOST WORDS: ${game.abandonedWordCount}`;
    const details = document.querySelector("#modifier-runtime-details");
    if (details) {
      const target = game.words.find((word) => word.id === game.activeTargetId);
      const recoverable = game.words.filter((word) => !word.abandoned).length;
      details.textContent = [
        `target=${game.activeTargetId ?? "none"}`,
        `targetAbandoned=${target?.abandoned === true}`,
        `abandoned=${game.abandonedWordCount}`,
        `charactersLost=${game.abandonedCharacters}`,
        `recoverable=${recoverable}`,
        `active=${game.words.length}`,
        `lives=${game.lives}`,
      ].join(" // ");
    }
  }
}

function bossIntroLabel(game) {
  const elapsed = game.introElapsedMs;
  if (elapsed < 650) return `BOSS NODE ${game.levelNumber}`;
  if (elapsed < 1100) return "PHRASE PROTOCOL";
  if (elapsed < 1550) return "3";
  if (elapsed < 2000) return "2";
  if (elapsed < 2450) return "1";
  return "TYPE";
}

export function renderBossShell(levelNumber, config) {
  app().innerHTML = `
    <section class="screen boss-screen">
      <header class="boss-hud">
        <div>
          <span class="micro-label">Boss node</span>
          <span class="boss-hud-value">${String(levelNumber).padStart(2, "0")}</span><br>
          <span id="boss-phrase-count">PHRASE 1 / ${config.phraseCount}</span>
        </div>
        <div class="boss-timer-wrap">
          <span class="micro-label">Time remaining</span>
          <strong class="boss-timer" id="boss-timer">${config.timeLimitSec.toFixed(1)}</strong>
        </div>
        <div class="boss-hud-right">
          <span>SCORE <span class="boss-hud-value" id="boss-score">0</span></span><br>
          <span>COMBO <span class="boss-hud-value" id="boss-combo">0</span></span>
          <span>&nbsp; ACC <span class="boss-hud-value" id="boss-accuracy">100%</span></span>
        </div>
      </header>
      <div class="boss-arena">
        <div class="boss-intro" id="boss-intro">BOSS NODE ${levelNumber}</div>
        <div class="boss-phrase-frame">
          <div class="boss-phrase" id="boss-phrase" aria-label="Boss phrase"></div>
          <div class="boss-progress"><div id="boss-progress-fill"></div></div>
          <div class="boss-instruction" id="boss-instruction">TYPE THE PHRASE</div>
        </div>
      </div>
    </section>`;
}

export function updateBossHud(game) {
  const accuracy = calculateAccuracy(
    game.correctKeystrokes,
    game.totalKeystrokes,
    game.missedCharacters,
  );
  const timer = document.querySelector("#boss-timer");
  if (timer) {
    timer.textContent = (game.remainingMs / 1000).toFixed(1);
    timer.classList.toggle("warning", game.remainingMs <= 10000 && game.remainingMs > 5000);
    timer.classList.toggle("danger", game.remainingMs <= 5000);
  }
  const intro = document.querySelector("#boss-intro");
  const frame = document.querySelector(".boss-phrase-frame");
  if (intro) {
    intro.textContent = bossIntroLabel(game);
    intro.hidden = game.phase !== "INTRO";
  }
  if (frame) {
    frame.classList.toggle("hidden", game.phase === "INTRO");
    frame.classList.toggle("transition", game.phase === "TRANSITION");
  }
  const values = {
    "#boss-phrase-count": `PHRASE ${Math.min(game.phraseIndex + 1, game.phrases.length)} / ${game.phrases.length}`,
    "#boss-score": game.score.toLocaleString(),
    "#boss-combo": game.combo,
    "#boss-accuracy": `${accuracy.toFixed(1)}%`,
    "#boss-instruction": game.phase === "TRANSITION" ? "PHRASE COMPLETE" : "TYPE THE PHRASE",
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
  document.querySelector(".game-screen, .boss-screen")?.append(overlay);
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
        <div class="eyebrow">${result.isBoss ? `BOSS ${result.levelNumber} ${cleared ? "CLEARED" : "FAILED"}` : `Level ${String(result.levelNumber).padStart(2, "0")} // ${cleared ? "Core secured" : "Core breached"}`}</div>
        <div class="grade ${cleared ? `grade-${result.grade.toLowerCase()}` : "fail"}">${result.grade}</div>
        ${result.modifierIds?.includes(QUICK_FINGERS_ID) ? `
          <div class="result-modifier">
            MODIFIER: QUICK FINGERS<br>
            BURSTS SURVIVED: ${result.burstCount}
          </div>` : ""}
        ${result.modifierIds?.includes(NO_BACKSPACE_ID) ? `
          <div class="result-modifier danger">
            MODIFIER: NO BACKSPACE<br>
            WORDS ABANDONED: ${result.abandonedWordCount}<br>
            CHARACTERS LOST: ${result.abandonedCharacters}
          </div>` : ""}
        <div class="stats-grid">
          <div class="stat"><span class="micro-label">WPM</span><strong>${Math.round(result.wpm)}</strong></div>
          <div class="stat"><span class="micro-label">Accuracy</span><strong>${result.accuracy.toFixed(1)}%</strong></div>
          <div class="stat"><span class="micro-label">Max combo</span><strong>${result.maxCombo}</strong></div>
          <div class="stat"><span class="micro-label">Score</span><strong>${result.score.toLocaleString()}</strong></div>
          ${result.isBoss
    ? `<div class="stat"><span class="micro-label">Time remaining</span><strong>${result.timeRemaining.toFixed(1)}s</strong></div>
          <div class="stat"><span class="micro-label">Phrases</span><strong>${result.phrasesCompleted}/${result.phraseCount}</strong></div>`
    : `<div class="stat"><span class="micro-label">Lives</span><strong>${result.livesRemaining}/${result.startingLives}</strong></div>
          <div class="stat"><span class="micro-label">Level</span><strong>${result.levelNumber}</strong></div>`}
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

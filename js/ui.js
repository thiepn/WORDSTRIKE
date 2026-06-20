import { calculateAccuracy, calculateWPM } from "./scoring.js";
import {
  generateBossLevel,
  generateLevel,
} from "./levelGenerator.js";
import { generateBossEncounter } from "./bossGenerator.js";
import {
  BLACKOUT_FADE_MS,
  BLACKOUT_ID,
  BLACKOUT_VISIBLE_MS,
  CHAIN_BREAK_CAUSES,
  CHAIN_ID,
  getModifierById,
  getModifiersForLevel,
  NO_BACKSPACE_ID,
  QUICK_FINGERS_ID,
} from "./modifiers.js";
import { getSessionDiagnosticText } from "./campaignSession.js";
import {
  getSpeedTestConfigsByType,
  SPEED_TEST_TYPES,
} from "./speedTestConfig.js";
import {
  getSpeedTestActiveDuration,
  getSpeedTestCurrentWord,
  getSpeedTestDiagnosticText,
  getSpeedTestLiveMetrics,
} from "./speedTest.js";
import { ENDLESS_CONFIG } from "./endlessConfig.js";
import { getEndlessDiagnosticText } from "./endlessMode.js";

const app = () => document.querySelector("#app");

function menuButton(label, action, selected = false, extraClass = "") {
  return `<button class="arcade-button ${selected ? "selected" : ""} ${extraClass}" data-action="${action}">${label}</button>`;
}

export function renderTitle(menuIndex, handlers) {
  const items = [
    ["START", "modes"],
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
  app().querySelector('[data-action="modes"]').onclick = handlers.modes;
  app().querySelector('[data-action="settings"]').onclick = handlers.settings;
}

export function renderModeSelect(modes, selectedIndex, handlers) {
  app().innerHTML = `
    <section class="screen mode-screen">
      <div class="mode-panel">
        <div class="eyebrow">Select simulation</div>
        <h1>MODE SELECT</h1>
        <div class="mode-grid">
          ${modes.map((mode, index) => mode.enabled
    ? `<button class="mode-card available ${index === selectedIndex ? "selected" : ""}"
                data-mode-id="${mode.id}" data-mode-index="${index}">
              <strong>${mode.name}</strong>
              <span>${mode.shortLabel}</span>
              <small>AVAILABLE</small>
            </button>`
    : `<article class="mode-card coming-soon ${index === selectedIndex ? "selected" : ""}"
                data-mode-id="${mode.id}" data-mode-index="${index}" aria-disabled="true">
              <strong>${mode.name}</strong>
              <span>${mode.shortLabel}</span>
              <small>COMING SOON</small>
            </article>`).join("")}
        </div>
        <p class="mode-description">${modes[selectedIndex]?.description || ""}</p>
        <p class="footer-hint">↑ ↓ SELECT &nbsp;•&nbsp; ENTER CONFIRM &nbsp;•&nbsp; ESC BACK</p>
      </div>
    </section>`;
  app().querySelectorAll("[data-mode-index]").forEach((card) => {
    const index = Number(card.dataset.modeIndex);
    card.onmouseenter = () => handlers.select?.(index);
    if (card.matches?.("button")) {
      card.onclick = () => handlers.activate?.(card.dataset.modeId);
    }
  });
  app().querySelector(".mode-card.available.selected")?.focus({ preventScroll: true });
}

export function renderEndlessReady(handlers = {}) {
  app().innerHTML = `
    <section class="screen endless-ready-screen">
      <div class="endless-ready-panel">
        <div class="eyebrow">Standard survival protocol</div>
        <h1>ENDLESS MODE</h1>
        <p class="endless-ready-lead">SURVIVE ESCALATING STAGES</p>
        <div class="endless-ready-rules">
          <span>${ENDLESS_CONFIG.startingIntegrity} CORE INTEGRITY</span>
          <span>${ENDLESS_CONFIG.wordsPerStage} WORDS PER STAGE</span>
        </div>
        <button class="arcade-button selected" data-action="endless-start">
          PRESS ENTER TO BEGIN
        </button>
        <p class="footer-hint">ENTER BEGIN &nbsp;•&nbsp; ESC MODE SELECT</p>
      </div>
    </section>`;
  app().querySelector('[data-action="endless-start"]').onclick = handlers.start;
}

export function renderEndlessShell(game, devMode = false) {
  app().innerHTML = `
    <section class="screen game-screen endless-screen">
      <header class="endless-hud">
        <div><strong>STAGE <span id="endless-stage">${game.stage}</span></strong>
          <span id="endless-progress">${game.stageWordsCompleted} / ${ENDLESS_CONFIG.wordsPerStage}</span></div>
        <div>SCORE <strong id="endless-score">0</strong></div>
        <div>CORE <strong class="endless-integrity" id="endless-integrity">${"◇".repeat(game.integrity)}</strong></div>
        <span class="endless-modifier-label" id="endless-modifier">${game.activeModifier ? getModifierById(game.activeModifier)?.name.toUpperCase() : ""}</span>
      </header>
      ${devMode ? `<aside class="dev-runtime-panel" id="dev-runtime-panel">${getEndlessDiagnosticText(game)}</aside>` : ""}
      <div class="play-area" id="play-area">
        <div class="core" aria-label="Central core"></div>
        <div class="endless-stage-banner" id="endless-stage-banner" hidden></div>
      </div>
    </section>`;
}

export function updateEndlessHud(game) {
  const values = {
    "#endless-stage": game.stage,
    "#endless-progress": `${game.stageWordsCompleted} / ${ENDLESS_CONFIG.wordsPerStage}`,
    "#endless-score": game.score.toLocaleString(),
    "#endless-integrity": "◇".repeat(Math.max(0, game.integrity)),
    "#endless-modifier": game.activeModifier
      ? getModifierById(game.activeModifier)?.name.toUpperCase() || ""
      : "",
  };
  for (const [selector, value] of Object.entries(values)) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }
  const banner = document.querySelector("#endless-stage-banner");
  if (banner) {
    banner.hidden = game.elapsedMs >= game.bannerUntilMs || !game.bannerText;
    banner.textContent = game.bannerText;
  }
  const diagnostics = document.querySelector("#dev-runtime-panel");
  if (diagnostics) diagnostics.textContent = getEndlessDiagnosticText(game);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function speedWordMarkup(expected, typed = "", showCaret = true) {
  const caretIndex = Math.min(typed.length, expected.length);
  const characters = [...expected].map((character, index) => {
    const className = index >= typed.length
      ? "speed-test-char-pending"
      : typed[index] === character
        ? "speed-test-char-correct"
        : "speed-test-char-incorrect";
    const caret = showCaret && index === caretIndex
      ? '<span class="speed-test-caret" aria-hidden="true"></span>'
      : "";
    return `${caret}<span class="${className}">${character}</span>`;
  }).join("");
  const extra = typed.length > expected.length
    ? `<span class="speed-test-extra">${escapeHtml(typed.slice(expected.length, expected.length + 12))}${typed.length > expected.length + 12 ? "…" : ""}</span>`
    : "";
  const trailingCaret = showCaret && typed.length >= expected.length
    ? '<span class="speed-test-caret" aria-hidden="true"></span>'
    : "";
  return `${characters}${extra}${trailingCaret}`;
}

function speedTestConfigMarkup(config, disabled) {
  const options = getSpeedTestConfigsByType(config.testType);
  const control = (label, attributes, active) => `
    <button class="speed-config-control ${active ? "active" : ""}"
            ${attributes} ${disabled ? "disabled" : ""}>${label}</button>`;
  return `
    <nav class="speed-test-config" aria-label="Typing Test configuration">
      <div class="speed-test-categories">
        ${control("TIME", 'data-speed-category="time"', config.testType === SPEED_TEST_TYPES.TIME)}
        ${control("WORDS", 'data-speed-category="words"', config.testType === SPEED_TEST_TYPES.WORDS)}
      </div>
      <span class="speed-config-divider" aria-hidden="true"></span>
      <div class="speed-test-values">
        ${options.map((option) => control(
    String(option.durationSeconds ?? option.wordCount),
    `data-speed-config="${option.configId}"`,
    option.configId === config.configId,
  )).join("")}
      </div>
    </nav>`;
}

export function renderSpeedTestRun(state, devMode = false, handlers = {}) {
  const isTime = state.config.testType === SPEED_TEST_TYPES.TIME;
  app().innerHTML = `
    <section class="screen speed-test-screen">
      <header class="speed-test-topbar">
        ${speedTestConfigMarkup(state.config, state.phase === "ACTIVE")}
        <div class="speed-test-hud">
          <strong id="speed-test-primary">${isTime
    ? state.config.durationSeconds.toFixed(1)
    : `0 / ${state.config.wordCount}`}</strong>
          <span id="speed-test-elapsed">${isTime ? "" : "00:00"}</span>
          <span>WPM <b id="speed-test-wpm">0</b></span>
          <span>ACC <b id="speed-test-accuracy">100%</b></span>
          <span>RAW <b id="speed-test-raw">0</b></span>
        </div>
      </header>
      <main class="speed-test-stage">
        <div class="speed-test-status" id="speed-test-status">START TYPING</div>
        <div class="speed-test-word-viewport" id="speed-test-word-viewport">
          <div class="speed-test-word-flow" id="speed-test-word-flow">
            ${state.words.map((word, index) => `
              <span class="speed-test-word ${index === 0 ? "speed-test-word-current" : ""}"
                    data-speed-word-index="${index}"
                    aria-current="${index === 0 ? "true" : "false"}">${speedWordMarkup(word, "", index === 0)}</span>`).join("")}
          </div>
        </div>
        <p class="speed-test-hint">ESC — ABORT</p>
      </main>
      ${devMode ? `<aside class="speed-test-dev" id="speed-test-dev">${getSpeedTestDiagnosticText(state)}</aside>` : ""}
    </section>`;
  app().querySelectorAll("[data-speed-config]").forEach((button) => {
    button.onclick = () => handlers.selectConfig?.(button.dataset.speedConfig);
  });
  app().querySelectorAll("[data-speed-category]").forEach((button) => {
    button.onclick = () => handlers.selectConfig?.(
      button.dataset.speedCategory === SPEED_TEST_TYPES.TIME ? "time-60" : "words-50",
    );
  });
}

export function updateSpeedTestRun(state, nowMs) {
  if (!state) return;
  const now = Number.isFinite(nowMs)
    ? nowMs
    : globalThis.performance?.now?.() ?? Date.now();
  const live = getSpeedTestLiveMetrics(state, now);
  const activeDuration = getSpeedTestActiveDuration(state, now);
  const primary = document.querySelector("#speed-test-primary");
  if (primary) {
    primary.textContent = state.config.testType === SPEED_TEST_TYPES.TIME
      ? (state.activeStartedAtMs == null
        ? state.config.durationSeconds
        : Math.max(0, (state.deadlineMs - now) / 1000)).toFixed(1)
      : `${state.metrics.wordsCompleted} / ${state.config.wordCount}`;
  }
  const values = {
    "#speed-test-wpm": Math.round(live.wpm),
    "#speed-test-raw": Math.round(live.rawWpm),
    "#speed-test-accuracy": `${live.accuracy.toFixed(1)}%`,
    "#speed-test-elapsed": `${Math.floor(activeDuration / 60000).toString().padStart(2, "0")}:${Math.floor((activeDuration % 60000) / 1000).toString().padStart(2, "0")}`,
    "#speed-test-status": state.activeStartedAtMs == null
      ? "START TYPING"
      : `TIME ${Math.floor(activeDuration / 60000).toString().padStart(2, "0")}:${Math.floor((activeDuration % 60000) / 1000).toString().padStart(2, "0")}`,
  };
  for (const [selector, value] of Object.entries(values)) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  const flow = document.querySelector("#speed-test-word-flow");
  if (flow) {
    const renderedCount = flow.querySelectorAll?.("[data-speed-word-index]").length || 0;
    if (renderedCount < state.words.length && flow.insertAdjacentHTML) {
      flow.insertAdjacentHTML(
        "beforeend",
        state.words.slice(renderedCount).map((word, offset) => {
          const index = renderedCount + offset;
          return `<span class="speed-test-word" data-speed-word-index="${index}" aria-current="false">${speedWordMarkup(word, "", false)}</span>`;
        }).join(""),
      );
    }
  }

  for (let index = 0; index < state.committedWords.length; index += 1) {
    const element = document.querySelector(`[data-speed-word-index="${index}"]`);
    if (!element || element.dataset.committed === "true") continue;
    const result = state.committedWords[index];
    element.classList.remove("speed-test-word-current");
    element.classList.add("speed-test-word-complete");
    if (!result.exact) element.classList.add("speed-test-word-error");
    element.innerHTML = speedWordMarkup(result.expected, result.typed, false);
    element.dataset.committed = "true";
    element.setAttribute?.("aria-current", "false");
  }

  document.querySelectorAll?.(".speed-test-word-current").forEach((element) => {
    if (Number(element.dataset.speedWordIndex) !== state.currentWordIndex) {
      element.classList.remove("speed-test-word-current");
      element.setAttribute?.("aria-current", "false");
    }
  });
  const current = document.querySelector(
    `[data-speed-word-index="${state.currentWordIndex}"]`,
  );
  if (current) {
    current.classList.add("speed-test-word-current");
    current.innerHTML = speedWordMarkup(
      getSpeedTestCurrentWord(state),
      state.typedBuffer,
    );
    current.setAttribute?.("aria-current", "true");
    const lineTop = Number(current.offsetTop) || 0;
    const lineHeight = Math.max(1, Number(current.offsetHeight) || 1);
    const lineIndex = Math.max(0, Math.round(lineTop / lineHeight));
    if (lineIndex !== state.currentLineIndex) {
      state.currentLineIndex = lineIndex;
      const viewport = document.querySelector("#speed-test-word-viewport");
      if (viewport) {
        const targetTop = Math.max(
          0,
          lineTop - (Number(viewport.clientHeight) || 0) / 2 + lineHeight / 2,
        );
        viewport.scrollTo?.({ top: targetTop, behavior: "smooth" });
        if (!viewport.scrollTo) viewport.scrollTop = targetTop;
      }
    }
  }
  document.querySelectorAll?.(".speed-config-control").forEach((button) => {
    button.disabled = state.phase === "ACTIVE";
  });
  const diagnostics = document.querySelector("#speed-test-dev");
  if (diagnostics) diagnostics.textContent = getSpeedTestDiagnosticText(state, now);
}

export function renderSpeedTestResults(result, recordFlags, selectedIndex, handlers) {
  const actions = [
    ["RETRY SAME TEST", "retry"],
    ["CHANGE TEST", "change"],
    ["MODE SELECT", "modes"],
    ["MAIN MENU", "title"],
  ];
  const mode = result.modeData;
  const configLabel = result.variantId === SPEED_TEST_TYPES.TIME
    ? `${mode.durationSeconds} SECOND TEST`
    : `${mode.targetWordCount} WORD TEST`;
  app().innerHTML = `
    <section class="screen speed-results-screen">
      <div class="speed-results-panel">
        <div class="eyebrow">${configLabel}</div>
        <h1>TEST COMPLETE</h1>
        <div class="speed-result-headline">
          <div><span>WPM</span><strong>${result.wpm.toFixed(1)}</strong></div>
          <div><span>ACCURACY</span><strong>${result.accuracy.toFixed(1)}%</strong></div>
          <div><span>RAW</span><strong>${mode.rawWpm.toFixed(1)}</strong></div>
        </div>
        ${(recordFlags.newWpmRecord || recordFlags.newAccuracyRecord) ? `
          <div class="speed-records">
            ${recordFlags.newWpmRecord ? "<span>NEW WPM RECORD</span>" : ""}
            ${recordFlags.newAccuracyRecord ? "<span>NEW ACCURACY RECORD</span>" : ""}
          </div>` : ""}
        <div class="speed-result-details">
          <div><span>Characters</span><strong>${result.characters.correct} correct / ${result.characters.incorrect} incorrect</strong></div>
          <div><span>Words</span><strong>${mode.exactWords} exact / ${mode.incorrectWords} incorrect</strong></div>
          <div><span>Extras</span><strong>${mode.extraCharacters}</strong></div>
          <div><span>Missed</span><strong>${result.characters.missed}</strong></div>
          <div><span>Backspaces</span><strong>${mode.backspaces}</strong></div>
          <div><span>Word deletes</span><strong>${mode.wordDeletes ?? 0}</strong></div>
          <div><span>Duration</span><strong>${(result.activeDurationMs / 1000).toFixed(1)}s</strong></div>
        </div>
        <div class="menu-list">
          ${actions.map(([label, action], index) => menuButton(
    label,
    action,
    index === selectedIndex,
  )).join("")}
        </div>
      </div>
    </section>`;
  for (const [, action] of actions) {
    app().querySelector(`[data-action="${action}"]`).onclick = handlers[action];
  }
  app().querySelectorAll(".speed-results-panel .arcade-button").forEach((button, index) => {
    button.onmouseenter = () => handlers.select?.(index);
  });
}

function renderDevPanel(
  selectedLevel,
  bossWordBank,
  forcedModifierId,
  developerSeed,
) {
  const isBoss = selectedLevel % 10 === 0;
  const config = isBoss ? generateBossLevel(selectedLevel) : generateLevel(selectedLevel);
  const previewSeed = developerSeed || selectedLevel * 104729;
  const encounter = isBoss
    ? generateBossEncounter(bossWordBank, selectedLevel, previewSeed)
    : null;
  const fields = isBoss
    ? [
      ["level", selectedLevel],
      ["bossIndex", config.bossIndex],
      ["segmentCount", config.segmentCount],
      ["wordsPerSegment", config.wordsPerSegment],
      ["totalWordCount", config.totalWordCount],
      ["minimumWordLength", config.minimumWordLength],
      ["requiredAverageWordLength", config.requiredAverageWordLength],
      ["minimumLongestWord", config.minimumLongestWord],
      ["attemptSeed", previewSeed],
      ["minimumSelectedWordLength", encounter.metrics.minimumSelectedWordLength],
      ["averageSelectedWordLength", encounter.metrics.averageSelectedWordLength.toFixed(2)],
      ["longestSelectedWord", encounter.metrics.longestSelectedWord],
      ["totalRequiredCharacters", encounter.metrics.totalRequiredCharacters],
      ["targetWPM", config.targetWPM],
      ["idealTypingSeconds", encounter.timing.idealTypingSeconds.toFixed(2)],
      ["transitionAllowance", encounter.timing.transitionAllowanceSeconds.toFixed(2)],
      ["effectiveTimeLimitSec", encounter.timing.effectiveTimeLimitSec.toFixed(2)],
      ["generationAttempt", encounter.generationAttempt],
      ["fallbackUsed", encounter.fallbackUsed],
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
      ["blackoutVisibleMs", BLACKOUT_VISIBLE_MS],
      ["blackoutFadeMs", BLACKOUT_FADE_MS],
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
          ${[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 22, 42, 62, 82, 99].map((level) => `<button type="button" data-dev-level="${level}">${level}</button>`).join("")}
        </div>
        <div class="dev-force-options">
          <button type="button" class="dev-force-button ${forcedModifierId === QUICK_FINGERS_ID ? "active" : ""}" data-force-modifier="${QUICK_FINGERS_ID}" ${isBoss ? "disabled" : ""}>
            FORCE QUICK
          </button>
          <button type="button" class="dev-force-button ${forcedModifierId === NO_BACKSPACE_ID ? "active" : ""}" data-force-modifier="${NO_BACKSPACE_ID}" ${isBoss ? "disabled" : ""}>
            FORCE NO BACKSPACE
          </button>
          <button type="button" class="dev-force-button ${forcedModifierId === BLACKOUT_ID ? "active" : ""}" data-force-modifier="${BLACKOUT_ID}" ${isBoss ? "disabled" : ""}>
            FORCE BLACKOUT
          </button>
          <button type="button" class="dev-force-button ${forcedModifierId === CHAIN_ID ? "active" : ""}" data-force-modifier="${CHAIN_ID}" ${isBoss ? "disabled" : ""}>
            FORCE CHAIN
          </button>
        </div>
        ${forcedModifierId && !isBoss ? `<span class="forced-modifier-label">FORCED MODIFIER: ${getModifierById(forcedModifierId)?.name.toUpperCase()}</span>` : ""}
      </div>
      <div>
        <dl class="dev-config">
          ${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
        </dl>
        ${isBoss ? `
          <div class="dev-phrases">
            <span class="micro-label">Selected segments</span>
            ${encounter.segments.map((segment, index) => `<code>${index + 1}: ${segment}</code>`).join("")}
            <span class="micro-label">Words and lengths</span>
            <code>${encounter.words.map((word) => `${word} (${word.length})`).join(", ")}</code>
          </div>` : ""}
      </div>
    </aside>`;
}

export function renderLevelSelect(
  save,
  selectedLevel,
  devMode,
  bossWordBank,
  forcedModifierId,
  developerSeed,
  handlers,
) {
  const selectedModifiers = getModifiersForLevel(selectedLevel);
  if (
    [QUICK_FINGERS_ID, NO_BACKSPACE_ID, BLACKOUT_ID, CHAIN_ID].includes(forcedModifierId) &&
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
    const blackout = modifiers.includes(BLACKOUT_ID);
    const chain = modifiers.includes(CHAIN_ID);
    return `
      <button class="level-tile ${locked ? "locked" : ""} ${locked && devMode ? "dev-access" : ""} ${boss ? "boss" : ""} ${level === selectedLevel ? "selected" : ""}"
        data-level="${level}" ${locked && !devMode ? "disabled" : ""}>
        <span class="level-number">${String(level).padStart(2, "0")}</span>
        <span class="level-grade">${result?.grade || (locked ? "LOCKED" : "READY")}</span>
        ${boss ? '<span class="boss-mark">◆ BOSS</span>' : ""}
        ${quickFingers ? '<span class="modifier-mark" title="Quick Fingers">Q</span>' : ""}
        ${noBackspace ? '<span class="modifier-mark no-backspace" title="No Backspace">NB</span>' : ""}
        ${blackout ? '<span class="modifier-mark blackout" title="Blackout">BLK</span>' : ""}
        ${chain ? '<span class="modifier-mark chain" title="Chain">CH</span>' : ""}
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
      ${devMode
    ? renderDevPanel(selectedLevel, bossWordBank, forcedModifierId, developerSeed)
    : ""}
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

export function renderDevSessionDiagnostics() {
  const diagnostics = document.createElement("aside");
  diagnostics.className = "dev-session-diagnostics";
  diagnostics.textContent = getSessionDiagnosticText();
  document.body.append(diagnostics);
}

export function renderGameplayShell(
  levelNumber,
  lives,
  config,
  devMode = false,
  forcedModifier = false,
  attempt = {},
) {
  const quickFingers = config.modifiers?.includes(QUICK_FINGERS_ID);
  const noBackspace = config.modifiers?.includes(NO_BACKSPACE_ID);
  const blackout = config.modifiers?.includes(BLACKOUT_ID);
  const chain = config.modifiers?.includes(CHAIN_ID);
  const hasModifier = quickFingers || noBackspace || blackout || chain;
  const modifier = getModifierById(config.modifiers?.[0]);
  app().innerHTML = `
    <section class="screen game-screen ${hasModifier ? "has-modifier" : ""} ${noBackspace ? "no-backspace-mode" : ""} ${blackout ? "blackout-mode" : ""} ${chain ? "chain-mode" : ""}">
      <header class="hud">
        <div>
          <span class="micro-label">Level</span>
          <span class="hud-value" id="hud-level">${String(levelNumber).padStart(2, "0")}</span><br>
          <span>WPM <span class="hud-value" id="hud-wpm">0</span></span>
          <span>&nbsp; ACC <span class="hud-value" id="hud-accuracy">100%</span></span>
        </div>
        <div class="hud-center">
          <span class="micro-label">${chain ? "Chain integrity" : "Core integrity"}</span><br>
          <span class="${chain ? "chain-integrity" : "lives"}" id="hud-lives">${chain ? "◇ INTACT" : "◆".repeat(lives)}</span>
        </div>
        <div class="hud-right">
          <span class="micro-label">Score</span>
          <span class="hud-value" id="hud-score">0</span><br>
          <span>COMBO <span class="hud-value" id="hud-combo">x1.0</span></span>
        </div>
      </header>
      ${hasModifier ? `
        <div class="modifier-hud ${noBackspace ? "no-backspace" : ""} ${blackout ? "blackout" : ""} ${chain ? "chain" : ""}" id="modifier-hud">
          <strong>${modifier.name.toUpperCase()}${forcedModifier ? " // FORCED MODIFIER" : ""}</strong>
          <span id="modifier-phase">${quickFingers
    ? "BRIEFING"
    : blackout
      ? "MEMORIZE THE WORDS"
      : chain
        ? "ZERO MISTAKES ALLOWED"
        : "ZERO RECOVERY"}</span>
          ${noBackspace ? '<span id="abandoned-count">LOST WORDS: 0</span>' : ""}
          ${blackout ? '<span id="blackout-counts">VISIBLE 0 // FADING 0 // HIDDEN 0</span>' : ""}
          ${devMode ? '<small id="modifier-runtime-details"></small>' : ""}
        </div>` : ""}
      ${devMode ? `
        <aside class="dev-runtime-panel" id="dev-runtime-panel">
          seed=${attempt.attemptSeed} // selected=${attempt.selectedWords?.join(",")}
          // queue=${attempt.spawnQueue?.join(",")} // ${getSessionDiagnosticText()}
        </aside>` : ""}
      <div class="play-area" id="play-area">
        <div class="core" aria-label="Central core"></div>
      </div>
      ${hasModifier ? `
        <div class="modifier-briefing" id="modifier-briefing">
          <span>MODIFIER DETECTED</span>
          <strong>${modifier.name.toUpperCase()}</strong>
          ${quickFingers
    ? "<p>SPAWN RATE SURGES IN BURSTS</p>"
    : noBackspace
      ? "<p>ONE WRONG KEY CORRUPTS THE TARGET<br>CORRUPTED WORDS CANNOT BE RECOVERED</p>"
      : blackout
        ? "<p>WORDS VANISH AFTER TWO SECONDS<br>REMEMBER THEM BEFORE THEY DISAPPEAR</p>"
        : "<p>ONE MISTAKE ENDS THE RUN<br>KEEP THE CHAIN ALIVE</p>"}
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
    "#hud-lives": game.chainRuntime
      ? game.chainRuntime.broken ? "◇ BROKEN" : "◇ INTACT"
      : "◆".repeat(Math.max(0, game.lives)),
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
  if (game.config.modifiers?.includes(BLACKOUT_ID) && modifierHud) {
    const counts = { visible: 0, fading: 0, hidden: 0 };
    for (const word of game.words) {
      counts[word.blackoutPhase || "visible"] += 1;
    }
    const countElement = document.querySelector("#blackout-counts");
    if (countElement) {
      countElement.textContent = `VISIBLE ${counts.visible} // FADING ${counts.fading} // HIDDEN ${counts.hidden}`;
    }
    const details = document.querySelector("#modifier-runtime-details");
    if (details) {
      const target = game.words.find((word) => word.id === game.activeTargetId);
      const targetAge = target
        ? Math.max(0, game.elapsedMs - target.spawnedAtActiveMs)
        : 0;
      details.textContent = [
        `targetPhase=${target?.blackoutPhase || "none"}`,
        `targetAge=${Math.round(targetAge)}ms`,
        `hidden=${game.blackoutStats.wordsHidden}`,
        `hiddenCompleted=${game.blackoutStats.hiddenWordsCompleted}`,
        `missedAfterFade=${game.blackoutStats.wordsMissedAfterFade}`,
        `active=${game.words.length}`,
        `lives=${game.lives}`,
      ].join(" // ");
    }
  }
  if (game.config.modifiers?.includes(CHAIN_ID) && modifierHud) {
    modifierHud.classList.toggle("broken", game.chainRuntime.broken);
    const phaseElement = document.querySelector("#modifier-phase");
    if (phaseElement) {
      phaseElement.textContent = game.phase === "MODIFIER_BRIEFING"
        ? "BRIEFING"
        : game.chainRuntime.broken
          ? "CHAIN BROKEN"
          : "ZERO MISTAKES ALLOWED";
    }
    const details = document.querySelector("#modifier-runtime-details");
    if (details) {
      details.textContent = [
        `active=${game.chainRuntime.active}`,
        `broken=${game.chainRuntime.broken}`,
        `cause=${game.chainRuntime.breakCause || "none"}`,
        `comboAtBreak=${game.chainRuntime.comboAtBreak}`,
        `failedWord=${game.chainRuntime.failedWordId ?? "none"}`,
        `targeting=${game.targetingState.mode}`,
        `candidates=${game.targetingState.candidateIds.join(",") || "none"}`,
        `target=${game.targetingState.activeTargetId ?? "none"}`,
        `words=${game.words.length}`,
      ].join(" // ");
    }
  }
  const devRuntime = document.querySelector("#dev-runtime-panel");
  if (devRuntime) {
    const state = game.targetingState;
    const candidateWords = game.words.filter((word) => state.candidateIds.includes(word.id));
    devRuntime.textContent = [
      `seed=${game.attemptSeed}`,
      `selected=${game.selectedWords.join(",")}`,
      `queue=${game.wordQueue.join(",")}`,
      `targeting=${state.mode}`,
      `prefixLength=${state.prefix.length}`,
      `candidates=${state.candidateIds.length}`,
      `candidateIds=${state.candidateIds.join(",") || "none"}`,
      `candidateTexts=${candidateWords.map((word) => word.text).join(",") || "none"}`,
      `activeTarget=${state.activeTargetId ?? "none"}`,
      `chainActive=${game.chainRuntime?.active === true}`,
      `chainBroken=${game.chainRuntime?.broken === true}`,
      `chainCause=${game.chainRuntime?.breakCause || "none"}`,
      `comboAtBreak=${game.chainRuntime?.comboAtBreak ?? 0}`,
      `failedWord=${game.chainRuntime?.failedWordId ?? "none"}`,
      `offsets=${game.words.map((word) => `${word.id}:${(word.separationX || 0).toFixed(1)},${(word.separationY || 0).toFixed(1)}`).join("|") || "none"}`,
      `visibility=${candidateWords.map((word) => `${word.id}:${word.blackoutPhase || "visible"}`).join("|") || "none"}`,
      getSessionDiagnosticText(),
    ].join(" // ");
  }
}

function bossIntroLabel(game) {
  const elapsed = game.introElapsedMs;
  if (elapsed < 1300) return "BOSS ENCOUNTER";
  if (elapsed < 1750) return "3";
  if (elapsed < 2150) return "2";
  if (elapsed < 2550) return "1";
  return "TYPE";
}

function bossDiagnosticText(config, attempt) {
  const encounter = attempt.encounter;
  if (!encounter) return "";
  return [
    `level=${config.level}`,
    `seed=${attempt.attemptSeed}`,
    `vocabulary=${config.vocabularySource || "dedicated"}`,
    `profile=${config.segmentCount}x${config.wordsPerSegment},min${config.minimumWordLength},avg${config.requiredAverageWordLength},long${config.minimumLongestWord}`,
    `words=${config.totalWordCount}`,
    `selectedMin=${encounter.metrics.minimumSelectedWordLength}`,
    `selectedAvg=${encounter.metrics.averageSelectedWordLength.toFixed(2)}`,
    `selectedLongest=${encounter.metrics.longestSelectedWord}`,
    `characters=${encounter.metrics.totalRequiredCharacters}`,
    `targetWPM=${config.targetWPM}`,
    `ideal=${encounter.timing.idealTypingSeconds.toFixed(2)}s`,
    `transitions=${encounter.timing.transitionAllowanceSeconds.toFixed(2)}s`,
    `effective=${encounter.timing.effectiveTimeLimitSec.toFixed(2)}s`,
    `attempt=${encounter.generationAttempt}`,
    `fallback=${encounter.fallbackUsed}`,
    `segments=${encounter.segments.join(" | ")}`,
    `lengths=${encounter.words.map((word) => `${word}:${word.length}`).join(",")}`,
    getSessionDiagnosticText(),
  ].join(" // ");
}

export function renderBossShell(levelNumber, config, devMode = false, attempt = {}) {
  app().innerHTML = `
    <section class="screen boss-screen">
      <header class="boss-hud">
        <div>
          <span class="boss-hud-value">BOSS ${config.bossIndex} / 10</span><br>
          <span id="boss-phrase-count">SEQUENCE 1 / ${config.segmentCount}</span>
          <span>&nbsp; WORDS <span class="boss-hud-value" id="boss-word-count">0 / ${config.totalWordCount}</span></span>
        </div>
        <div class="boss-timer-wrap">
          <span class="micro-label">Time</span>
          <strong class="boss-timer" id="boss-timer">${config.timeLimitSec.toFixed(1)}</strong>
        </div>
        <div class="boss-hud-right">
          <span>SCORE <span class="boss-hud-value" id="boss-score">0</span></span><br>
          <span>COMBO <span class="boss-hud-value" id="boss-combo">0</span></span>
          <span>&nbsp; WPM <span class="boss-hud-value" id="boss-wpm">0</span></span>
          <span>&nbsp; ACC <span class="boss-hud-value" id="boss-accuracy">100%</span></span>
        </div>
      </header>
      ${devMode ? `
        <aside class="dev-runtime-panel boss-dev-runtime" id="dev-runtime-panel">
          ${bossDiagnosticText(config, attempt)}
        </aside>` : ""}
      <div class="boss-arena">
        <div class="boss-intro" id="boss-intro">
          <strong id="boss-intro-title">BOSS ENCOUNTER</strong>
          <span>ADVANCED VOCABULARY</span>
          <p>COMPLETE EVERY SEQUENCE BEFORE TIME EXPIRES</p>
          ${config.bossIndex >= 8 ? "<small>DIFFICULTY: EXTREME</small>" : ""}
        </div>
        <div class="boss-phrase-frame">
          <div class="boss-phrase" id="boss-phrase" aria-label="Boss phrase"></div>
          <div class="boss-progress"><div id="boss-progress-fill"></div></div>
          <div class="boss-instruction" id="boss-instruction">TYPE THE SEQUENCE</div>
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
  const wpm = calculateWPM(game.correctCharacters, game.elapsedMs);
  const timer = document.querySelector("#boss-timer");
  if (timer) {
    timer.textContent = (game.remainingMs / 1000).toFixed(1);
    timer.classList.toggle("warning", game.remainingMs <= 10000 && game.remainingMs > 5000);
    timer.classList.toggle("danger", game.remainingMs <= 5000);
  }
  const intro = document.querySelector("#boss-intro");
  const introTitle = document.querySelector("#boss-intro-title");
  const frame = document.querySelector(".boss-phrase-frame");
  if (introTitle) introTitle.textContent = bossIntroLabel(game);
  if (intro) intro.hidden = game.phase !== "INTRO";
  if (frame) {
    frame.classList.toggle("hidden", game.phase === "INTRO");
    frame.classList.toggle("transition", game.phase === "TRANSITION");
  }
  const completedWords = game.phrases
    .slice(0, game.phraseIndex)
    .reduce((sum, segment) => sum + segment.split(" ").length, 0);
  const activePrefix = game.currentPhrase.slice(0, game.phraseCharIndex);
  const activeCompletedWords = (activePrefix.match(/ /g) || []).length +
    (game.phraseCharIndex >= game.currentPhrase.length && game.currentPhrase.length ? 1 : 0);
  const totalSequences = Math.max(1, game.phrases.length);
  const displayedSequenceNumber = Math.max(
    1,
    Math.min(
      totalSequences,
      Number.isInteger(game.displayedSequenceNumber)
        ? game.displayedSequenceNumber
        : game.phraseIndex + 1,
    ),
  );
  const values = {
    "#boss-phrase-count": `SEQUENCE ${displayedSequenceNumber} / ${totalSequences}`,
    "#boss-word-count": `${Math.min(completedWords + activeCompletedWords, game.config.totalWordCount)} / ${game.config.totalWordCount}`,
    "#boss-score": game.score.toLocaleString(),
    "#boss-combo": game.combo,
    "#boss-wpm": Math.round(wpm),
    "#boss-accuracy": `${accuracy.toFixed(1)}%`,
    "#boss-instruction": game.phase === "TRANSITION" ? "SEQUENCE COMPLETE" : "TYPE THE SEQUENCE",
  };
  for (const [selector, value] of Object.entries(values)) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }
  const devRuntime = document.querySelector("#dev-runtime-panel");
  if (devRuntime) {
    devRuntime.textContent = bossDiagnosticText(game.config, {
      attemptSeed: game.attemptSeed,
      encounter: {
        generationAttempt: game.config.generationAttempt,
        fallbackUsed: game.config.fallbackUsed,
        segments: game.phrases,
        words: game.config.words,
        metrics: {
          minimumSelectedWordLength: game.config.minimumSelectedWordLength,
          averageSelectedWordLength: game.config.averageSelectedWordLength,
          longestSelectedWord: game.config.longestSelectedWord,
          totalRequiredCharacters: game.config.totalRequiredCharacters,
        },
        timing: game.config,
      },
    });
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
        ${menuButton("RETRY", "retry", selectedIndex === 1)}
        ${menuButton("LEVEL SELECT", "levels", selectedIndex === 2)}
        ${menuButton("MAIN MENU", "title", selectedIndex === 3)}
      </div>
      <p class="footer-hint">ESC RESUME</p>
    </div>`;
  document.querySelector(".game-screen, .boss-screen")?.append(overlay);
  overlay.querySelector('[data-action="resume"]').onclick = handlers.resume;
  overlay.querySelector('[data-action="retry"]').onclick = handlers.retry;
  overlay.querySelector('[data-action="levels"]').onclick = handlers.levels;
  overlay.querySelector('[data-action="title"]').onclick = handlers.title;
  overlay.querySelectorAll(".arcade-button").forEach((button, index) => {
    button.onmouseenter = () => {
      overlay.querySelectorAll(".arcade-button").forEach(
        (item) => item.classList.remove("selected"),
      );
      button.classList.add("selected");
      handlers.select?.(index);
    };
  });
}

export function showEndlessPauseOverlay(selectedIndex, handlers) {
  document.querySelector(".pause-overlay")?.remove();
  const actions = [
    ["RESUME", "resume"],
    ["RESTART", "restart"],
    ["MODE SELECT", "modes"],
    ["MAIN MENU", "title"],
  ];
  const overlay = document.createElement("div");
  overlay.className = "pause-overlay";
  overlay.innerHTML = `
    <div class="pause-panel">
      <div class="eyebrow">Endless run suspended</div>
      <h2>PAUSED</h2>
      <div class="menu-list">${actions.map(([label, action], index) => (
    menuButton(label, action, index === selectedIndex)
  )).join("")}</div>
      <p class="footer-hint">ESC RESUME</p>
    </div>`;
  document.querySelector(".endless-screen")?.append(overlay);
  for (const [, action] of actions) {
    overlay.querySelector(`[data-action="${action}"]`).onclick = handlers[action];
  }
  overlay.querySelectorAll(".arcade-button").forEach((button, index) => {
    button.onmouseenter = () => {
      overlay.querySelectorAll(".arcade-button").forEach(
        (item) => item.classList.remove("selected"),
      );
      button.classList.add("selected");
      handlers.select?.(index);
    };
  });
}

export function renderEndlessResults(result, selectedIndex, handlers) {
  const data = result.modeData;
  const actions = [
    ["RETRY", "retry"],
    ["MODE SELECT", "modes"],
    ["MAIN MENU", "title"],
  ];
  app().innerHTML = `
    <section class="screen endless-results-screen">
      <div class="endless-results-panel">
        <div class="eyebrow">Endless mode</div>
        <h1>RUN OVER</h1>
        <div class="endless-result-headline">
          <div><span>Highest stage</span><strong>${data.highestStage}</strong></div>
          <div><span>Score</span><strong>${result.score.toLocaleString()}</strong></div>
          <div><span>Survival time</span><strong>${(data.survivalTimeMs / 1000).toFixed(1)}s</strong></div>
        </div>
        <div class="endless-result-details">
          <div><span>Words completed</span><strong>${data.wordsCompleted}</strong></div>
          <div><span>Stage progress</span><strong>${data.stageProgress} / ${ENDLESS_CONFIG.wordsPerStage}</strong></div>
          <div><span>Accuracy</span><strong>${result.accuracy.toFixed(1)}%</strong></div>
          <div><span>Average WPM</span><strong>${result.wpm.toFixed(1)}</strong></div>
          <div><span>Peak WPM</span><strong>${data.peakWpm.toFixed(1)}</strong></div>
          <div><span>Final rolling WPM</span><strong>${data.finalRollingWpm.toFixed(1)}</strong></div>
          <div><span>Maximum combo</span><strong>${data.maximumCombo}</strong></div>
          <div><span>Maximum perfect streak</span><strong>${data.maximumPerfectStreak}</strong></div>
          <div><span>Core hits / breaches</span><strong>${data.coreHits} / ${data.coreBreaches}</strong></div>
          <div><span>Modifier stages survived</span><strong>${data.modifiersSurvived}</strong></div>
          <div><span>Score breakdown</span><strong>${data.survivalPoints} + ${data.wordPoints} + ${data.stageBonusPoints}</strong></div>
          <div><span>Attempt seed</span><strong>${data.attemptSeed}</strong></div>
        </div>
        <div class="menu-list">${actions.map(([label, action], index) => (
    menuButton(label, action, index === selectedIndex)
  )).join("")}</div>
      </div>
    </section>`;
  for (const [, action] of actions) {
    app().querySelector(`[data-action="${action}"]`).onclick = handlers[action];
  }
  app().querySelectorAll(".endless-results-panel .arcade-button").forEach((button, index) => {
    button.onmouseenter = () => handlers.select?.(index);
  });
}

export function hidePauseOverlay() {
  document.querySelector(".pause-overlay")?.remove();
}

export function getChainBreakCauseLabel(cause) {
  const labels = {
    [CHAIN_BREAK_CAUSES.WRONG_KEY_IDLE]: "WRONG KEY",
    [CHAIN_BREAK_CAUSES.WRONG_KEY_AMBIGUOUS]: "AMBIGUOUS PREFIX FAILED",
    [CHAIN_BREAK_CAUSES.WRONG_KEY_LOCKED]: "TARGET MISTYPED",
    [CHAIN_BREAK_CAUSES.WORD_REACHED_CORE]: "WORD REACHED CORE",
    [CHAIN_BREAK_CAUSES.OTHER_MISS]: "CHAIN MISSED",
  };
  return labels[cause] || "CHAIN BROKEN";
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
        <div class="eyebrow">${result.chainBroken
    ? "CHAIN BROKEN"
    : result.isBoss
      ? `BOSS ${result.levelNumber} ${cleared ? "CLEARED" : "FAILED"}`
      : `Level ${String(result.levelNumber).padStart(2, "0")} // ${cleared ? "Core secured" : "Core breached"}`}</div>
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
        ${result.modifierIds?.includes(BLACKOUT_ID) ? `
          <div class="result-modifier blackout">
            MODIFIER: BLACKOUT<br>
            WORDS HIDDEN: ${result.wordsHidden}<br>
            HIDDEN WORDS COMPLETED: ${result.hiddenWordsCompleted}<br>
            WORDS MISSED AFTER FADE: ${result.wordsMissedAfterFade}
          </div>` : ""}
        ${result.modifierIds?.includes(CHAIN_ID) ? `
          <div class="result-modifier chain ${result.chainBroken ? "danger" : ""}">
            MODIFIER: CHAIN<br>
            ${result.chainBroken
    ? `BREAK CAUSE: ${getChainBreakCauseLabel(result.chainBreakCause)}<br>COMBO AT BREAK: ${result.chainComboAtBreak}`
    : "CHAIN MAINTAINED"}
          </div>` : ""}
        <div class="stats-grid">
          <div class="stat"><span class="micro-label">WPM</span><strong>${Math.round(result.wpm)}</strong></div>
          <div class="stat"><span class="micro-label">Accuracy</span><strong>${result.accuracy.toFixed(1)}%</strong></div>
          <div class="stat"><span class="micro-label">Max combo</span><strong>${result.maxCombo}</strong></div>
          <div class="stat"><span class="micro-label">Score</span><strong>${result.score.toLocaleString()}</strong></div>
          ${result.isBoss
    ? `<div class="stat"><span class="micro-label">Time remaining</span><strong>${result.timeRemaining.toFixed(1)}s</strong></div>
          <div class="stat"><span class="micro-label">Sequences</span><strong>${result.phrasesCompleted}/${result.phraseCount}</strong></div>`
    : result.modifierIds?.includes(CHAIN_ID)
      ? `<div class="stat"><span class="micro-label">Chain integrity</span><strong>${result.chainBroken ? "BROKEN" : "INTACT"}</strong></div>
          <div class="stat"><span class="micro-label">Level</span><strong>${result.levelNumber}</strong></div>`
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
  app().querySelectorAll(".results-panel .arcade-button").forEach((button, index) => {
    button.onmouseenter = () => {
      app().querySelectorAll(".results-panel .arcade-button").forEach(
        (item) => item.classList.remove("selected"),
      );
      button.classList.add("selected");
      handlers.select?.(index);
    };
  });
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

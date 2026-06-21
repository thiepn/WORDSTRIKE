import { calculateAccuracy, calculateWPM } from "./scoring.js";
import {
  generateBossLevel,
  generateLegacyLevel,
  generateLevel,
} from "./levelGenerator.js";
import { getCampaignDifficultyLevel } from "./campaignDifficulty.js";
import { generateBossEncounter } from "./bossGenerator.js";
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
import {
  DAILY_STARTING_INTEGRITY,
  DAILY_TOTAL_WORDS,
  DAILY_WORDS_PER_WAVE,
} from "./dailyConfig.js";
import { getDailyDiagnosticText } from "./dailyMode.js";

const app = () => document.querySelector("#app");
let speedTestLayoutObserver = null;

function disconnectSpeedTestLayoutObserver() {
  speedTestLayoutObserver?.disconnect?.();
  speedTestLayoutObserver = null;
}

export function clearSpeedTestLayout() {
  disconnectSpeedTestLayoutObserver();
}

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

export function renderDailyReady({ dateKey, record, developer = false } = {}, handlers = {}) {
  const best = record?.best;
  app().innerHTML = `
    <section class="screen daily-ready-screen">
      <div class="daily-ready-panel">
        <div class="eyebrow">${developer ? "Developer challenge preview" : "UTC daily challenge"}</div>
        <h1>DAILY STRIKE</h1>
        <p class="daily-date">${dateKey}</p>
        <div class="daily-ready-rules">
          <span>3 WAVES</span><span>${DAILY_TOTAL_WORDS} WORDS</span>
          <span>${DAILY_STARTING_INTEGRITY} CORE INTEGRITY</span>
        </div>
        <div class="daily-best">
          <span>TODAY'S BEST</span>
          <strong>${best ? best.score.toLocaleString() : "NO ATTEMPT"}</strong>
          <small>${record?.currentStreak || 0} DAY STREAK // BEST ${record?.bestStreak || 0}</small>
        </div>
        <button class="arcade-button selected" data-action="daily-start">PRESS ENTER TO BEGIN</button>
        <p class="footer-hint">ENTER BEGIN &nbsp;•&nbsp; ESC MODE SELECT</p>
      </div>
    </section>`;
  app().querySelector('[data-action="daily-start"]').onclick = handlers.start;
}

export function renderDailyShell(game, devMode = false) {
  app().innerHTML = `
    <section class="screen game-screen daily-screen">
      <header class="daily-hud">
        <div><strong>WAVE <span id="daily-wave">${game.wave}</span> / 3</strong>
          <span id="daily-progress">${game.resolvedWordCount} / ${DAILY_TOTAL_WORDS}</span></div>
        <div>SCORE <strong id="daily-score">0</strong>
          <span>COMBO <b id="daily-combo">0</b></span></div>
        <div>WPM <strong id="daily-wpm">0</strong>
          <span>ACC <b id="daily-accuracy">100%</b></span></div>
        <div>CORE <strong class="daily-integrity" id="daily-integrity">${"◆".repeat(game.integrity)}</strong></div>
      </header>
      ${devMode ? `<aside class="dev-runtime-panel" id="dev-runtime-panel">${getDailyDiagnosticText(game)}</aside>` : ""}
      <div class="play-area" id="play-area">
        <div class="core" aria-label="Central core"></div>
        <div class="daily-wave-banner" id="daily-wave-banner" hidden></div>
      </div>
    </section>`;
}

export function updateDailyHud(game) {
  const accuracy = calculateAccuracy(
    game.correctKeystrokes,
    game.totalKeystrokes,
    game.missedCharacters,
  );
  const wpm = calculateWPM(game.correctCharacters, game.elapsedMs);
  const values = {
    "#daily-wave": game.wave,
    "#daily-progress": `${game.resolvedWordCount} / ${DAILY_TOTAL_WORDS}`,
    "#daily-score": game.score.toLocaleString(),
    "#daily-combo": game.combo,
    "#daily-wpm": Math.round(wpm),
    "#daily-accuracy": `${accuracy.toFixed(0)}%`,
    "#daily-integrity": "◆".repeat(Math.max(0, game.integrity)),
  };
  for (const [selector, value] of Object.entries(values)) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }
  const banner = document.querySelector("#daily-wave-banner");
  if (banner) {
    banner.hidden = game.elapsedMs >= game.bannerUntilMs || !game.bannerText;
    banner.textContent = game.bannerText;
  }
  const diagnostics = document.querySelector("#dev-runtime-panel");
  if (diagnostics) diagnostics.textContent = getDailyDiagnosticText(game);
}

export function renderEndlessShell(game, devMode = false) {
  app().innerHTML = `
    <section class="screen game-screen endless-screen">
      <header class="endless-hud">
        <div><strong>STAGE <span id="endless-stage">${game.stage}</span></strong>
          <span id="endless-progress">${game.stageWordsCompleted} / ${ENDLESS_CONFIG.wordsPerStage}</span></div>
        <div>SCORE <strong id="endless-score">0</strong></div>
        <div>CORE <strong class="endless-integrity" id="endless-integrity">${"◇".repeat(game.integrity)}</strong></div>
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
            tabindex="-1" ${attributes} ${disabled ? "disabled" : ""}>${label}</button>`;
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
  disconnectSpeedTestLayoutObserver();
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
        <p class="speed-test-hint">TAB — RETRY &nbsp;•&nbsp; ESC — PAUSE</p>
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
  const viewport = document.querySelector("#speed-test-word-viewport");
  if (viewport && globalThis.ResizeObserver) {
    speedTestLayoutObserver = new ResizeObserver(() => {
      state.layoutDirty = true;
      scheduleSpeedTestLayout(state);
    });
    speedTestLayoutObserver.observe(viewport);
  }
  state.layoutDirty = true;
  scheduleSpeedTestLayout(state);
}

export function measureSpeedTestLayout(state) {
  const viewport = document.querySelector("#speed-test-word-viewport");
  const flow = document.querySelector("#speed-test-word-flow");
  if (!state || !viewport || !flow) return null;
  const words = [...(flow.querySelectorAll?.("[data-speed-word-index]") || [])];
  const lineTops = [];
  const wordLines = new Map();
  for (const word of words) {
    const top = Number(word.offsetTop) || 0;
    let lineIndex = lineTops.findIndex((lineTop) => Math.abs(lineTop - top) < 1);
    if (lineIndex < 0) {
      lineIndex = lineTops.length;
      lineTops.push(top);
    }
    wordLines.set(Number(word.dataset.speedWordIndex), lineIndex);
  }
  const currentLineIndex = wordLines.get(state.currentWordIndex) ?? 0;
  const topLineIndex = currentLineIndex >= 2 ? currentLineIndex - 1 : 0;
  const desiredTranslation = topLineIndex > 0 ? lineTops[topLineIndex] : 0;
  const maximumTranslation = Math.max(
    0,
    (Number(flow.scrollHeight) || 0) - (Number(viewport.clientHeight) || 0),
  );
  state.previousLineIndex = state.currentLineIndex;
  state.currentLineIndex = currentLineIndex;
  state.lineMap = words.map((word) => wordLines.get(Number(word.dataset.speedWordIndex)) ?? 0);
  state.verticalTranslation = Math.max(0, Math.min(desiredTranslation, maximumTranslation));
  state.lastLayoutWordIndex = state.currentWordIndex;
  state.layoutDirty = false;
  viewport.scrollTop = 0;
  flow.style.transform = `translateY(-${state.verticalTranslation}px)`;
  return { currentLineIndex, lineTops, verticalTranslation: state.verticalTranslation };
}

export function scheduleSpeedTestLayout(state) {
  if (!state || state.layoutFrameId != null) return;
  const schedule = globalThis.requestAnimationFrame || ((callback) => callback());
  state.layoutFrameId = schedule(() => {
    state.layoutFrameId = null;
    measureSpeedTestLayout(state);
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
      state.layoutDirty = true;
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
    if (
      state.lineMap[state.currentWordIndex] == null ||
      state.lastLayoutWordIndex !== state.currentWordIndex
    ) state.layoutDirty = true;
  }
  if (state.layoutDirty) scheduleSpeedTestLayout(state);
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

function renderDevPanel(selectedLevel, bossWordBank, developerSeed) {
  const isBoss = selectedLevel % 10 === 0;
  const config = isBoss ? generateBossLevel(selectedLevel) : generateLevel(selectedLevel);
  const legacyConfig = isBoss ? null : generateLegacyLevel(selectedLevel);
  const previewSeed = developerSeed || selectedLevel * 104729;
  const encounter = isBoss
    ? generateBossEncounter(bossWordBank, selectedLevel, previewSeed)
    : null;
  const fields = isBoss
    ? [
      ["actualLevel", selectedLevel],
      ["bossLevel", true],
      ["virtualDifficultyLevel", `${getCampaignDifficultyLevel(selectedLevel).toFixed(2)} (ignored)`],
      ["bossIndex", config.bossIndex],
      ["segmentCount", config.segmentCount],
      ["wordsPerSegment", config.wordsPerSegment],
      ["totalWordCount", config.totalWordCount],
      ["attemptSeed", previewSeed],
      ["tierPatterns", encounter.tierPatterns.join(" | ")],
      ["wordSources", encounter.wordSources.join(", ")],
      ["shortCount", encounter.tierCounts.short],
      ["mediumCount", encounter.tierCounts.medium],
      ["longCount", encounter.tierCounts.long],
      ["veryLongCount", encounter.tierCounts["very-long"]],
      ["targetCharacters", config.targetCharacters],
      ["targetRange", `${config.minimumCharacters}-${config.maximumCharacters}`],
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
      ["actualLevel", selectedLevel],
      ["bossLevel", config.isBoss],
      ["virtualDifficultyLevel", config.virtualDifficultyLevel.toFixed(2)],
      ["wordCount", config.wordCount],
      ["newWordLengthRange", `${config.minWordLength}-${config.maxWordLength}`],
      ["targetAverageWordLength", config.targetAverageWordLength.toFixed(2)],
      ["newSpawnIntervalMs", config.spawnIntervalMs.toFixed(2)],
      ["newWordSpeedPxPerSec", config.wordSpeedPxPerSec.toFixed(2)],
      ["newActiveWordCap", config.maxSimultaneousWords],
      ["newVocabularyTier", config.wordTier],
      ["legacyWordLengthRange", `${legacyConfig.minWordLength}-${legacyConfig.maxWordLength}`],
      ["legacySpawnIntervalMs", legacyConfig.spawnIntervalMs.toFixed(2)],
      ["legacyWordSpeedPxPerSec", legacyConfig.wordSpeedPxPerSec.toFixed(2)],
      ["legacyActiveWordCap", legacyConfig.maxSimultaneousWords],
      ["legacyVocabularyTier", legacyConfig.wordTier],
      ["lives", config.lives],
      ["targetWPM", config.targetWPM],
      ["world", config.world],
      ["attemptSeed", previewSeed],
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
  developerSeed,
  handlers,
) {
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
        ${boss ? '<span class="boss-mark">◆ BOSS</span>' : ""}
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
    ? renderDevPanel(selectedLevel, bossWordBank, developerSeed)
    : ""}
      <div class="level-detail">
        <span>Type every incoming word before it reaches the core.</span>
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
  attempt = {},
) {
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
      ${devMode ? `
        <aside class="dev-runtime-panel" id="dev-runtime-panel">
          actual=${levelNumber} // boss=${config.isBoss === true}
          // virtual=${Number(config.virtualDifficultyLevel).toFixed(2)}
          // words=${config.wordCount} // speed=${Number(config.wordSpeedPxPerSec).toFixed(2)}px/s
          // spawn=${Number(config.spawnIntervalMs).toFixed(2)}ms
          // cap=${config.maxSimultaneousWords}
          // range=${config.minWordLength}-${config.maxWordLength}
          // avg=${Number(config.targetAverageWordLength).toFixed(2)}
          // tier=${config.wordTier}
          // seed=${attempt.attemptSeed} // selected=${attempt.selectedWords?.join(",")}
          // queue=${attempt.spawnQueue?.join(",")} // ${getSessionDiagnosticText()}
        </aside>` : ""}
      <div class="play-area" id="play-area">
        <div class="core" aria-label="Central core"></div>
      </div>
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
  const devRuntime = document.querySelector("#dev-runtime-panel");
  if (devRuntime) {
    const state = game.targetingState;
    const candidateWords = game.words.filter((word) => state.candidateIds.includes(word.id));
    devRuntime.textContent = [
      `actual=${game.levelNumber}`,
      `boss=${game.config.isBoss === true}`,
      `virtual=${Number(game.config.virtualDifficultyLevel).toFixed(2)}`,
      `wordCount=${game.config.wordCount}`,
      `speed=${Number(game.config.wordSpeedPxPerSec).toFixed(2)}px/s`,
      `spawn=${Number(game.config.spawnIntervalMs).toFixed(2)}ms`,
      `cap=${game.config.maxSimultaneousWords}`,
      `range=${game.config.minWordLength}-${game.config.maxWordLength}`,
      `targetAvg=${Number(game.config.targetAverageWordLength).toFixed(2)}`,
      `tier=${game.config.wordTier}`,
      `seed=${game.attemptSeed}`,
      `selected=${game.selectedWords.join(",")}`,
      `queue=${game.wordQueue.join(",")}`,
      `targeting=${state.mode}`,
      `prefixLength=${state.prefix.length}`,
      `candidates=${state.candidateIds.length}`,
      `candidateIds=${state.candidateIds.join(",") || "none"}`,
      `candidateTexts=${candidateWords.map((word) => word.text).join(",") || "none"}`,
      `activeTarget=${state.activeTargetId ?? "none"}`,
      `offsets=${game.words.map((word) => `${word.id}:${(word.separationX || 0).toFixed(1)},${(word.separationY || 0).toFixed(1)}`).join("|") || "none"}`,
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
    `actual=${config.level}`,
    "boss=true",
    `virtual=${getCampaignDifficultyLevel(config.level).toFixed(2)} (ignored)`,
    `seed=${attempt.attemptSeed}`,
    `vocabulary=${config.vocabularySource || "typing-test+curated-long"}`,
    `profile=${config.segmentCount}x${config.wordsPerSegment}`,
    `words=${config.totalWordCount}`,
    `sequence=${attempt.sequenceIndex ?? 1}`,
    `segmentWords=${config.wordsPerSegment}`,
    `tierPatterns=${(encounter.tierPatterns || config.tierPatterns || []).map((pattern) => pattern.join(",")).join(" | ")}`,
    `wordSources=${(encounter.wordSources || config.wordSources || []).join(",")}`,
    `short=${(encounter.tierCounts || config.tierCounts || {}).short ?? 0}`,
    `medium=${(encounter.tierCounts || config.tierCounts || {}).medium ?? 0}`,
    `long=${(encounter.tierCounts || config.tierCounts || {}).long ?? 0}`,
    `veryLong=${(encounter.tierCounts || config.tierCounts || {})["very-long"] ?? 0}`,
    `targetCharacters=${config.targetCharacters}`,
    `selectedMin=${encounter.metrics.minimumSelectedWordLength}`,
    `selectedAvg=${encounter.metrics.averageSelectedWordLength.toFixed(2)}`,
    `selectedLongest=${encounter.metrics.longestSelectedWord}`,
    `characters=${encounter.metrics.totalRequiredCharacters}`,
    `targetRange=${config.minimumCharacters}-${config.maximumCharacters}`,
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
          <span>MIXED-LENGTH WORD SEQUENCE</span>
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
      sequenceIndex: game.displayedSequenceNumber,
      encounter: {
        generationAttempt: game.config.generationAttempt,
        fallbackUsed: game.config.fallbackUsed,
        segments: game.phrases,
        words: game.config.words,
        tierPatterns: game.config.tierPatterns,
        tierCounts: game.config.tierCounts,
        wordSources: game.config.wordSources,
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

export function showDailyPauseOverlay(selectedIndex, handlers) {
  document.querySelector(".pause-overlay")?.remove();
  const actions = [
    ["RESUME", "resume"],
    ["RETRY TODAY", "retry"],
    ["MODE SELECT", "modes"],
    ["MAIN MENU", "title"],
  ];
  const overlay = document.createElement("div");
  overlay.className = "pause-overlay";
  overlay.innerHTML = `
    <div class="pause-panel">
      <div class="eyebrow">Daily Strike suspended</div>
      <h2>PAUSED</h2>
      <div class="menu-list">${actions.map(([label, action], index) => (
    menuButton(label, action, index === selectedIndex)
  )).join("")}</div>
      <p class="footer-hint">ESC RESUME</p>
    </div>`;
  document.querySelector(".daily-screen")?.append(overlay);
  for (const [, action] of actions) {
    overlay.querySelector(`[data-action="${action}"]`).onclick = handlers[action];
  }
  overlay.querySelectorAll(".arcade-button").forEach((button, index) => {
    button.onmouseenter = () => handlers.select?.(index);
  });
}

export function showSpeedTestPauseOverlay(selectedIndex, handlers) {
  document.querySelector(".pause-overlay")?.remove();
  document.querySelector(".speed-test-screen")?.classList.add("paused");
  const actions = [
    ["RESUME", "resume"],
    ["RETRY", "retry"],
    ["QUIT TEST", "quit"],
    ["MAIN MENU", "title"],
  ];
  const overlay = document.createElement("div");
  overlay.className = "pause-overlay";
  overlay.innerHTML = `
    <div class="pause-panel">
      <div class="eyebrow">Typing Test suspended</div>
      <h2>PAUSED</h2>
      <div class="menu-list">${actions.map(([label, action], index) => (
    menuButton(label, action, index === selectedIndex)
  )).join("")}</div>
      <p class="footer-hint">ESC RESUME</p>
    </div>`;
  document.querySelector(".speed-test-screen")?.append(overlay);
  for (const [, action] of actions) {
    overlay.querySelector(`[data-action="${action}"]`).onclick = handlers[action];
  }
  overlay.querySelectorAll(".arcade-button").forEach((button, index) => {
    button.onmouseenter = () => handlers.select?.(index);
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

export function renderDailyResults(result, recordFlags, selectedIndex, handlers) {
  const data = result.modeData;
  const actions = [
    ["RETRY SAME CHALLENGE", "retry"],
    ["MODE SELECT", "modes"],
    ["MAIN MENU", "title"],
  ];
  app().innerHTML = `
    <section class="screen daily-results-screen">
      <div class="daily-results-panel">
        <div class="eyebrow">${data.dateKey} // DAILY STRIKE</div>
        <h1>${result.success ? "CHALLENGE CLEARED" : "STRIKE FAILED"}</h1>
        ${recordFlags?.newBest ? '<div class="daily-record">NEW DAILY BEST</div>' : ""}
        <div class="daily-result-headline">
          <div><span>Score</span><strong>${result.score.toLocaleString()}</strong></div>
          <div><span>Words</span><strong>${data.wordsCompleted} / ${DAILY_TOTAL_WORDS}</strong></div>
          <div><span>Time</span><strong>${(result.activeDurationMs / 1000).toFixed(1)}s</strong></div>
        </div>
        <div class="daily-result-details">
          <div><span>Accuracy</span><strong>${result.accuracy.toFixed(1)}%</strong></div>
          <div><span>Average WPM</span><strong>${result.wpm.toFixed(1)}</strong></div>
          <div><span>Integrity</span><strong>${data.integrityRemaining} / ${DAILY_STARTING_INTEGRITY}</strong></div>
          <div><span>Maximum combo</span><strong>${result.combo.maximum}</strong></div>
          <div><span>Word points</span><strong>${data.wordPoints}</strong></div>
          <div><span>Completion bonus</span><strong>${data.completionBonus}</strong></div>
          <div><span>Integrity bonus</span><strong>${data.integrityBonus}</strong></div>
          <div><span>Accuracy bonus</span><strong>${data.accuracyBonus}</strong></div>
          <div><span>Time bonus</span><strong>${data.timeBonus}</strong></div>
          <div><span>Resolved</span><strong>${data.wordsResolved} / ${DAILY_TOTAL_WORDS}</strong></div>
        </div>
        <div class="menu-list">${actions.map(([label, action], index) => (
    menuButton(label, action, index === selectedIndex)
  )).join("")}</div>
      </div>
    </section>`;
  for (const [, action] of actions) {
    app().querySelector(`[data-action="${action}"]`).onclick = handlers[action];
  }
  app().querySelectorAll(".daily-results-panel .arcade-button").forEach((button, index) => {
    button.onmouseenter = () => handlers.select?.(index);
  });
}

export function hidePauseOverlay() {
  document.querySelector(".pause-overlay")?.remove();
  document.querySelector(".speed-test-screen")?.classList.remove("paused");
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
        <div class="eyebrow">${result.isBoss
      ? `BOSS ${result.levelNumber} ${cleared ? "CLEARED" : "FAILED"}`
      : `Level ${String(result.levelNumber).padStart(2, "0")} // ${cleared ? "Core secured" : "Core breached"}`}</div>
        <div class="grade ${cleared ? `grade-${result.grade.toLowerCase()}` : "fail"}">${result.grade}</div>
        <div class="stats-grid">
          <div class="stat"><span class="micro-label">WPM</span><strong>${Math.round(result.wpm)}</strong></div>
          <div class="stat"><span class="micro-label">Accuracy</span><strong>${result.accuracy.toFixed(1)}%</strong></div>
          <div class="stat"><span class="micro-label">Max combo</span><strong>${result.maxCombo}</strong></div>
          <div class="stat"><span class="micro-label">Score</span><strong>${result.score.toLocaleString()}</strong></div>
          ${result.isBoss
    ? `<div class="stat"><span class="micro-label">Time remaining</span><strong>${result.timeRemaining.toFixed(1)}s</strong></div>
          <div class="stat"><span class="micro-label">Sequences</span><strong>${result.phrasesCompleted}/${result.phraseCount}</strong></div>`
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

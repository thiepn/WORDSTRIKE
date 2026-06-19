import { appState, Screens } from "./state.js";
import {
  clearWordElements,
  clearBossPhrase,
  createWordElement,
  flashDamage,
  removeWordElement,
  updateWordElement,
  flashQuickFingersBurst,
} from "./renderer.js";
import {
  BLACKOUT_ID,
  getBlackoutVisibility,
  getEffectiveSpawnInterval,
  getQuickFingersPhase,
  NO_BACKSPACE_ID,
  QUICK_FINGERS_ID,
} from "./modifiers.js";

let animationFrameId = null;
let callbacks = {};
const MODIFIER_BRIEFING_MS = 2000;

function createModifierRuntime(config) {
  if (!config.modifiers?.includes(QUICK_FINGERS_ID)) return null;
  return {
    quickFingers: {
      active: false,
      phase: "waiting",
      remainingMs: 6000,
      burstCount: 0,
      effectiveSpawnIntervalMs: config.spawnIntervalMs,
    },
  };
}

export function createGameState(levelNumber, config, words) {
  const hasModifier = config.modifiers?.some((id) => (
    id === QUICK_FINGERS_ID || id === NO_BACKSPACE_ID || id === BLACKOUT_ID
  ));
  const hasBlackout = config.modifiers?.includes(BLACKOUT_ID);
  return {
    mode: "normal",
    levelNumber,
    config,
    wordQueue: [...words],
    words: [],
    spawnedCount: 0,
    nextWordId: 1,
    lastSpawnAt: -config.spawnIntervalMs,
    activeTargetId: null,
    lives: config.lives,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    missedCharacters: 0,
    correctCharacters: 0,
    elapsedMs: 0,
    phase: hasModifier ? "MODIFIER_BRIEFING" : "ACTIVE",
    briefingElapsedMs: 0,
    modifierRuntime: createModifierRuntime(config),
    abandonedWordCount: 0,
    abandonedCharacters: 0,
    ...(hasBlackout ? {
      blackoutStats: {
        wordsHidden: 0,
        hiddenWordsCompleted: 0,
        wordsMissedAfterFade: 0,
      },
    } : {}),
    coreX: 0,
    coreY: 0,
    lastTimestamp: null,
    ended: false,
  };
}

export function registerMissedWord(game, word) {
  if (word.missedCharactersRecorded) return 0;
  word.missedCharactersRecorded = true;
  const remainingCharacters = Math.max(0, word.text.length - word.typedIndex);
  game.missedCharacters += remainingCharacters;
  return remainingCharacters;
}

function getDimensions(game) {
  const area = document.querySelector("#play-area");
  if (!area) return null;
  const width = area.clientWidth;
  const height = area.clientHeight;
  game.coreX = width / 2;
  game.coreY = height / 2;
  return { width, height };
}

function spawnWord(game, dimensions) {
  const { width, height } = dimensions;
  const edge = Math.floor(Math.random() * 4);
  const margin = 0;
  let x;
  let y;
  if (edge === 0) {
    x = Math.random() * width;
    y = margin;
  } else if (edge === 1) {
    x = width - margin;
    y = Math.random() * height;
  } else if (edge === 2) {
    x = Math.random() * width;
    y = height - margin;
  } else {
    x = margin;
    y = Math.random() * height;
  }
  const dx = game.coreX - x;
  const dy = game.coreY - y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const speed = game.config.wordSpeedPxPerSec;
  const hasBlackout = game.config.modifiers?.includes(BLACKOUT_ID);
  const word = {
    id: game.nextWordId,
    text: game.wordQueue[game.spawnedCount],
    typedIndex: 0,
    x,
    y,
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    createdAt: game.elapsedMs,
    startedAt: null,
    abandoned: false,
    abandonedAt: null,
    missedCharactersRecorded: false,
    coreArrivalProcessed: false,
    ...(hasBlackout ? {
      spawnedAtActiveMs: game.elapsedMs,
      blackoutPhase: "visible",
      blackoutTextOpacity: 1,
      blackoutHidden: false,
      blackoutHiddenCounted: false,
      blackoutMissedAfterFadeCounted: false,
    } : {}),
  };
  game.nextWordId += 1;
  game.spawnedCount += 1;
  game.words.push(word);
  createWordElement(word);
}

export function processWordCoreArrival(game, word) {
  if (word.coreArrivalProcessed) return false;
  word.coreArrivalProcessed = true;
  if (
    game.config.modifiers?.includes(BLACKOUT_ID) &&
    word.blackoutPhase !== "visible" &&
    !word.blackoutMissedAfterFadeCounted
  ) {
    word.blackoutMissedAfterFadeCounted = true;
    game.blackoutStats.wordsMissedAfterFade += 1;
  }
  registerMissedWord(game, word);
  game.words = game.words.filter((candidate) => candidate.id !== word.id);
  if (game.activeTargetId === word.id) game.activeTargetId = null;
  game.lives -= 1;
  game.combo = 0;
  removeWordElement(word);
  flashDamage(appState.save.settings.screenShake);
  callbacks.onHudUpdate?.(game);
  return true;
}

export function updateBlackoutWordState(game, word) {
  if (!game.config.modifiers?.includes(BLACKOUT_ID)) return word;
  const visibility = getBlackoutVisibility(
    game.elapsedMs - word.spawnedAtActiveMs,
  );
  word.blackoutPhase = visibility.phase;
  word.blackoutTextOpacity = visibility.textOpacity;
  word.blackoutHidden = visibility.hidden;
  if (visibility.hidden && !word.blackoutHiddenCounted) {
    word.blackoutHiddenCounted = true;
    game.blackoutStats.wordsHidden += 1;
  }
  return word;
}

function finish(game, success) {
  if (game.ended) return;
  game.ended = true;
  stopGameLoop();
  callbacks.onEnd?.(game, success);
}

function tick(timestamp) {
  const game = appState.game;
  if (!game || game.ended) return;
  if (appState.screen !== Screens.PLAYING) {
    game.lastTimestamp = timestamp;
    animationFrameId = requestAnimationFrame(tick);
    return;
  }

  if (game.lastTimestamp === null) game.lastTimestamp = timestamp;
  const deltaMs = Math.min(timestamp - game.lastTimestamp, 100);
  game.lastTimestamp = timestamp;

  if (game.phase === "MODIFIER_BRIEFING") {
    game.briefingElapsedMs += deltaMs;
    if (game.briefingElapsedMs >= MODIFIER_BRIEFING_MS) {
      game.phase = "ACTIVE";
      game.lastSpawnAt = -game.config.spawnIntervalMs;
    }
    callbacks.onHudUpdate?.(game);
    animationFrameId = requestAnimationFrame(tick);
    return;
  }

  game.elapsedMs += deltaMs;
  const quickRuntime = game.modifierRuntime?.quickFingers;
  if (quickRuntime) {
    if (game.spawnedCount >= game.config.wordCount) {
      Object.assign(quickRuntime, {
        active: false,
        phase: "complete",
        remainingMs: 0,
        effectiveSpawnIntervalMs: game.config.spawnIntervalMs,
      });
    } else {
      const previousBurstCount = quickRuntime.burstCount;
      const phase = getQuickFingersPhase(game.elapsedMs);
      Object.assign(quickRuntime, phase, {
        effectiveSpawnIntervalMs: getEffectiveSpawnInterval(
          game.config.spawnIntervalMs,
          phase.active,
        ),
      });
      if (phase.active && phase.burstCount > previousBurstCount) {
        flashQuickFingersBurst();
      }
    }
  }
  const dimensions = getDimensions(game);
  if (!dimensions) return;
  const effectiveSpawnIntervalMs = quickRuntime?.effectiveSpawnIntervalMs
    ?? game.config.spawnIntervalMs;

  if (
    game.spawnedCount < game.config.wordCount &&
    game.words.length < game.config.maxSimultaneousWords &&
    game.elapsedMs - game.lastSpawnAt >= effectiveSpawnIntervalMs
  ) {
    spawnWord(game, dimensions);
    game.lastSpawnAt = game.elapsedMs;
  }

  const deltaSeconds = deltaMs / 1000;
  for (const word of [...game.words]) {
    if (game.blackoutStats) updateBlackoutWordState(game, word);
    word.x += word.vx * deltaSeconds;
    word.y += word.vy * deltaSeconds;
    if (Math.hypot(word.x - game.coreX, word.y - game.coreY) <= 42) {
      processWordCoreArrival(game, word);
      if (game.lives <= 0) {
        finish(game, false);
        return;
      }
    } else {
      updateWordElement(word, word.id === game.activeTargetId);
    }
  }

  callbacks.onHudUpdate?.(game);
  if (game.spawnedCount >= game.config.wordCount && game.words.length === 0) {
    finish(game, true);
    return;
  }
  animationFrameId = requestAnimationFrame(tick);
}

export function startLevelLoop(levelNumber, config, words, nextCallbacks = {}) {
  stopGameLoop();
  clearBossPhrase();
  clearWordElements();
  callbacks = nextCallbacks;
  appState.game = createGameState(levelNumber, config, words);
  animationFrameId = requestAnimationFrame(tick);
  return appState.game;
}

export function stopGameLoop() {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  if (appState.game?.mode === "normal") appState.game.lastTimestamp = null;
}

export function resumeGameLoop() {
  if (animationFrameId === null && appState.game && !appState.game.ended) {
    appState.game.lastTimestamp = null;
    animationFrameId = requestAnimationFrame(tick);
  }
}

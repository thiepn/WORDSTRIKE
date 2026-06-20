import { appState, Screens } from "./state.js";
import {
  clearWordElements,
  clearBossPhrase,
  createWordElement,
  flashChainBreak,
  flashDamage,
  removeWordElement,
  updateWordElement,
  flashQuickFingersBurst,
} from "./renderer.js";
import {
  BLACKOUT_ID,
  CHAIN_BREAK_CAUSES,
  CHAIN_FAILURE_REASON,
  CHAIN_ID,
  getBlackoutVisibility,
  getEffectiveSpawnInterval,
  getQuickFingersPhase,
  hasChainModifier,
  markChainBroken,
  NO_BACKSPACE_ID,
  QUICK_FINGERS_ID,
} from "./modifiers.js";
import { createSeededRandom, mixSeed } from "./random.js";
import { reconcileTargetingState, resetTargetingState } from "./input.js";

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

export function createGameState(levelNumber, config, words, attempt = {}) {
  const hasModifier = config.modifiers?.some((id) => (
    id === QUICK_FINGERS_ID ||
    id === NO_BACKSPACE_ID ||
    id === BLACKOUT_ID ||
    id === CHAIN_ID
  ));
  const hasBlackout = config.modifiers?.includes(BLACKOUT_ID);
  const hasChain = hasChainModifier(config);
  return {
    mode: "normal",
    levelNumber,
    config,
    wordQueue: [...words],
    selectedWords: [...(attempt.selectedWords || words)],
    attemptSeed: attempt.attemptSeed ?? null,
    random: createSeededRandom(mixSeed(attempt.attemptSeed ?? levelNumber, 0x5f3759df)),
    words: [],
    spawnedCount: 0,
    nextWordId: 1,
    lastSpawnAt: -config.spawnIntervalMs,
    activeTargetId: null,
    targetingState: {
      mode: "idle",
      prefix: "",
      candidateIds: [],
      activeTargetId: null,
      startedAtActiveMs: null,
    },
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
    ...(hasChain ? {
      chainRuntime: {
        active: true,
        broken: false,
        breakCause: null,
        brokenAtActiveMs: null,
        comboAtBreak: 0,
        failedWordId: null,
      },
      failureReason: null,
    } : {}),
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
  const edge = Math.floor(game.random() * 4);
  const margin = 32;
  let x = 0;
  let y = 0;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (edge === 0) {
      x = game.random() * width;
      y = margin;
    } else if (edge === 1) {
      x = width - margin;
      y = game.random() * height;
    } else if (edge === 2) {
      x = game.random() * width;
      y = height - margin;
    } else {
      x = margin;
      y = game.random() * height;
    }
    const clear = game.words.every((word) => Math.hypot(word.x - x, word.y - y) >= 72);
    if (clear) break;
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
    separationX: 0,
    separationY: 0,
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
  if (game.ended || word.coreArrivalProcessed) return false;
  word.coreArrivalProcessed = true;
  if (hasChainModifier(game.config)) {
    registerMissedWord(game, word);
    game.words = game.words.filter((candidate) => candidate.id !== word.id);
    removeWordElement(word);
    if (markChainBroken(game, CHAIN_BREAK_CAUSES.WORD_REACHED_CORE, word.id)) {
      finalizeChainFailure(game);
    }
    return true;
  }
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
  reconcileTargetingState(game);
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

function wordVisualSize(word) {
  if (word.blackoutHidden) return { width: 34, height: 34 };
  return {
    width: Math.min(220, Math.max(50, word.text.length * 17 + 18)),
    height: 38,
  };
}

function wordMobility(game, word) {
  if (game.targetingState.activeTargetId === word.id) return 0.25;
  if (game.targetingState.candidateIds.includes(word.id)) return 0.65;
  if (word.abandoned) return 1.2;
  return 1;
}

export function updateWordSeparation(game, dimensions, deltaMs = 16) {
  const targets = new Map(game.words.map((word) => [word.id, { x: 0, y: 0 }]));
  const gap = 8;
  for (let firstIndex = 0; firstIndex < game.words.length; firstIndex += 1) {
    const first = game.words[firstIndex];
    const firstSize = wordVisualSize(first);
    for (let secondIndex = firstIndex + 1; secondIndex < game.words.length; secondIndex += 1) {
      const second = game.words[secondIndex];
      const secondSize = wordVisualSize(second);
      const dx = (second.x + (second.separationX || 0))
        - (first.x + (first.separationX || 0));
      const dy = (second.y + (second.separationY || 0))
        - (first.y + (first.separationY || 0));
      const overlapX = (firstSize.width + secondSize.width) / 2 + gap - Math.abs(dx);
      const overlapY = (firstSize.height + secondSize.height) / 2 + gap - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      const firstMobility = wordMobility(game, first);
      const secondMobility = wordMobility(game, second);
      const mobilityTotal = firstMobility + secondMobility;
      const firstShare = firstMobility / mobilityTotal;
      const secondShare = secondMobility / mobilityTotal;
      const firstTarget = targets.get(first.id);
      const secondTarget = targets.get(second.id);
      if (overlapX < overlapY) {
        const direction = dx >= 0 ? 1 : -1;
        firstTarget.x -= direction * overlapX * firstShare;
        secondTarget.x += direction * overlapX * secondShare;
      } else {
        const direction = dy >= 0 ? 1 : -1;
        firstTarget.y -= direction * overlapY * firstShare;
        secondTarget.y += direction * overlapY * secondShare;
      }
    }
  }

  const smoothing = Math.min(1, Math.max(0, deltaMs) / 80);
  const cap = 30;
  for (const word of game.words) {
    const target = targets.get(word.id);
    const size = wordVisualSize(word);
    let nextX = (word.separationX || 0) + (target.x - (word.separationX || 0)) * smoothing;
    let nextY = (word.separationY || 0) + (target.y - (word.separationY || 0)) * smoothing;
    if (dimensions) {
      nextX = Math.max(size.width / 2 - word.x, Math.min(
        dimensions.width - size.width / 2 - word.x,
        nextX,
      ));
      nextY = Math.max(size.height / 2 - word.y, Math.min(
        dimensions.height - size.height / 2 - word.y,
        nextY,
      ));
    }
    nextX = Math.max(-cap, Math.min(cap, nextX));
    nextY = Math.max(-cap, Math.min(cap, nextY));
    word.separationX = nextX;
    word.separationY = nextY;
  }
}

function targetingVisualState(game, word) {
  const state = game.targetingState;
  return {
    active: state.mode === "locked" && state.activeTargetId === word.id,
    candidate: state.mode === "ambiguous" && state.candidateIds.includes(word.id),
    prefixLength: state.prefix.length,
  };
}

function finish(game, success) {
  if (game.ended) return;
  game.ended = true;
  stopGameLoop();
  callbacks.onEnd?.(game, success);
}

export function finalizeChainFailure(game) {
  if (
    !game ||
    game.ended ||
    game.failureReason !== CHAIN_FAILURE_REASON ||
    !game.chainRuntime?.broken
  ) {
    return false;
  }
  resetTargetingState(game);
  flashChainBreak();
  callbacks.onHudUpdate?.(game);
  finish(game, false);
  return true;
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
      if (game.ended || game.failureReason === CHAIN_FAILURE_REASON) return;
      if (game.lives <= 0) {
        finish(game, false);
        return;
      }
    }
  }
  updateWordSeparation(game, dimensions, deltaMs);
  for (const word of game.words) {
    const targeting = targetingVisualState(game, word);
    updateWordElement(word, targeting.active, targeting);
  }

  callbacks.onHudUpdate?.(game);
  if (
    !game.failureReason &&
    game.spawnedCount >= game.config.wordCount &&
    game.words.length === 0
  ) {
    finish(game, true);
    return;
  }
  animationFrameId = requestAnimationFrame(tick);
}

export function startLevelLoop(
  levelNumber,
  config,
  words,
  nextCallbacks = {},
  attempt = {},
) {
  stopGameLoop();
  clearBossPhrase();
  clearWordElements();
  callbacks = nextCallbacks;
  appState.game = createGameState(levelNumber, config, words, attempt);
  animationFrameId = requestAnimationFrame(tick);
  return appState.game;
}

export function stopGameLoop() {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  clearWordElements();
  if (appState.game?.mode === "normal") appState.game.lastTimestamp = null;
}

export function resumeGameLoop() {
  if (animationFrameId === null && appState.game && !appState.game.ended) {
    appState.game.lastTimestamp = null;
    animationFrameId = requestAnimationFrame(tick);
  }
}

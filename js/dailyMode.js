import { appState, Screens } from "./state.js";
import {
  DAILY_CHALLENGE_VERSION,
  DAILY_COLLISION_IMMUNITY_MS,
  DAILY_SPAWN_PAUSE_MS,
  DAILY_STARTING_INTEGRITY,
  DAILY_TOTAL_WORDS,
  DAILY_WAVE_BANNER_MS,
  DAILY_WORDS_PER_WAVE,
  getDailyWaveProfile,
  isStandardDailyConfiguration,
} from "./dailyConfig.js";
import { getUtcDateKey } from "./dailyDate.js";
import { calculateDailyFinalScore, calculateDailyWordPoints } from "./dailyScoring.js";
import { handleGameplayKey, reconcileTargetingState, resetTargetingState } from "./input.js";
import {
  clearWordElements,
  createWordElement,
  flashDamage,
  removeWordElement,
  updateWordElement,
} from "./renderer.js";
import { updateWordSeparation } from "./gameLoop.js";
import {
  beginSession,
  completeSession,
  getCurrentSession,
  markSessionActive,
  markSessionResultPersisted,
  SESSION_STATES,
  setSessionState,
} from "./sessionManager.js";
import { buildSessionResult } from "./sessionResult.js";
import { calculateSessionAccuracy, calculateSessionWpm } from "./sessionMetrics.js";
import { getDailyRecord, recordCompletedSession } from "./modeStorage.js";
import { MODE_IDS } from "./modes.js";

let currentDaily = null;
let animationFrameId = null;
let callbacks = {};

function targetingState() {
  return {
    mode: "idle",
    prefix: "",
    candidateIds: [],
    activeTargetId: null,
    startedAtActiveMs: null,
  };
}

export function createDailyRuntime({
  plan,
  developerMode = false,
  dateOverride = false,
  currentDateKey = getUtcDateKey(),
} = {}) {
  if (!plan?.entries || plan.entries.length !== DAILY_TOTAL_WORDS) return null;
  const config = {
    dateKey: plan.dateKey,
    challengeVersion: plan.challengeVersion,
    totalWords: plan.totalWords,
    developerMode,
    dateOverride,
  };
  return {
    mode: "daily",
    config,
    plan,
    attemptSeed: plan.seed,
    developerMode,
    recordEligible: isStandardDailyConfiguration(config, currentDateKey),
    wave: 1,
    integrity: DAILY_STARTING_INTEGRITY,
    words: [],
    nextWordId: 1,
    spawnedWordCount: 0,
    resolvedWordCount: 0,
    completedWordCount: 0,
    missedWordCount: 0,
    lastSpawnAtMs: -getDailyWaveProfile(1).spawnIntervalMs,
    spawnBlockedUntilMs: 0,
    bannerUntilMs: 0,
    bannerText: "",
    elapsedMs: 0,
    lastTimestamp: null,
    immunityUntilMs: 0,
    coreBreaches: 0,
    coreHits: 0,
    score: 0,
    accumulatedWordPoints: 0,
    combo: 0,
    maxCombo: 0,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    missedCharacters: 0,
    correctCharacters: 0,
    activeTargetId: null,
    targetingState: targetingState(),
    coreX: 0,
    coreY: 0,
    phase: "ACTIVE",
    ended: false,
    completionNotified: false,
    result: null,
    recordFlags: null,
  };
}

function dimensions(game) {
  const area = document.querySelector("#play-area");
  if (!area) return null;
  game.coreX = area.clientWidth / 2;
  game.coreY = area.clientHeight / 2;
  return { width: area.clientWidth, height: area.clientHeight };
}

function positionFor(entry, size) {
  const margin = 32;
  const x = margin + entry.edgeRatio * Math.max(0, size.width - margin * 2);
  const y = margin + entry.edgeRatio * Math.max(0, size.height - margin * 2);
  if (entry.edge === "top") return [x, margin];
  if (entry.edge === "right") return [size.width - margin, y];
  if (entry.edge === "bottom") return [x, size.height - margin];
  return [margin, y];
}

export function spawnDailyWord(game, size) {
  const entry = game.plan.entries[game.spawnedWordCount];
  if (!entry || game.words.length >= entry.profile.maxSimultaneousWords) return false;
  const [x, y] = positionFor(entry, size);
  const dx = game.coreX - x;
  const dy = game.coreY - y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const speed = entry.profile.wordSpeedPxPerSec;
  const word = {
    id: game.nextWordId++,
    text: entry.word,
    typedIndex: 0,
    x,
    y,
    vx: dx / distance * speed,
    vy: dy / distance * speed,
    movementSpeed: speed,
    createdAt: game.elapsedMs,
    startedAt: null,
    missedCharactersRecorded: false,
    coreArrivalProcessed: false,
    separationX: 0,
    separationY: 0,
    dailyPlanEntry: entry,
  };
  game.words.push(word);
  game.spawnedWordCount += 1;
  createWordElement(word);
  if (
    game.spawnedWordCount < DAILY_TOTAL_WORDS &&
    game.spawnedWordCount % DAILY_WORDS_PER_WAVE === 0
  ) {
    game.wave = game.spawnedWordCount / DAILY_WORDS_PER_WAVE + 1;
    game.spawnBlockedUntilMs = game.elapsedMs + DAILY_SPAWN_PAUSE_MS;
    game.bannerUntilMs = game.elapsedMs + DAILY_WAVE_BANNER_MS;
    game.bannerText = `WAVE ${game.wave}`;
  }
  return true;
}

function completeIfFinished(game) {
  if (
    !game.ended &&
    game.spawnedWordCount === DAILY_TOTAL_WORDS &&
    game.resolvedWordCount === DAILY_TOTAL_WORDS
  ) {
    return completeDailyRun(game, game.integrity > 0);
  }
  return null;
}

export function registerDailyWordCompletion(game, word) {
  game.completedWordCount += 1;
  game.resolvedWordCount += 1;
  game.accumulatedWordPoints = game.score;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  return completeIfFinished(game);
}

export function processDailyCoreBreach(game, word) {
  if (!game || game.ended || word.coreArrivalProcessed) return false;
  word.coreArrivalProcessed = true;
  if (!word.missedCharactersRecorded) {
    word.missedCharactersRecorded = true;
    game.missedCharacters += Math.max(0, word.text.length - word.typedIndex);
  }
  game.words = game.words.filter((candidate) => candidate.id !== word.id);
  game.resolvedWordCount += 1;
  game.missedWordCount += 1;
  game.coreBreaches += 1;
  game.combo = 0;
  reconcileTargetingState(game);
  removeWordElement(word);
  if (game.elapsedMs >= game.immunityUntilMs) {
    game.integrity -= 1;
    game.coreHits += 1;
    game.immunityUntilMs = game.elapsedMs + DAILY_COLLISION_IMMUNITY_MS;
    flashDamage(appState.save?.settings?.screenShake !== false);
  }
  if (game.integrity <= 0) completeDailyRun(game, false);
  else completeIfFinished(game);
  return true;
}

export function handleDailyKey(event, game = currentDaily) {
  if (!game || game.ended) return false;
  const handled = handleGameplayKey(
    event,
    game,
    {
      ...(appState.save?.settings || {}),
      strictMode: false,
      particles: appState.save?.settings?.particles !== false,
    },
    (_ignored, word) => registerDailyWordCompletion(game, word),
    {
      calculateWordScore: (currentGame, word) => calculateDailyWordPoints(
        word.text.length,
        word.dailyPlanEntry.wave,
        currentGame.combo,
      ),
    },
  );
  callbacks.onUpdate?.(game);
  return handled;
}

function buildDailyResult(game, success) {
  const session = getCurrentSession();
  if (!session || session.modeId !== MODE_IDS.DAILY) return null;
  const accuracy = calculateSessionAccuracy({
    correctKeystrokes: game.correctKeystrokes,
    totalKeystrokes: game.totalKeystrokes,
    missedCharacters: game.missedCharacters,
  });
  const wpm = calculateSessionWpm({
    characterCount: game.correctCharacters,
    activeDurationMs: game.elapsedMs,
  });
  const score = calculateDailyFinalScore({
    wordPoints: game.accumulatedWordPoints,
    success,
    integrityRemaining: game.integrity,
    accuracy,
    activeDurationMs: game.elapsedMs,
  });
  const endedAt = Date.now();
  return buildSessionResult({
    sessionId: session.id,
    modeId: MODE_IDS.DAILY,
    variantId: `v${game.config.challengeVersion}`,
    sessionSource: session.source,
    startedAt: session.startedAtEpochMs ?? session.createdAtEpochMs,
    endedAt,
    durationMs: Math.max(0, endedAt - session.createdAtEpochMs),
    activeDurationMs: game.elapsedMs,
    seed: game.attemptSeed,
    developerMode: game.developerMode,
    success,
    failureReason: success ? null : "core-destroyed",
    score: score.total,
    accuracy,
    wpm,
    characters: {
      correct: game.correctCharacters,
      incorrect: Math.max(0, game.totalKeystrokes - game.correctKeystrokes),
      missed: game.missedCharacters,
      totalKeystrokes: game.totalKeystrokes,
    },
    words: {
      completed: game.completedWordCount,
      missed: game.missedWordCount,
      total: game.resolvedWordCount,
    },
    combo: { maximum: game.maxCombo, final: game.combo },
    modeData: {
      dateKey: game.config.dateKey,
      challengeVersion: game.config.challengeVersion,
      dateOverride: game.config.dateOverride,
      totalWords: DAILY_TOTAL_WORDS,
      recordEligible: game.recordEligible,
      wordsSpawned: game.spawnedWordCount,
      wordsResolved: game.resolvedWordCount,
      wordsCompleted: game.completedWordCount,
      integrityRemaining: Math.max(0, game.integrity),
      coreHits: game.coreHits,
      coreBreaches: game.coreBreaches,
      finalWave: game.wave,
      wordPoints: score.wordPoints,
      completionBonus: score.bonuses.completion,
      integrityBonus: score.bonuses.integrity,
      accuracyBonus: score.bonuses.accuracy,
      timeBonus: score.bonuses.time,
      attemptSeed: game.attemptSeed,
    },
  });
}

export function completeDailyRun(game = currentDaily, success = false) {
  if (!game || game.ended) return null;
  game.ended = true;
  stopDailyLoop();
  const result = buildDailyResult(game, success);
  if (!result) return null;
  const previous = getDailyRecord(result.modeData.dateKey);
  setSessionState(SESSION_STATES.RESULTS);
  if (!completeSession(result)) return null;
  if (game.recordEligible && recordCompletedSession(result)) {
    markSessionResultPersisted(result.sessionId);
  }
  const current = getDailyRecord(result.modeData.dateKey);
  game.recordFlags = {
    newBest: Boolean(current?.best?.sessionId === result.sessionId),
    firstSuccess: result.success && previous?.firstCompletedAt == null,
  };
  game.result = result;
  if (!game.completionNotified) {
    game.completionNotified = true;
    callbacks.onComplete?.(game, result);
  }
  return result;
}

function notifyCompletion(game) {
  if (!game.ended || game.completionNotified) return;
  game.completionNotified = true;
  callbacks.onComplete?.(game, game.result);
}

function tick(timestamp) {
  const game = currentDaily;
  if (!game || game.ended) {
    notifyCompletion(game);
    return;
  }
  if (appState.screen !== Screens.PLAYING) {
    game.lastTimestamp = timestamp;
    animationFrameId = requestAnimationFrame(tick);
    return;
  }
  if (game.lastTimestamp == null) game.lastTimestamp = timestamp;
  const deltaMs = Math.min(100, Math.max(0, timestamp - game.lastTimestamp));
  game.lastTimestamp = timestamp;
  game.elapsedMs += deltaMs;
  const size = dimensions(game);
  if (!size) {
    animationFrameId = requestAnimationFrame(tick);
    return;
  }
  const next = game.plan.entries[game.spawnedWordCount];
  if (
    next &&
    game.elapsedMs >= game.spawnBlockedUntilMs &&
    game.elapsedMs - game.lastSpawnAtMs >= next.profile.spawnIntervalMs &&
    spawnDailyWord(game, size)
  ) {
    game.lastSpawnAtMs = game.elapsedMs;
  }
  const seconds = deltaMs / 1000;
  for (const word of [...game.words]) {
    word.x += word.vx * seconds;
    word.y += word.vy * seconds;
    if (Math.hypot(word.x - game.coreX, word.y - game.coreY) <= 42) {
      processDailyCoreBreach(game, word);
      if (game.ended) {
        notifyCompletion(game);
        return;
      }
    }
  }
  updateWordSeparation(game, size, deltaMs);
  const candidates = new Set(game.targetingState.candidateIds);
  for (const word of game.words) {
    updateWordElement(word, game.activeTargetId === word.id, {
      candidate: game.targetingState.mode === "ambiguous" && candidates.has(word.id),
      prefixLength: game.targetingState.prefix.length,
    });
  }
  callbacks.onUpdate?.(game);
  animationFrameId = requestAnimationFrame(tick);
}

export function startDailyRun(options = {}) {
  stopDailyLoop();
  clearWordElements();
  const game = createDailyRuntime(options);
  if (!game) return null;
  const session = beginSession({
    modeId: MODE_IDS.DAILY,
    variantId: `v${DAILY_CHALLENGE_VERSION}`,
    source: options.developerMode ? "developer" : options.source || "daily-ready",
    seed: game.attemptSeed,
    developerMode: game.developerMode,
    config: {
      dateKey: game.config.dateKey,
      challengeVersion: game.config.challengeVersion,
      totalWords: DAILY_TOTAL_WORDS,
      recordEligible: game.recordEligible,
    },
  });
  if (!session) return null;
  currentDaily = game;
  appState.game = game;
  callbacks = { onUpdate: options.onUpdate, onComplete: options.onComplete };
  markSessionActive();
  animationFrameId = requestAnimationFrame(tick);
  return game;
}

export function stopDailyLoop() {
  if (animationFrameId != null) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
}

export function resumeDailyLoop() {
  if (animationFrameId == null && currentDaily && !currentDaily.ended) {
    currentDaily.lastTimestamp = null;
    animationFrameId = requestAnimationFrame(tick);
  }
}

export function clearDailyRuntime() {
  stopDailyLoop();
  clearWordElements();
  if (currentDaily) {
    currentDaily.words.length = 0;
    resetTargetingState(currentDaily);
  }
  currentDaily = null;
  callbacks = {};
}

export function getCurrentDaily() {
  return currentDaily;
}

export function getDailyLoopActive() {
  return animationFrameId != null;
}

export function getDailyDiagnosticText(game = currentDaily) {
  if (!game) return "DAILY=inactive";
  return [
    `DATE=${game.config.dateKey}`,
    `VERSION=${game.config.challengeVersion}`,
    `SEED=${game.attemptSeed}`,
    `ELIGIBLE=${game.recordEligible}`,
    `WAVE=${game.wave}`,
    `SPAWNED=${game.spawnedWordCount}/${DAILY_TOTAL_WORDS}`,
    `RESOLVED=${game.resolvedWordCount}/${DAILY_TOTAL_WORDS}`,
    `ACTIVE=${Math.round(game.elapsedMs)}ms`,
    `INTEGRITY=${game.integrity}`,
    `COMBO=${game.combo}/${game.maxCombo}`,
    `BLOCK=${Math.max(0, game.spawnBlockedUntilMs - game.elapsedMs)}ms`,
    `SESSION=${getCurrentSession()?.state ?? "none"}`,
  ].join(" // ");
}

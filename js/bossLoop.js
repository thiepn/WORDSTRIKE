import { appState, Screens } from "./state.js";
import { clearBossPhrase, clearWordElements, renderBossPhrase } from "./renderer.js";

const INTRO_DURATION_MS = 2800;
const TRANSITION_DURATION_MS = 450;

let animationFrameId = null;
let callbacks = {};

export function createBossGameState(levelNumber, config, phrases) {
  return {
    mode: "boss",
    levelNumber,
    config,
    phrases: [...phrases],
    currentPhrase: phrases[0] || "",
    phraseIndex: 0,
    phraseCharIndex: 0,
    phrasesCompleted: 0,
    phase: "INTRO",
    introElapsedMs: 0,
    transitionElapsedMs: 0,
    remainingMs: config.timeLimitSec * 1000,
    elapsedMs: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    correctCharacters: 0,
    missedCharacters: 0,
    wordStartIndex: 0,
    wordStartElapsedMs: 0,
    lastTimestamp: null,
    ended: false,
    timeoutCounted: false,
  };
}

export function addBossTimeoutMisses(game) {
  if (game.timeoutCounted) return 0;
  game.timeoutCounted = true;
  let missed = Math.max(0, game.currentPhrase.length - game.phraseCharIndex);
  for (let index = game.phraseIndex + 1; index < game.phrases.length; index += 1) {
    missed += game.phrases[index].length;
  }
  game.missedCharacters += missed;
  return missed;
}

function finishBoss(game, success) {
  if (game.ended) return;
  game.ended = true;
  if (!success) addBossTimeoutMisses(game);
  stopBossLoop();
  callbacks.onUpdate?.(game);
  callbacks.onEnd?.(game, success);
}

export function completeBossPhrase(game) {
  if (game.ended || game.phase !== "ACTIVE") return;
  game.phrasesCompleted += 1;
  if (game.phrasesCompleted >= game.phrases.length) {
    finishBoss(game, true);
    return;
  }
  game.phase = "TRANSITION";
  game.transitionElapsedMs = 0;
  callbacks.onUpdate?.(game);
}

function beginNextPhrase(game) {
  game.phraseIndex += 1;
  game.currentPhrase = game.phrases[game.phraseIndex] || "";
  game.phraseCharIndex = 0;
  game.wordStartIndex = 0;
  game.wordStartElapsedMs = game.elapsedMs;
  game.phase = "ACTIVE";
  renderBossPhrase(game);
  callbacks.onUpdate?.(game);
}

function tick(timestamp) {
  const game = appState.game;
  if (!game || game.mode !== "boss" || game.ended) return;

  if (appState.screen !== Screens.PLAYING) {
    game.lastTimestamp = timestamp;
    animationFrameId = requestAnimationFrame(tick);
    return;
  }

  if (game.lastTimestamp === null) game.lastTimestamp = timestamp;
  const deltaMs = Math.max(timestamp - game.lastTimestamp, 0);
  game.lastTimestamp = timestamp;

  if (game.phase === "INTRO") {
    game.introElapsedMs += deltaMs;
    if (game.introElapsedMs >= INTRO_DURATION_MS) {
      game.phase = "ACTIVE";
      game.wordStartElapsedMs = 0;
      renderBossPhrase(game);
    }
  } else {
    game.remainingMs = Math.max(0, game.remainingMs - deltaMs);
    if (game.phase === "ACTIVE") game.elapsedMs += deltaMs;
    if (game.remainingMs <= 0) {
      finishBoss(game, false);
      return;
    }
    if (game.phase === "TRANSITION") {
      game.transitionElapsedMs += deltaMs;
      if (game.transitionElapsedMs >= TRANSITION_DURATION_MS) beginNextPhrase(game);
    }
  }

  callbacks.onUpdate?.(game);
  animationFrameId = requestAnimationFrame(tick);
}

export function startBossLoop(levelNumber, config, phrases, nextCallbacks = {}) {
  stopBossLoop();
  clearWordElements();
  clearBossPhrase();
  callbacks = nextCallbacks;
  appState.game = createBossGameState(levelNumber, config, phrases);
  callbacks.onUpdate?.(appState.game);
  animationFrameId = requestAnimationFrame(tick);
  return appState.game;
}

export function stopBossLoop() {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  clearBossPhrase();
  if (appState.game?.mode === "boss") appState.game.lastTimestamp = null;
}

export function resumeBossLoop() {
  if (
    animationFrameId === null &&
    appState.game?.mode === "boss" &&
    !appState.game.ended
  ) {
    appState.game.lastTimestamp = null;
    animationFrameId = requestAnimationFrame(tick);
  }
}

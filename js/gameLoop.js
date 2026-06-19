import { appState, Screens } from "./state.js";
import {
  clearWordElements,
  createWordElement,
  flashDamage,
  removeWordElement,
  updateWordElement,
} from "./renderer.js";

let animationFrameId = null;
let callbacks = {};

function buildGame(levelNumber, config, words) {
  return {
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
    correctCharacters: 0,
    elapsedMs: 0,
    coreX: 0,
    coreY: 0,
    lastTimestamp: null,
    ended: false,
  };
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
  };
  game.nextWordId += 1;
  game.spawnedCount += 1;
  game.words.push(word);
  createWordElement(word);
}

function missWord(game, word) {
  game.words = game.words.filter((candidate) => candidate.id !== word.id);
  if (game.activeTargetId === word.id) game.activeTargetId = null;
  game.lives -= 1;
  game.combo = 0;
  removeWordElement(word);
  flashDamage(appState.save.settings.screenShake);
  callbacks.onHudUpdate?.(game);
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
  game.elapsedMs += deltaMs;
  const dimensions = getDimensions(game);
  if (!dimensions) return;

  if (
    game.spawnedCount < game.config.wordCount &&
    game.words.length < game.config.maxSimultaneousWords &&
    game.elapsedMs - game.lastSpawnAt >= game.config.spawnIntervalMs
  ) {
    spawnWord(game, dimensions);
    game.lastSpawnAt = game.elapsedMs;
  }

  const deltaSeconds = deltaMs / 1000;
  for (const word of [...game.words]) {
    word.x += word.vx * deltaSeconds;
    word.y += word.vy * deltaSeconds;
    if (Math.hypot(word.x - game.coreX, word.y - game.coreY) <= 42) {
      missWord(game, word);
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
  clearWordElements();
  callbacks = nextCallbacks;
  appState.game = buildGame(levelNumber, config, words);
  animationFrameId = requestAnimationFrame(tick);
  return appState.game;
}

export function stopGameLoop() {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  if (appState.game) appState.game.lastTimestamp = null;
}

export function resumeGameLoop() {
  if (animationFrameId === null && appState.game && !appState.game.ended) {
    appState.game.lastTimestamp = null;
    animationFrameId = requestAnimationFrame(tick);
  }
}

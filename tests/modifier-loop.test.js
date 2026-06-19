import assert from "node:assert/strict";
import { NO_BACKSPACE_ID, QUICK_FINGERS_ID } from "../js/modifiers.js";

class ClassList {
  add() {}
  remove() {}
  toggle() {}
}
class Element {
  constructor() {
    this.clientWidth = 800;
    this.clientHeight = 600;
    this.style = {};
    this.dataset = {};
    this.classList = new ClassList();
    this.children = [];
    this.offsetWidth = 1;
  }
  set className(_value) {}
  setAttribute() {}
  addEventListener() {}
  append(child) { this.children.push(child); }
  remove() {}
  animate() {}
  set innerHTML(_value) {}
}
const playArea = new Element();
const gameScreen = new Element();
globalThis.document = {
  querySelector(selector) {
    if (selector === "#play-area") return playArea;
    if (selector === ".game-screen") return gameScreen;
    return null;
  },
  createElement() { return new Element(); },
};
globalThis.window = { setTimeout() {} };

let frameId = 0;
const frames = new Map();
globalThis.requestAnimationFrame = (callback) => {
  const id = ++frameId;
  frames.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);

const { appState, Screens } = await import("../js/state.js");
const { startLevelLoop, stopGameLoop } = await import("../js/gameLoop.js");
const { startBossLoop, stopBossLoop } = await import("../js/bossLoop.js");
const { handleGameplayKey } = await import("../js/input.js");

appState.screen = Screens.PLAYING;
appState.save = { settings: { screenShake: false } };
let now = 0;
function frame(delta = 100) {
  const entry = frames.entries().next().value;
  assert.ok(entry, "expected animation frame");
  frames.delete(entry[0]);
  now += delta;
  entry[1](now);
}

const config = {
  lives: 3,
  spawnIntervalMs: 1000,
  wordCount: 20,
  maxSimultaneousWords: 2,
  wordSpeedPxPerSec: 0,
  modifiers: [QUICK_FINGERS_ID],
};
const words = Array.from({ length: 20 }, (_, index) => `word${index}`);

let game = startLevelLoop(22, config, words, {});
assert.equal(game.phase, "MODIFIER_BRIEFING");
assert.equal(game.elapsedMs, 0);
while (game.phase === "MODIFIER_BRIEFING") frame();
assert.equal(game.phase, "ACTIVE");
assert.equal(game.elapsedMs, 0);
assert.equal(game.spawnedCount, 0);
frame();
assert.equal(game.spawnedCount, 1);

while (game.elapsedMs < 5900) frame();
assert.equal(game.modifierRuntime.quickFingers.phase, "waiting");
const elapsedBeforePause = game.elapsedMs;
appState.screen = Screens.PAUSED;
for (let index = 0; index < 10; index += 1) frame();
assert.equal(game.elapsedMs, elapsedBeforePause);
assert.equal(game.modifierRuntime.quickFingers.phase, "waiting");
appState.screen = Screens.PLAYING;
frame();
assert.equal(game.modifierRuntime.quickFingers.phase, "burst");
assert.equal(game.modifierRuntime.quickFingers.effectiveSpawnIntervalMs, 500);
assert.equal(game.modifierRuntime.quickFingers.burstCount, 1);

for (let index = 0; index < 20; index += 1) frame();
assert.ok(game.words.length <= config.maxSimultaneousWords);
assert.ok(game.spawnedCount <= config.wordCount);

stopGameLoop();
game = startLevelLoop(22, config, words, {});
assert.equal(game.briefingElapsedMs, 0);
assert.equal(game.modifierRuntime.quickFingers.burstCount, 0);
assert.equal(frames.size, 1);
stopGameLoop();

game = startLevelLoop(
  22,
  { ...config, wordCount: 1, maxSimultaneousWords: 2 },
  ["cat"],
  {},
);
while (game.phase === "MODIFIER_BRIEFING") frame();
frame();
assert.equal(game.spawnedCount, 1);
frame();
assert.equal(game.modifierRuntime.quickFingers.phase, "complete");
assert.equal(game.modifierRuntime.quickFingers.active, false);
stopGameLoop();

let outcome = null;
game = startLevelLoop(
  42,
  {
    lives: 2,
    spawnIntervalMs: 1000,
    wordCount: 1,
    maxSimultaneousWords: 1,
    wordSpeedPxPerSec: 100,
    modifiers: [NO_BACKSPACE_ID],
  },
  ["cat"],
  { onEnd: (_game, success) => { outcome = success; } },
);
while (game.phase === "MODIFIER_BRIEFING") frame();
frame();
handleGameplayKey(
  { key: "c", preventDefault() {} },
  game,
  { strictMode: false, particles: false },
);
handleGameplayKey(
  { key: "x", preventDefault() {} },
  game,
  { strictMode: false, particles: false },
);
assert.equal(game.words[0].abandoned, true);
assert.equal(outcome, null);
while (outcome === null) frame();
assert.equal(outcome, true);
assert.equal(game.lives, 1);
assert.equal(game.missedCharacters, 2);
assert.equal(game.words.length, 0);

outcome = null;
game = startLevelLoop(
  42,
  {
    lives: 1,
    spawnIntervalMs: 1000,
    wordCount: 1,
    maxSimultaneousWords: 1,
    wordSpeedPxPerSec: 100,
    modifiers: [NO_BACKSPACE_ID],
  },
  ["cat"],
  { onEnd: (_game, success) => { outcome = success; } },
);
while (game.phase === "MODIFIER_BRIEFING") frame();
frame();
handleGameplayKey(
  { key: "c", preventDefault() {} },
  game,
  { strictMode: false, particles: false },
);
handleGameplayKey(
  { key: "x", preventDefault() {} },
  game,
  { strictMode: false, particles: false },
);
while (outcome === null) frame();
assert.equal(outcome, false);
assert.equal(game.lives, 0);
assert.equal(game.missedCharacters, 2);
assert.equal(game.words.length, 0);

startBossLoop(20, { timeLimitSec: 10 }, ["go now"], {});
assert.equal(appState.game.mode, "boss");
assert.equal(appState.game.modifierRuntime, undefined);
assert.equal(frames.size, 1);
stopBossLoop();

game = startLevelLoop(21, { ...config, modifiers: [] }, words, {});
assert.equal(game.mode, "normal");
assert.equal(game.modifierRuntime, null);
assert.equal(game.phase, "ACTIVE");
assert.equal(frames.size, 1);
stopGameLoop();

console.log("Modifier briefing, pause, burst, caps, retry, boss, and loop tests passed.");

import assert from "node:assert/strict";

class ClassList {
  add() {}
  remove() {}
  toggle() {}
}
const phrase = { innerHTML: "" };
const progress = { style: {} };
globalThis.document = {
  querySelector(selector) {
    if (selector === "#boss-phrase") return phrase;
    if (selector === "#boss-progress-fill") return progress;
    return null;
  },
};
globalThis.window = { setTimeout() {} };

let nextFrameId = 0;
const frames = new Map();
globalThis.requestAnimationFrame = (callback) => {
  const id = ++nextFrameId;
  frames.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);

const { appState, Screens } = await import("../js/state.js");
const {
  completeBossPhrase,
  startBossLoop,
  stopBossLoop,
} = await import("../js/bossLoop.js");
const { startLevelLoop, stopGameLoop } = await import("../js/gameLoop.js");
const { handleBossKey } = await import("../js/input.js");

appState.screen = Screens.PLAYING;
let now = 0;
function frame(delta = 100) {
  const entry = frames.entries().next().value;
  assert.ok(entry, "expected a queued animation frame");
  frames.delete(entry[0]);
  now += delta;
  entry[1](now);
}

let outcome = null;
let game = startBossLoop(
  10,
  { timeLimitSec: 1 },
  ["a"],
  { onEnd: (_game, success) => { outcome = success; } },
);
for (let index = 0; index < 30 && game.phase === "INTRO"; index += 1) frame();
assert.equal(game.phase, "ACTIVE");
assert.equal(game.remainingMs, 1000);

const remainingBeforePause = game.remainingMs;
appState.screen = Screens.PAUSED;
for (let index = 0; index < 5; index += 1) frame();
assert.equal(game.remainingMs, remainingBeforePause);
assert.equal(game.elapsedMs, 0);
appState.screen = Screens.PLAYING;
frame(100);
assert.equal(game.remainingMs, 900);

game.remainingMs = 0.1;
appState.screen = Screens.PAUSED;
frame(500);
assert.equal(game.remainingMs, 0.1);
appState.screen = Screens.PLAYING;
handleBossKey(
  { key: "a", preventDefault() {} },
  game,
  { strictMode: false },
  completeBossPhrase,
);
assert.equal(outcome, true);
assert.equal(frames.size, 0);

outcome = null;
now = 0;
game = startBossLoop(
  50,
  { timeLimitSec: 2 },
  ["a", "b"],
  { onEnd: (_game, success) => { outcome = success; } },
);
for (let index = 0; index < 30 && game.phase === "INTRO"; index += 1) frame();
handleBossKey(
  { key: "a", preventDefault() {} },
  game,
  { strictMode: false },
  completeBossPhrase,
);
assert.equal(game.phase, "TRANSITION");
const transitionStartTime = game.remainingMs;
appState.screen = Screens.PAUSED;
for (let index = 0; index < 3; index += 1) frame();
assert.equal(game.phase, "TRANSITION");
assert.equal(game.remainingMs, transitionStartTime);
appState.screen = Screens.PLAYING;
for (let index = 0; index < 5; index += 1) frame();
assert.equal(game.phase, "ACTIVE");
assert.equal(game.phraseIndex, 1);
assert.ok(game.remainingMs < transitionStartTime);
assert.equal(game.combo, 1);

outcome = null;
now = 0;
game = startBossLoop(
  50,
  { timeLimitSec: 0.2 },
  ["alpha beta", "gamma ray"],
  { onEnd: (_game, success) => { outcome = success; } },
);
for (let index = 0; index < 30 && game.phase === "INTRO"; index += 1) frame();
while (outcome === null) frame();
assert.equal(outcome, false);
assert.equal(game.remainingMs, 0);
assert.equal(game.missedCharacters, "alpha beta".length + "gamma ray".length);
const missedOnce = game.missedCharacters;
completeBossPhrase(game);
assert.equal(game.missedCharacters, missedOnce);

startBossLoop(10, { timeLimitSec: 1 }, ["a"], {});
startBossLoop(10, { timeLimitSec: 1 }, ["a"], {});
assert.equal(frames.size, 1);
stopBossLoop();
assert.equal(frames.size, 0);

startLevelLoop(
  9,
  {
    lives: 3,
    spawnIntervalMs: 1000,
    wordCount: 1,
    maxSimultaneousWords: 1,
    wordSpeedPxPerSec: 50,
  },
  ["cat"],
  {},
);
assert.equal(frames.size, 1);
stopGameLoop();
startBossLoop(10, { timeLimitSec: 1 }, ["a"], {});
assert.equal(frames.size, 1);
stopBossLoop();
startLevelLoop(
  11,
  {
    lives: 3,
    spawnIntervalMs: 1000,
    wordCount: 1,
    maxSimultaneousWords: 1,
    wordSpeedPxPerSec: 50,
  },
  ["cat"],
  {},
);
assert.equal(frames.size, 1);
stopGameLoop();

console.log("Boss intro, pause, final-key priority, timeout, retry, and mode-switch tests passed.");

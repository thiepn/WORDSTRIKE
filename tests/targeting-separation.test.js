import assert from "node:assert/strict";

class ClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  toggle(value, force) {
    if (force) this.values.add(value);
    else this.values.delete(value);
  }
  contains(value) { return this.values.has(value); }
}

class Element {
  constructor() {
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.classList = new ClassList();
    this.offsetWidth = 1;
    this.clientWidth = 800;
    this.clientHeight = 600;
    this.attributes = {};
    this.html = "";
  }
  set className(value) {
    value.split(/\s+/).filter(Boolean).forEach((name) => this.classList.add(name));
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener() {}
  append(child) { this.children.push(child); }
  remove() {}
  animate() {}
  set innerHTML(value) { this.html = value; }
}

const playArea = new Element();
globalThis.document = {
  querySelector(selector) {
    if (selector === "#play-area") return playArea;
    return null;
  },
  createElement() { return new Element(); },
};
globalThis.window = { setTimeout() {} };

const { createWordElement } = await import("../js/renderer.js");
const {
  handleGameplayKey,
  reconcileTargetingState,
} = await import("../js/input.js");
const {
  createGameState,
  processWordCoreArrival,
  updateWordSeparation,
} = await import("../js/gameLoop.js");
const { appState } = await import("../js/state.js");

function makeGame() {
  const game = createGameState(
    61,
    {
      lives: 3,
      spawnIntervalMs: 1000,
      wordCount: 3,
      maxSimultaneousWords: 3,
      wordSpeedPxPerSec: 0,
    },
    [],
  );
  game.phase = "ACTIVE";
  game.coreX = 0;
  game.coreY = 0;
  return game;
}

function addWord(game, text, id, x, overrides = {}) {
  const word = {
    id,
    text,
    typedIndex: 0,
    x,
    y: overrides.y ?? 0,
    vx: 0,
    vy: 0,
    startedAt: null,
    missedCharactersRecorded: false,
    coreArrivalProcessed: false,
    separationX: overrides.separationX ?? 0,
    separationY: overrides.separationY ?? 0,
    ...overrides,
  };
  game.words.push(word);
  createWordElement(word);
  return word;
}

const event = (key) => ({
  key,
  preventDefault() {},
});

let game = makeGame();
let charge = addWord(game, "charge", 1, 30);
let control = addWord(game, "control", 2, 10);
game.elapsedMs = 125;
handleGameplayKey(event("c"), game, { strictMode: false, particles: false });
assert.equal(game.targetingState.mode, "ambiguous");
assert.equal(game.targetingState.prefix, "c");
assert.deepEqual(game.targetingState.candidateIds, [2, 1]);
assert.equal(game.activeTargetId, null);
assert.equal(game.totalKeystrokes, 1);
assert.equal(game.correctKeystrokes, 1);
assert.equal(charge.typedIndex, 0);
assert.equal(control.typedIndex, 0);
handleGameplayKey(event("o"), game, { strictMode: false, particles: false });
assert.equal(game.targetingState.mode, "locked");
assert.equal(game.activeTargetId, control.id);
assert.equal(control.typedIndex, 2);
assert.equal(control.startedAt, 125);
assert.equal(game.totalKeystrokes, 2);
assert.equal(game.correctKeystrokes, 2);

game = makeGame();
charge = addWord(game, "charge", 1, 30);
control = addWord(game, "control", 2, 10);
handleGameplayKey(event("c"), game, { strictMode: false, particles: false });
handleGameplayKey(event("x"), game, { strictMode: false, particles: false });
assert.equal(game.targetingState.mode, "ambiguous");
assert.equal(game.targetingState.prefix, "c");
assert.equal(game.totalKeystrokes, 2);
assert.equal(game.correctKeystrokes, 1);
handleGameplayKey(event("h"), game, { strictMode: false, particles: false });
assert.equal(game.activeTargetId, charge.id);
assert.equal(charge.typedIndex, 2);

appState.save = { settings: { screenShake: false } };
game = makeGame();
charge = addWord(game, "charge", 1, 30);
control = addWord(game, "control", 2, 10);
handleGameplayKey(event("c"), game, { strictMode: false, particles: false });
processWordCoreArrival(game, control);
assert.equal(game.targetingState.mode, "locked");
assert.equal(game.activeTargetId, charge.id);
assert.equal(charge.typedIndex, 1);
game.words = [];
reconcileTargetingState(game);
assert.equal(game.targetingState.mode, "idle");

game = makeGame();
const locked = addWord(game, "alpha", 1, 200, { y: 200 });
const normal = addWord(game, "bravo", 2, 202, { y: 202 });
game.targetingState.mode = "locked";
game.targetingState.activeTargetId = locked.id;
game.activeTargetId = locked.id;
const baseCoordinates = game.words.map((word) => [word.x, word.y]);
updateWordSeparation(game, { width: 800, height: 600 }, 80);
assert.ok(Math.abs(locked.separationX) + Math.abs(locked.separationY) > 0);
assert.ok(Math.abs(normal.separationX) + Math.abs(normal.separationY) > 0);
assert.ok(
  Math.abs(locked.separationX) + Math.abs(locked.separationY) <
  Math.abs(normal.separationX) + Math.abs(normal.separationY),
);
assert.deepEqual(game.words.map((word) => [word.x, word.y]), baseCoordinates);
assert.ok(game.words.every(
  (word) => Math.abs(word.separationX) <= 30 && Math.abs(word.separationY) <= 30,
));
normal.x = 600;
normal.y = 500;
const previousOffset = Math.abs(normal.separationX) + Math.abs(normal.separationY);
updateWordSeparation(game, { width: 800, height: 600 }, 40);
assert.ok(
  Math.abs(normal.separationX) + Math.abs(normal.separationY) < previousOffset,
);

console.log("Ambiguous targeting and word separation tests passed.");

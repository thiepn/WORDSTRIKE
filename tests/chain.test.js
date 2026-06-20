import assert from "node:assert/strict";
import {
  CHAIN_BREAK_CAUSES,
  CHAIN_FAILURE_REASON,
  CHAIN_ID,
  markChainBroken,
  QUICK_FINGERS_ID,
} from "../js/modifiers.js";
import { calculateAccuracy, calculateGrade } from "../js/scoring.js";

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

const { createWordElement } = await import("../js/renderer.js");
const { handleGameplayKey } = await import("../js/input.js");
const {
  createGameState,
  finalizeChainFailure,
  processWordCoreArrival,
} = await import("../js/gameLoop.js");
const { appState } = await import("../js/state.js");

function makeGame(modifierId = CHAIN_ID) {
  const game = createGameState(
    82,
    {
      lives: 3,
      spawnIntervalMs: 1000,
      wordCount: 3,
      maxSimultaneousWords: 3,
      wordSpeedPxPerSec: 0,
      modifiers: modifierId ? [modifierId] : [],
    },
    ["charge", "control", "laser"],
    { attemptSeed: 12345 },
  );
  game.phase = "ACTIVE";
  game.coreX = 0;
  game.coreY = 0;
  return game;
}

function addWord(game, text, id, x = 20) {
  const word = {
    id,
    text,
    typedIndex: 0,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    startedAt: null,
    abandoned: false,
    missedCharactersRecorded: false,
    coreArrivalProcessed: false,
    separationX: 0,
    separationY: 0,
  };
  game.words.push(word);
  createWordElement(word);
  return word;
}

const event = (key) => ({
  key,
  prevented: false,
  preventDefault() { this.prevented = true; },
});
const settings = { strictMode: false, particles: false, screenShake: false };
const press = (key, game, strictMode = false) => handleGameplayKey(
  event(key),
  game,
  { ...settings, strictMode },
  undefined,
  finalizeChainFailure,
);

let game = makeGame();
let word = addWord(game, "laser", 1);
press("l", game);
assert.equal(game.chainRuntime.broken, false);
assert.equal(game.targetingState.mode, "locked");
assert.equal(word.typedIndex, 1);
assert.equal(game.correctKeystrokes, 1);

game = makeGame();
addWord(game, "laser", 1);
press("x", game);
assert.equal(game.ended, true);
assert.equal(game.failureReason, CHAIN_FAILURE_REASON);
assert.equal(game.chainRuntime.breakCause, CHAIN_BREAK_CAUSES.WRONG_KEY_IDLE);
assert.equal(game.totalKeystrokes, 1);
assert.equal(game.correctKeystrokes, 0);
assert.equal(game.lives, 3);
assert.equal(press("x", game), false);
assert.equal(game.totalKeystrokes, 1);

game = makeGame();
addWord(game, "laser", 1);
press("Shift", game);
press("ArrowLeft", game);
const backspace = event("Backspace");
handleGameplayKey(
  backspace,
  game,
  settings,
  undefined,
  finalizeChainFailure,
);
assert.equal(backspace.prevented, true);
assert.equal(game.chainRuntime.broken, false);
assert.equal(game.totalKeystrokes, 0);

game = makeGame();
const charge = addWord(game, "charge", 1, 30);
const control = addWord(game, "control", 2, 10);
press("c", game);
assert.equal(game.targetingState.mode, "ambiguous");
assert.equal(game.correctKeystrokes, 1);
press("x", game);
assert.equal(game.ended, true);
assert.equal(
  game.chainRuntime.breakCause,
  CHAIN_BREAK_CAUSES.WRONG_KEY_AMBIGUOUS,
);
assert.equal(game.totalKeystrokes, 2);
assert.equal(game.correctKeystrokes, 1);
assert.equal(charge.abandoned, false);
assert.equal(control.abandoned, false);

for (const strictMode of [false, true]) {
  game = makeGame();
  word = addWord(game, "laser", 1);
  press("l", game, strictMode);
  game.combo = 7;
  press("x", game, strictMode);
  assert.equal(game.ended, true);
  assert.equal(game.chainRuntime.breakCause, CHAIN_BREAK_CAUSES.WRONG_KEY_LOCKED);
  assert.equal(game.chainRuntime.failedWordId, word.id);
  assert.equal(game.chainRuntime.comboAtBreak, 7);
  assert.equal(word.typedIndex, 1);
  assert.equal(word.abandoned, false);
  assert.equal(game.lives, 3);
}

game = makeGame();
word = addWord(game, "laser", 1);
const secondCoreWord = addWord(game, "target", 2);
game.combo = 5;
appState.save = { settings: { screenShake: false } };
const movementTransform = playArea.children.at(-1).style.transform;
assert.equal(processWordCoreArrival(game, word), true);
assert.equal(game.ended, true);
assert.equal(game.lives, 3);
assert.equal(game.missedCharacters, 5);
assert.equal(game.chainRuntime.breakCause, CHAIN_BREAK_CAUSES.WORD_REACHED_CORE);
assert.equal(game.chainRuntime.failedWordId, word.id);
assert.equal(game.chainRuntime.comboAtBreak, 5);
assert.equal(gameScreen.classList.contains("chain-break-flash"), true);
assert.equal(playArea.children.at(-1)?.style.transform, movementTransform);
assert.equal(processWordCoreArrival(game, word), false);
assert.equal(game.missedCharacters, 5);
assert.equal(processWordCoreArrival(game, secondCoreWord), false);
assert.equal(game.missedCharacters, 5);

game = makeGame();
game.combo = 3;
assert.equal(
  markChainBroken(game, CHAIN_BREAK_CAUSES.OTHER_MISS, 9),
  true,
);
assert.equal(
  markChainBroken(game, CHAIN_BREAK_CAUSES.WRONG_KEY_IDLE, null),
  false,
);
assert.equal(game.chainRuntime.breakCause, CHAIN_BREAK_CAUSES.OTHER_MISS);
assert.equal(game.chainRuntime.comboAtBreak, 3);

assert.equal(makeGame().modifierRuntime, null);
assert.equal(makeGame().blackoutStats, undefined);
assert.equal(makeGame(QUICK_FINGERS_ID).chainRuntime, undefined);
assert.equal(makeGame(null).chainRuntime, undefined);
assert.equal(calculateAccuracy(10, 10, 0), 100);
assert.equal(calculateGrade({ accuracy: 100 }), "S");
assert.equal(calculateGrade({ accuracy: 100, failed: true }), "Fail");

console.log("Chain input, ambiguity, core failure, accuracy, isolation, and visual tests passed.");

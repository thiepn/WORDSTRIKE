import assert from "node:assert/strict";
import { NO_BACKSPACE_ID, QUICK_FINGERS_ID } from "../js/modifiers.js";
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
    this.removed = false;
  }
  set className(value) {
    value.split(/\s+/).filter(Boolean).forEach((item) => this.classList.add(item));
  }
  setAttribute() {}
  addEventListener() {}
  append(child) { this.children.push(child); }
  remove() { this.removed = true; }
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
const { handleGameplayKey } = await import("../js/input.js");
const {
  createGameState,
  processWordCoreArrival,
} = await import("../js/gameLoop.js");
const { appState } = await import("../js/state.js");

function makeGame(modifierId = NO_BACKSPACE_ID) {
  const game = createGameState(
    42,
    {
      lives: 3,
      spawnIntervalMs: 1000,
      modifiers: modifierId ? [modifierId] : [],
    },
    [],
  );
  game.phase = "ACTIVE";
  game.coreX = 0;
  game.coreY = 0;
  return game;
}

function addWord(game, overrides = {}) {
  const word = {
    id: overrides.id ?? game.words.length + 1,
    text: overrides.text ?? "laser",
    typedIndex: overrides.typedIndex ?? 0,
    x: overrides.x ?? 20,
    y: overrides.y ?? 0,
    abandoned: overrides.abandoned ?? false,
    abandonedAt: null,
    missedCharactersRecorded: overrides.missedCharactersRecorded ?? false,
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

let game = makeGame();
let word = addWord(game);
const movementWrapper = playArea.children.at(-1);
const positionBeforeCorruption = movementWrapper.style.transform;
handleGameplayKey(event("l"), game, { strictMode: false, particles: false });
assert.equal(word.typedIndex, 1);
assert.equal(word.abandoned, false);
assert.equal(game.activeTargetId, word.id);

game.combo = 4;
handleGameplayKey(event("x"), game, { strictMode: false, particles: false });
assert.equal(game.totalKeystrokes, 2);
assert.equal(word.abandoned, true);
assert.equal(game.activeTargetId, null);
assert.equal(game.missedCharacters, 4);
assert.equal(game.abandonedCharacters, 4);
assert.equal(game.abandonedWordCount, 1);
assert.equal(game.combo, 4);
assert.equal(
  movementWrapper.children[0].children[0].classList.contains("word-abandoned"),
  true,
);
assert.equal(movementWrapper.style.transform, positionBeforeCorruption);

handleGameplayKey(event("l"), game, { strictMode: false, particles: false });
assert.equal(game.activeTargetId, null);
assert.equal(word.typedIndex, 1);
assert.equal(game.abandonedWordCount, 1);

const recoverable = addWord(game, { id: 2, text: "lamp", x: 30 });
handleGameplayKey(event("l"), game, { strictMode: false, particles: false });
assert.equal(game.activeTargetId, recoverable.id);
assert.equal(recoverable.typedIndex, 1);

const backspace = event("Backspace");
handleGameplayKey(backspace, game, { strictMode: false, particles: false });
assert.equal(backspace.prevented, true);
assert.equal(recoverable.typedIndex, 1);
assert.equal(recoverable.abandoned, false);

const briefingGame = makeGame();
briefingGame.phase = "MODIFIER_BRIEFING";
const briefingBackspace = event("Backspace");
handleGameplayKey(briefingBackspace, briefingGame, { strictMode: false, particles: false });
assert.equal(briefingBackspace.prevented, true);
assert.equal(briefingGame.totalKeystrokes, 0);

game = makeGame();
word = addWord(game);
game.combo = 5;
handleGameplayKey(event("l"), game, { strictMode: true, particles: false });
handleGameplayKey(event("x"), game, { strictMode: true, particles: false });
assert.equal(word.abandoned, true);
assert.equal(game.combo, 0);

game = makeGame();
word = addWord(game);
handleGameplayKey(event("l"), game, { strictMode: false, particles: false });
handleGameplayKey(event("."), game, { strictMode: false, particles: false });
assert.equal(word.abandoned, true);
assert.equal(game.totalKeystrokes, 2);

game = makeGame();
word = addWord(game);
handleGameplayKey(event("x"), game, { strictMode: false, particles: false });
assert.equal(word.abandoned, false);
assert.equal(game.abandonedWordCount, 0);
assert.equal(game.totalKeystrokes, 1);

game = makeGame(QUICK_FINGERS_ID);
word = addWord(game);
handleGameplayKey(event("l"), game, { strictMode: false, particles: false });
handleGameplayKey(event("x"), game, { strictMode: false, particles: false });
assert.equal(word.abandoned, false);
assert.equal(game.missedCharacters, 0);

game = makeGame();
word = addWord(game, { typedIndex: 2 });
word.abandoned = true;
word.missedCharactersRecorded = true;
game.missedCharacters = 3;
game.abandonedCharacters = 3;
game.abandonedWordCount = 1;
game.activeTargetId = word.id;
game.combo = 8;
appState.save = { settings: { screenShake: false } };
processWordCoreArrival(game, word);
assert.equal(game.lives, 2);
assert.equal(game.combo, 0);
assert.equal(game.words.length, 0);
assert.equal(game.missedCharacters, 3);
assert.equal(word.removed, undefined);
assert.equal(processWordCoreArrival(game, word), false);
assert.equal(game.lives, 2);

assert.ok(Math.abs(calculateAccuracy(2, 3, 3) - (100 / 3)) < 1e-10);
assert.equal(calculateGrade({ accuracy: 86.1, modifier: NO_BACKSPACE_ID }), "C");
assert.equal(makeGame().abandonedWordCount, 0);
assert.equal(makeGame().abandonedCharacters, 0);

console.log("No Backspace input, targeting, accuracy, visual, core, and reset tests passed.");

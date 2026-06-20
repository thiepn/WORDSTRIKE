import assert from "node:assert/strict";
import {
  BLACKOUT_ID,
  getBlackoutVisibility,
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
    this.removed = false;
    this.html = "";
    this.attributes = {};
  }
  set className(value) {
    value.split(/\s+/).filter(Boolean).forEach((item) => this.classList.add(item));
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
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

const {
  createWordElement,
  updateWordElement,
} = await import("../js/renderer.js");
const { handleGameplayKey } = await import("../js/input.js");
const {
  createGameState,
  processWordCoreArrival,
  updateBlackoutWordState,
} = await import("../js/gameLoop.js");
const { appState } = await import("../js/state.js");

function makeGame(modifierId = BLACKOUT_ID) {
  const game = createGameState(
    62,
    {
      lives: 3,
      spawnIntervalMs: 1000,
      wordCount: 3,
      maxSimultaneousWords: 3,
      wordSpeedPxPerSec: 0,
      modifiers: modifierId ? [modifierId] : [],
    },
    ["cat", "car", "dog"],
  );
  game.phase = "ACTIVE";
  game.coreX = 0;
  game.coreY = 0;
  return game;
}

function addWord(game, overrides = {}) {
  const word = {
    id: overrides.id ?? game.words.length + 1,
    text: overrides.text ?? "cat",
    typedIndex: overrides.typedIndex ?? 0,
    x: overrides.x ?? 20,
    y: overrides.y ?? 0,
    spawnedAtActiveMs: overrides.spawnedAtActiveMs ?? 0,
    startedAt: overrides.startedAt ?? null,
    abandoned: false,
    missedCharactersRecorded: false,
    coreArrivalProcessed: false,
    blackoutPhase: overrides.blackoutPhase ?? "visible",
    blackoutTextOpacity: overrides.blackoutTextOpacity ?? 1,
    blackoutHidden: overrides.blackoutHidden ?? false,
    blackoutHiddenCounted: false,
    blackoutMissedAfterFadeCounted: false,
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

assert.equal(getBlackoutVisibility(1599).phase, "visible");
assert.deepEqual(getBlackoutVisibility(1600), {
  phase: "fading",
  textOpacity: 1,
  hidden: false,
});
assert.deepEqual(getBlackoutVisibility(1800), {
  phase: "fading",
  textOpacity: 0.5,
  hidden: false,
});
assert.deepEqual(getBlackoutVisibility(2000), {
  phase: "hidden",
  textOpacity: 0,
  hidden: true,
});

let game = makeGame();
let first = addWord(game, { spawnedAtActiveMs: 0 });
let second = addWord(game, { spawnedAtActiveMs: 1000, x: 40 });
game.elapsedMs = 1800;
updateBlackoutWordState(game, first);
updateBlackoutWordState(game, second);
assert.equal(first.blackoutPhase, "fading");
assert.equal(first.blackoutTextOpacity, 0.5);
assert.equal(second.blackoutPhase, "visible");
assert.equal(game.blackoutStats.wordsHidden, 0);

game.elapsedMs = 2000;
updateBlackoutWordState(game, first);
updateBlackoutWordState(game, first);
assert.equal(first.blackoutHidden, true);
assert.equal(game.blackoutStats.wordsHidden, 1);
assert.equal(second.blackoutHidden, false);

const firstPosition = playArea.children.at(-2);
const firstSeparation = firstPosition.children[0];
const firstVisual = firstSeparation.children[0];
const transformBefore = firstPosition.style.transform;
updateWordElement(first, true);
assert.equal(firstPosition.style.transform, transformBefore);
assert.equal(firstVisual.classList.contains("word-blackout-hidden"), true);
assert.match(firstVisual.html, /opacity:0/);
assert.match(firstVisual.html, /&#9671;/);
assert.match(firstVisual.html, /0 \/ 3/);
assert.equal(firstPosition.attributes["aria-label"], "Hidden incoming word");

const secondPosition = playArea.children.at(-1);
const secondVisual = secondPosition.children[0].children[0];
updateWordElement(second, false);
assert.equal(secondVisual.classList.contains("word-blackout-visible"), true);
assert.match(secondVisual.html, /opacity:1/);
game.elapsedMs = 2800;
updateBlackoutWordState(game, second);
updateWordElement(second, false);
assert.equal(secondVisual.classList.contains("word-blackout-fading"), true);
assert.match(secondVisual.html, /opacity:0.5/);

game = makeGame();
first = addWord(game, {
  id: 1,
  text: "cat",
  x: 30,
  blackoutPhase: "hidden",
  blackoutTextOpacity: 0,
  blackoutHidden: true,
});
second = addWord(game, {
  id: 2,
  text: "car",
  x: 10,
  blackoutPhase: "hidden",
  blackoutTextOpacity: 0,
  blackoutHidden: true,
});
handleGameplayKey(event("c"), game, { strictMode: false, particles: false });
assert.equal(game.targetingState.mode, "ambiguous");
assert.deepEqual(game.targetingState.candidateIds, [second.id, first.id]);
assert.equal(second.typedIndex, 0);
assert.equal(second.blackoutHidden, true);
handleGameplayKey(event("a"), game, { strictMode: false, particles: false });
assert.equal(game.targetingState.mode, "ambiguous");
handleGameplayKey(event("r"), game, { strictMode: false, particles: false });
assert.equal(game.words.includes(second), false);
assert.equal(game.blackoutStats.hiddenWordsCompleted, 1);
assert.equal(game.correctCharacters, 3);
assert.equal(game.combo, 1);
assert.ok(game.score > 0);

const wrongTarget = first;
game.activeTargetId = wrongTarget.id;
const wrong = event("x");
handleGameplayKey(wrong, game, { strictMode: true, particles: false });
assert.equal(wrong.prevented, true);
assert.equal(wrongTarget.blackoutHidden, true);
assert.equal(wrongTarget.typedIndex, 0);
assert.equal(game.combo, 0);
assert.equal(wrongTarget.abandoned, false);

game.combo = 6;
game.activeTargetId = wrongTarget.id;
handleGameplayKey(event("x"), game, { strictMode: false, particles: false });
assert.equal(game.combo, 6);
assert.equal(wrongTarget.blackoutHidden, true);

game.activeTargetId = wrongTarget.id;
game.elapsedMs = 2500;
updateBlackoutWordState(game, wrongTarget);
assert.equal(game.activeTargetId, wrongTarget.id);
assert.equal(wrongTarget.blackoutHidden, true);

appState.save = { settings: { screenShake: false } };
game = makeGame();
first = addWord(game, {
  text: "laser",
  typedIndex: 2,
  blackoutPhase: "fading",
  blackoutTextOpacity: 0.5,
});
game.correctKeystrokes = 2;
game.totalKeystrokes = 2;
processWordCoreArrival(game, first);
processWordCoreArrival(game, first);
assert.equal(game.lives, 2);
assert.equal(game.missedCharacters, 3);
assert.equal(game.blackoutStats.wordsMissedAfterFade, 1);
assert.ok(Math.abs(calculateAccuracy(2, 2, 3) - 40) < 1e-10);

game = makeGame(null);
first = addWord(game, {
  blackoutPhase: "hidden",
  blackoutTextOpacity: 0,
  blackoutHidden: true,
});
game.elapsedMs = 5000;
updateBlackoutWordState(game, first);
assert.equal(first.blackoutPhase, "hidden");
assert.equal(first.blackoutTextOpacity, 0);
assert.equal(first.blackoutHidden, true);
assert.equal(game.blackoutStats, undefined);

const freshGame = makeGame();
assert.deepEqual(freshGame.blackoutStats, {
  wordsHidden: 0,
  hiddenWordsCompleted: 0,
  wordsMissedAfterFade: 0,
});
assert.equal(calculateGrade({
  accuracy: 86.1,
  modifier: BLACKOUT_ID,
  hiddenWordsCompleted: 999,
}), "C");

console.log("Blackout timing, rendering, targeting, scoring, misses, isolation, and reset tests passed.");

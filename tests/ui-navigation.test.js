import assert from "node:assert/strict";
import {
  clearAttemptRuntime,
  getDefaultResultsIndex,
  getResultsActions,
  isResultsInputBlocked,
} from "../js/state.js";

assert.deepEqual(
  getResultsActions({ grade: "A", levelNumber: 20 }),
  ["retry", "next", "levels"],
);
assert.equal(getDefaultResultsIndex({ grade: "A", levelNumber: 20 }), 1);
assert.equal(getDefaultResultsIndex({ grade: "Fail", levelNumber: 20 }), 0);
assert.deepEqual(
  getResultsActions({ grade: "S", levelNumber: 100 }),
  ["retry", "levels"],
);
assert.equal(getDefaultResultsIndex({ grade: "S", levelNumber: 100 }), 1);
assert.equal(isResultsInputBlocked({ repeat: false }, 100, 300), true);
assert.equal(isResultsInputBlocked({ repeat: false }, 300, 300), false);
assert.equal(isResultsInputBlocked({ repeat: true }, 500, 300), true);

const abandonedAttempt = {
  mode: "normal",
  activeTargetId: 2,
  targetingState: {
    mode: "ambiguous",
    prefix: "c",
    candidateIds: [1, 2],
    activeTargetId: null,
  },
  words: [{ id: 1 }],
  wordQueue: ["charge"],
  modifierRuntime: { quickFingers: {} },
  blackoutStats: { wordsHidden: 1 },
  abandonedWordCount: 2,
  abandonedCharacters: 7,
};
clearAttemptRuntime(abandonedAttempt);
assert.equal(abandonedAttempt.activeTargetId, null);
assert.equal(abandonedAttempt.targetingState.mode, "idle");
assert.deepEqual(abandonedAttempt.words, []);
assert.deepEqual(abandonedAttempt.wordQueue, []);
assert.equal(abandonedAttempt.modifierRuntime, null);
assert.equal(abandonedAttempt.blackoutStats, undefined);
assert.equal(abandonedAttempt.abandonedWordCount, 0);

const bossAttempt = {
  mode: "boss",
  phrases: ["one", "two"],
  currentPhrase: "one",
  transitionElapsedMs: 200,
};
clearAttemptRuntime(bossAttempt);
assert.deepEqual(bossAttempt.phrases, []);
assert.equal(bossAttempt.currentPhrase, "");
assert.equal(bossAttempt.transitionElapsedMs, 0);

class ClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  toggle(value, force) { force ? this.add(value) : this.remove(value); }
}
class Button {
  constructor(action) {
    this.dataset = { action };
    this.classList = new ClassList();
  }
}
class Container {
  constructor() {
    this.buttons = [];
    this.children = [];
    this.classList = new ClassList();
  }
  set className(value) { this.name = value; }
  set innerHTML(value) {
    this.html = value;
    this.buttons = [...value.matchAll(/data-action="([^"]+)"/g)]
      .map((match) => new Button(match[1]));
  }
  querySelector(selector) {
    const action = selector.match(/data-action="([^"]+)"/)?.[1];
    return this.buttons.find((button) => button.dataset.action === action) || null;
  }
  querySelectorAll(selector) {
    if (selector === ".arcade-button") return this.buttons;
    return [];
  }
  append(child) { this.children.push(child); }
  remove() {}
}

const app = new Container();
const gameScreen = new Container();
globalThis.document = {
  querySelector(selector) {
    if (selector === "#app") return app;
    if (selector === ".game-screen, .boss-screen") return gameScreen;
    if (selector === ".pause-overlay") return null;
    return null;
  },
  createElement() { return new Container(); },
};

const { showPauseOverlay } = await import("../js/ui.js");
const calls = [];
showPauseOverlay(0, {
  resume: () => calls.push("resume"),
  retry: () => calls.push("retry"),
  levels: () => calls.push("levels"),
  title: () => calls.push("title"),
  select: (index) => calls.push(`select:${index}`),
});
const overlay = gameScreen.children[0];
assert.match(overlay.html, /RESUME/);
assert.match(overlay.html, /RETRY/);
assert.match(overlay.html, /LEVEL SELECT/);
assert.match(overlay.html, /MAIN MENU/);
assert.deepEqual(
  overlay.buttons.map((button) => button.dataset.action),
  ["resume", "retry", "levels", "title"],
);
overlay.buttons[3].onmouseenter();
assert.equal(calls.at(-1), "select:3");
overlay.buttons[3].onclick();
assert.equal(calls.at(-1), "title");

console.log("Pause actions and results default-selection tests passed.");

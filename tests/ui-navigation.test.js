import assert from "node:assert/strict";
import {
  clearAttemptRuntime,
  getDefaultResultsIndex,
  getResultsActions,
  isResultsInputBlocked,
} from "../js/state.js";

assert.deepEqual(getResultsActions({ grade: "A", levelNumber: 20 }), ["retry", "next", "levels"]);
assert.equal(getDefaultResultsIndex({ grade: "A", levelNumber: 20 }), 1);
assert.equal(getDefaultResultsIndex({ grade: "Fail", levelNumber: 20 }), 0);
assert.deepEqual(getResultsActions({ grade: "S", levelNumber: 100 }), ["retry", "levels"]);
assert.equal(isResultsInputBlocked({ repeat: false }, 100, 300), true);
assert.equal(isResultsInputBlocked({ repeat: false }, 300, 300), false);

const normalAttempt = {
  mode: "normal",
  activeTargetId: 2,
  targetingState: { mode: "ambiguous", prefix: "c", candidateIds: [1, 2] },
  words: [{ id: 1 }],
  wordQueue: ["charge"],
};
clearAttemptRuntime(normalAttempt);
assert.equal(normalAttempt.activeTargetId, null);
assert.equal(normalAttempt.targetingState.mode, "idle");
assert.deepEqual(normalAttempt.words, []);
assert.deepEqual(normalAttempt.wordQueue, []);

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
    return selector === ".arcade-button" ? this.buttons : [];
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

const {
  renderGameplayShell,
  renderLevelSelect,
  renderResults,
  showPauseOverlay,
} = await import("../js/ui.js");

const calls = [];
showPauseOverlay(0, {
  resume: () => calls.push("resume"),
  retry: () => calls.push("retry"),
  levels: () => calls.push("levels"),
  title: () => calls.push("title"),
  select: (index) => calls.push(`select:${index}`),
});
const overlay = gameScreen.children[0];
assert.deepEqual(
  overlay.buttons.map((button) => button.dataset.action),
  ["resume", "retry", "levels", "title"],
);

renderResults({
  grade: "Fail",
  wpm: 20,
  accuracy: 50,
  maxCombo: 4,
  score: 120,
  levelNumber: 82,
  isBoss: false,
  livesRemaining: 1,
  startingLives: 3,
}, 0, { retry() {}, next() {}, levels() {} });
assert.match(app.html, /Core breached/);
assert.match(app.html, /Lives/);
assert.doesNotMatch(app.html, /MODIFIER|CHAIN BROKEN|BLACKOUT/);

renderGameplayShell(82, 3, {}, false, {});
assert.match(app.html, /Core integrity/i);
assert.doesNotMatch(app.html, /MODIFIER|CHAIN|BLACKOUT|NO BACKSPACE/);

renderLevelSelect(
  { currentFurthestLevel: 100, levels: {} },
  82,
  false,
  {},
  null,
  { back() {}, select() {} },
);
assert.doesNotMatch(app.html, /Quick Fingers|No Backspace|Blackout|Modifier detected/);

console.log("Pause, ordinary Campaign UI, and Results navigation tests passed.");

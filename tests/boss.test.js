import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  addBossTimeoutMisses,
  createBossGameState,
} from "../js/bossLoop.js";
import { handleBossKey } from "../js/input.js";
import { getBossPhraseSizeClass } from "../js/renderer.js";

class ClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  toggle(value, force) { force ? this.add(value) : this.remove(value); }
  contains(value) { return this.values.has(value); }
}

const phraseElement = {
  innerHTML: "",
  classList: new ClassList(),
};
const progressElement = { style: {} };
const frameElement = { classList: new ClassList(), offsetWidth: 1 };
globalThis.document = {
  querySelector(selector) {
    if (selector === "#boss-phrase") return phraseElement;
    if (selector === "#boss-progress-fill") return progressElement;
    if (selector === ".boss-phrase-frame") return frameElement;
    return null;
  },
};
globalThis.window = { setTimeout() {} };

const inputGame = createBossGameState(
  10,
  { timeLimitSec: 9, totalWordCount: 2 },
  ["quantum vector"],
);
inputGame.phase = "ACTIVE";
let completed = 0;
const press = (key, strictMode = false) => handleBossKey(
  { key, preventDefault() {} },
  inputGame,
  { strictMode },
  () => { completed += 1; },
);

press("q");
const stablePhraseMarkup = phraseElement.innerHTML;
const stableSizeClasses = [...phraseElement.classList.values];
assert.match(stablePhraseMarkup, /boss-word-group/);
assert.match(stablePhraseMarkup, /boss-char/);
assert.match(stablePhraseMarkup, /boss-space/);
assert.match(stablePhraseMarkup, /boss-wrap-opportunity/);
assert.equal(phraseElement.classList.contains("boss-phrase-size-normal"), true);
press("x");
assert.equal(inputGame.combo, 0);
assert.equal(inputGame.totalKeystrokes, 2);
for (const key of "uantum vector") press(key);
assert.equal(completed, 1);
assert.equal(inputGame.combo, 2);
assert.equal(inputGame.correctKeystrokes, "quantum vector".length);
assert.equal(phraseElement.innerHTML, stablePhraseMarkup);
assert.deepEqual([...phraseElement.classList.values], stableSizeClasses);

inputGame.combo = 5;
press("x", true);
assert.equal(inputGame.combo, 0);

const timeoutGame = createBossGameState(
  50,
  { timeLimitSec: 24 },
  ["abstraction biometrics", "configuration methodology"],
);
timeoutGame.phraseCharIndex = 3;
const expectedMisses = (
  timeoutGame.phrases[0].length - 3 + timeoutGame.phrases[1].length
);
assert.equal(addBossTimeoutMisses(timeoutGame), expectedMisses);
assert.equal(addBossTimeoutMisses(timeoutGame), 0);
assert.equal(timeoutGame.missedCharacters, expectedMisses);
assert.deepEqual(timeoutGame.segments, timeoutGame.phrases);

assert.equal(getBossPhraseSizeClass(75), "boss-phrase-size-normal");
assert.equal(getBossPhraseSizeClass(76), "boss-phrase-size-dense");
assert.equal(getBossPhraseSizeClass(111), "boss-phrase-size-extreme");

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
assert.match(css, /\.boss-phrase\s*\{[^}]*min-height:\s*5em/s);
assert.match(css, /\.boss-word-group\s*\{[^}]*white-space:\s*nowrap/s);
assert.match(css, /\.boss-char\s*\{[^}]*width:\s*1ch[^}]*min-width:\s*1ch/s);
assert.match(css, /\.boss-phrase-size-normal/);
assert.match(css, /\.boss-phrase-size-dense/);
assert.match(css, /\.boss-phrase-size-extreme/);
assert.match(css, /\.boss-phrase\s*\{[^}]*overflow:\s*visible/s);
assert.doesNotMatch(css, /\.boss-typed\s*\{[^}]*font-(?:size|weight)/s);

console.log("Boss input, timeout accounting, immutable markup, and stable sizing tests passed.");

import assert from "node:assert/strict";
import { generateBossLevel, generateLevel } from "../js/levelGenerator.js";
import {
  loadBossPhraseBank,
  selectBossPhrases,
} from "../js/wordBank.js";
import { readFile } from "node:fs/promises";

const expected = {
  10: [1, 3, 59.5],
  20: [1, 4, 59],
  30: [1, 4, 58.5],
  40: [1, 5, 58],
  50: [2, 5, 57.5],
  60: [2, 6, 57],
  70: [2, 6, 56.5],
  80: [2, 7, 56],
  90: [2, 7, 55.5],
  100: [3, 8, 55],
};
for (const [level, values] of Object.entries(expected)) {
  const config = generateBossLevel(Number(level));
  assert.deepEqual(
    [config.phraseCount, config.wordsPerPhrase, config.timeLimitSec],
    values,
  );
}
assert.equal(generateLevel(10).spawnIntervalMs, 1560);
assert.equal(generateLevel(100).wordSpeedPxPerSec, 90);

const sourceBank = JSON.parse(await readFile(new URL("../data/bossPhrases.json", import.meta.url), "utf8"));
const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  async json() { return sourceBank; },
});
const bank = await loadBossPhraseBank();
assert.ok(bank.phrases.length >= 100);
for (const level of [10, 50, 100]) {
  const config = generateBossLevel(level);
  const first = selectBossPhrases(bank, config, 12345);
  const second = selectBossPhrases(bank, config, 12345);
  assert.deepEqual(first, second);
  assert.equal(first.length, config.phraseCount);
  assert.equal(new Set(first).size, first.length);
  assert.ok(first.every((phrase) => phrase.split(" ").length === config.wordsPerPhrase));
}

globalThis.fetch = async () => { throw new Error("offline"); };
const fallback = await loadBossPhraseBank();
globalThis.fetch = realFetch;
assert.ok(fallback.phrases.length > 0);

class ClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  toggle(value, force) { force ? this.add(value) : this.remove(value); }
}
const phraseElement = { innerHTML: "" };
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

const { handleBossKey } = await import("../js/input.js");
const { createBossGameState, addBossTimeoutMisses } = await import("../js/bossLoop.js");
const inputGame = createBossGameState(
  10,
  { timeLimitSec: 59.5 },
  ["go now"],
);
inputGame.phase = "ACTIVE";
let completed = 0;
const press = (key, strictMode = false) => handleBossKey(
  { key, preventDefault() {} },
  inputGame,
  { strictMode },
  () => { completed += 1; },
);

press("g");
const stablePhraseMarkup = phraseElement.innerHTML;
assert.match(stablePhraseMarkup, /boss-word-group/);
assert.match(stablePhraseMarkup, /boss-char/);
assert.match(stablePhraseMarkup, /boss-space/);
assert.match(stablePhraseMarkup, /boss-wrap-opportunity/);
press("x");
assert.equal(inputGame.combo, 0);
assert.equal(inputGame.totalKeystrokes, 2);
press("o");
assert.equal(phraseElement.innerHTML, stablePhraseMarkup);
press(" ");
assert.equal(phraseElement.innerHTML, stablePhraseMarkup);
assert.equal(inputGame.combo, 1);
for (const key of "now") press(key);
assert.equal(completed, 1);
assert.equal(inputGame.combo, 2);
assert.equal(inputGame.correctKeystrokes, 6);

inputGame.combo = 5;
press("x", true);
assert.equal(inputGame.combo, 0);

const timeoutGame = createBossGameState(
  50,
  { timeLimitSec: 57.5 },
  ["alpha beta", "gamma ray"],
);
timeoutGame.phraseCharIndex = 3;
assert.equal(addBossTimeoutMisses(timeoutGame), 16);
assert.equal(addBossTimeoutMisses(timeoutGame), 0);
assert.equal(timeoutGame.missedCharacters, 16);

console.log("Boss generation, phrase selection, fallback, input, and timeout tests passed.");

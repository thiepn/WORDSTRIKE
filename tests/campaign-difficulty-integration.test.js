import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateLevel } from "../js/levelGenerator.js";
import {
  BLACKOUT_ID,
  CHAIN_ID,
  NO_BACKSPACE_ID,
  QUICK_FINGERS_ID,
} from "../js/modifiers.js";
import { createNormalWordAttempt } from "../js/wordBank.js";

const wordBank = JSON.parse(
  await readFile(new URL("../data/theme-default.json", import.meta.url), "utf8"),
);

const modifierExpectations = new Map([
  [22, QUICK_FINGERS_ID],
  [27, QUICK_FINGERS_ID],
  [32, QUICK_FINGERS_ID],
  [37, QUICK_FINGERS_ID],
  [42, NO_BACKSPACE_ID],
  [47, QUICK_FINGERS_ID],
  [52, NO_BACKSPACE_ID],
  [57, QUICK_FINGERS_ID],
  [62, BLACKOUT_ID],
  [67, QUICK_FINGERS_ID],
  [72, NO_BACKSPACE_ID],
  [77, BLACKOUT_ID],
  [82, CHAIN_ID],
  [87, NO_BACKSPACE_ID],
  [92, BLACKOUT_ID],
  [97, QUICK_FINGERS_ID],
]);
for (const [level, modifier] of modifierExpectations) {
  assert.deepEqual(generateLevel(level).modifiers, [modifier]);
}

for (const level of [1, 5, 8, 9, 11, 22, 42, 62, 82, 97, 99]) {
  const config = generateLevel(level);
  for (let seed = 1; seed <= 50; seed += 1) {
    const attempt = createNormalWordAttempt(wordBank, config, seed);
    const repeat = createNormalWordAttempt(wordBank, config, seed);
    assert.deepEqual(attempt, repeat);
    assert.equal(attempt.selectedWords.length, config.wordCount);
    assert.equal(new Set(attempt.selectedWords).size, attempt.selectedWords.length);
    assert.ok(attempt.selectedWords.every(
      (word) => word.length >= config.minWordLength
        && word.length <= config.maxWordLength,
    ));
    assert.deepEqual(
      [...attempt.spawnQueue].sort(),
      [...attempt.selectedWords].sort(),
    );
  }
}

const lateConfig = generateLevel(99);
const lateAttempt = createNormalWordAttempt(wordBank, lateConfig, 12345);
const lateLengths = lateAttempt.selectedWords.map((word) => word.length);
assert.ok(lateLengths.some((length) => length < lateConfig.targetAverageWordLength));
assert.ok(lateLengths.some((length) => length >= lateConfig.targetAverageWordLength));
assert.ok(Math.max(...lateLengths) <= 11);

const sourceFiles = await Promise.all([
  "js/main.js",
  "js/gameLoop.js",
  "js/input.js",
  "js/modifiers.js",
].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
assert.equal(sourceFiles.some((source) => source.includes("setInterval(")), false);
assert.equal(sourceFiles[0].split('addEventListener("keydown"').length - 1, 1);

console.log("Campaign weighted words, modifiers, seeded retries, and loop isolation tests passed.");

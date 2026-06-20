import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateLevel } from "../js/levelGenerator.js";
import { createNormalWordAttempt } from "../js/wordBank.js";

const wordBank = JSON.parse(
  await readFile(new URL("../data/theme-default.json", import.meta.url), "utf8"),
);

for (const level of [22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 77, 82, 87, 92, 97]) {
  assert.equal("modifiers" in generateLevel(level), false);
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
].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
assert.equal(sourceFiles.some((source) => source.includes("setInterval(")), false);
assert.equal(sourceFiles[0].split('addEventListener("keydown"').length - 1, 1);

console.log("Campaign weighted words, ordinary former modifier levels, seeded retries, and loop isolation passed.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  calculateBossTiming,
  generateBossLevel,
  generateLevel,
} from "../js/levelGenerator.js";
import {
  createNormalWordAttempt,
  selectBossPhrases,
} from "../js/wordBank.js";
import {
  createAttemptSeed,
  createSeededRandom,
  parseDeveloperSeed,
  shuffleSeeded,
} from "../js/random.js";

const wordBank = JSON.parse(
  await readFile(new URL("../data/theme-default.json", import.meta.url), "utf8"),
);
const bossBank = JSON.parse(
  await readFile(new URL("../data/bossPhrases.json", import.meta.url), "utf8"),
);

const normalConfig = generateLevel(67);
const first = createNormalWordAttempt(wordBank, normalConfig, 12345);
const repeat = createNormalWordAttempt(wordBank, normalConfig, 12345);
const different = createNormalWordAttempt(wordBank, normalConfig, 54321);
assert.deepEqual(first, repeat);
assert.ok(
  first.selectedWords.join("|") !== different.selectedWords.join("|") ||
  first.spawnQueue.join("|") !== different.spawnQueue.join("|"),
);
assert.equal(first.selectedWords.length, normalConfig.wordCount);
assert.equal(first.spawnQueue.length, normalConfig.wordCount);
assert.equal(new Set(first.selectedWords).size, first.selectedWords.length);
assert.ok(first.selectedWords.every((word) => /^[a-z]+$/.test(word)));
assert.ok(first.selectedWords.every((word) => (
  word.length >= normalConfig.minWordLength &&
  word.length <= normalConfig.maxWordLength
)));
assert.deepEqual(
  [...first.spawnQueue].sort(),
  [...first.selectedWords].sort(),
);

const shuffled = shuffleSeeded(["a", "b", "c", "d"], 99);
assert.deepEqual(shuffled, shuffleSeeded(["a", "b", "c", "d"], 99));
assert.notDeepEqual(shuffled, shuffleSeeded(["a", "b", "c", "d"], 100));
const random = createSeededRandom(123);
assert.deepEqual(
  [random(), random(), random()],
  (() => {
    const again = createSeededRandom(123);
    return [again(), again(), again()];
  })(),
);
assert.equal(parseDeveloperSeed("?dev=1&seed=12345"), 12345);
assert.equal(parseDeveloperSeed("?dev=1&seed=bad"), null);
assert.ok(Number.isInteger(createAttemptSeed()));
assert.ok(new Set(Array.from({ length: 8 }, createAttemptSeed)).size > 1);

let bossSeedsDiffer = false;
for (const level of [10, 50, 100]) {
  const config = generateBossLevel(level);
  const phrases = selectBossPhrases(bossBank, config, 12345);
  const repeatPhrases = selectBossPhrases(bossBank, config, 12345);
  const differentPhrases = selectBossPhrases(bossBank, config, 54321);
  assert.deepEqual(phrases, repeatPhrases);
  assert.equal(phrases.length, config.phraseCount);
  assert.equal(new Set(phrases).size, phrases.length);
  assert.ok(phrases.every(
    (phrase) => phrase.split(" ").length === config.wordsPerPhrase,
  ));
  bossSeedsDiffer ||= phrases.join("|") !== differentPhrases.join("|");
  const timing = calculateBossTiming(level, phrases);
  assert.equal(
    timing.totalRequiredCharacters,
    phrases.reduce((sum, phrase) => sum + phrase.length, 0),
  );
  assert.ok(timing.effectiveTimeLimitSec >= 12);
  assert.ok(timing.effectiveTimeLimitSec <= 38);
  assert.ok(timing.effectiveTimeLimitSec < config.timeLimitSec);
}
assert.equal(bossSeedsDiffer, true);

const shortTiming = calculateBossTiming(50, ["short words"]);
const longTiming = calculateBossTiming(50, ["a considerably longer phrase with spaces"]);
assert.ok(longTiming.effectiveTimeLimitSec > shortTiming.effectiveTimeLimitSec);
assert.equal(calculateBossTiming(10, ["a"]).effectiveTimeLimitSec, 12);
assert.equal(
  calculateBossTiming(100, ["x".repeat(1000)]).effectiveTimeLimitSec,
  38,
);

console.log("Attempt seed, normal variation, boss variation, and content timing tests passed.");

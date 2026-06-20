import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BOSS_BANNED_WORDS,
  MAX_BOSS_GENERATION_ATTEMPTS,
  areBossWordsRootSimilar,
  calculateBossTiming,
  generateBossEncounter,
  getBossDifficultyProfile,
  validateBossEncounter,
} from "../js/bossGenerator.js";
import { generateBossLevel, generateLevel } from "../js/levelGenerator.js";

const bank = JSON.parse(
  await readFile(new URL("../data/bossWords.json", import.meta.url), "utf8"),
);
const expected = {
  10: [1, 4, 6, 7.5, 9, 55],
  20: [1, 5, 7, 8.5, 10, 60],
  30: [2, 4, 7, 9.0, 11, 65],
  40: [2, 5, 8, 9.8, 12, 70],
  50: [2, 6, 8, 10.5, 13, 75],
  60: [3, 5, 9, 11.2, 14, 80],
  70: [3, 6, 9, 12.0, 15, 85],
  80: [3, 6, 10, 12.8, 16, 90],
  90: [3, 7, 10, 13.5, 17, 95],
  100: [3, 8, 11, 14.2, 18, 100],
};

for (const [levelText, values] of Object.entries(expected)) {
  const level = Number(levelText);
  const profile = getBossDifficultyProfile(level);
  assert.deepEqual(
    [
      profile.segmentCount,
      profile.wordsPerSegment,
      profile.minimumWordLength,
      profile.requiredAverageWordLength,
      profile.minimumLongestWord,
      profile.targetWPM,
    ],
    values,
  );
  assert.equal(profile.totalWordCount, values[0] * values[1]);
  const compatibility = generateBossLevel(level);
  assert.equal(compatibility.phraseCount, profile.segmentCount);
  assert.equal(compatibility.wordsPerPhrase, profile.wordsPerSegment);
  assert.equal(compatibility.modifiers, undefined);
}
for (const invalid of [0, 9, 11, 55, 110, NaN, "10", null]) {
  assert.equal(getBossDifficultyProfile(invalid), null);
  assert.equal(generateBossLevel(invalid), null);
}

let differentSeeds = 0;
for (let level = 10; level <= 100; level += 10) {
  const profile = getBossDifficultyProfile(level);
  const firstSeedText = generateBossEncounter(bank, level, 1).segments.join("|");
  for (let seed = 1; seed <= 50; seed += 1) {
    const encounter = generateBossEncounter(bank, level, seed);
    const repeat = generateBossEncounter(bank, level, seed);
    assert.deepEqual(encounter, repeat);
    assert.equal(encounter.fallbackUsed, false);
    assert.ok(encounter.generationAttempt <= MAX_BOSS_GENERATION_ATTEMPTS);
    const validation = validateBossEncounter(encounter.segments, profile);
    assert.equal(validation.valid, true, `level ${level}, seed ${seed}: ${validation.errors.join("; ")}`);
    assert.equal(encounter.segments.length, profile.segmentCount);
    assert.ok(encounter.segments.every(
      (segment) => segment.split(" ").length === profile.wordsPerSegment,
    ));
    assert.equal(encounter.words.length, profile.totalWordCount);
    assert.equal(new Set(encounter.words).size, encounter.words.length);
    assert.ok(encounter.words.every((word) => (
      word.length >= profile.minimumWordLength &&
      !BOSS_BANNED_WORDS.has(word)
    )));
    for (let first = 0; first < encounter.words.length; first += 1) {
      for (let second = first + 1; second < encounter.words.length; second += 1) {
        assert.equal(
          areBossWordsRootSimilar(encounter.words[first], encounter.words[second]),
          false,
          `${encounter.words[first]} ~ ${encounter.words[second]}`,
        );
      }
    }
    const segmentAverages = encounter.segments.map((segment) => {
      const words = segment.split(" ");
      return words.reduce((sum, word) => sum + word.length, 0) / words.length;
    });
    assert.ok(Math.max(...segmentAverages) - Math.min(...segmentAverages) <= 2);
  }
  const anotherSeedText = generateBossEncounter(bank, level, 987654).segments.join("|");
  if (firstSeedText !== anotherSeedText) differentSeeds += 1;
}
assert.ok(differentSeeds >= 9);

const early = generateBossEncounter(bank, 10, 12345);
const late = generateBossEncounter(bank, 100, 12345);
assert.equal(early.metrics.totalWordCount, 4);
assert.equal(late.metrics.totalWordCount, 24);
assert.ok(late.metrics.averageSelectedWordLength > early.metrics.averageSelectedWordLength);
assert.ok(late.metrics.totalRequiredCharacters > early.metrics.totalRequiredCharacters);
assert.ok(late.profile.minimumWordLength > early.profile.minimumWordLength);
assert.ok(late.profile.targetWPM > early.profile.targetWPM);
assert.ok(late.words.every((word) => word.length >= 11));

const fixedSeedRanges = {
  10: [9, 11],
  20: [9, 13],
  30: [14, 18],
  40: [18, 22],
  50: [22, 27],
  60: [27, 33],
  70: [33, 39],
  80: [34, 40],
  90: [39, 46],
  100: [44, 50],
};
for (const [levelText, [minimum, maximum]] of Object.entries(fixedSeedRanges)) {
  const encounter = generateBossEncounter(bank, Number(levelText), 12345);
  assert.ok(encounter.timing.effectiveTimeLimitSec >= minimum);
  assert.ok(encounter.timing.effectiveTimeLimitSec <= maximum);
  const expectedIdeal = (
    ((encounter.metrics.totalRequiredCharacters / 5) / encounter.profile.targetWPM) * 60
  );
  const expectedAllowance = (encounter.profile.segmentCount - 1) * 0.35;
  const expectedTime = Math.max(9, Math.min(50, expectedIdeal * 1.08 + expectedAllowance));
  assert.equal(encounter.timing.idealTypingSeconds, expectedIdeal);
  assert.equal(encounter.timing.transitionAllowanceSeconds, expectedAllowance);
  assert.equal(encounter.timing.effectiveTimeLimitSec, expectedTime);
}
assert.equal(calculateBossTiming(10, ["a"]).effectiveTimeLimitSec, 9);
assert.equal(calculateBossTiming(100, ["x".repeat(1000)]).effectiveTimeLimitSec, 50);
assert.ok(late.timing.effectiveTimeLimitSec > 38);

const sparseBank = {
  words: [{ word: "configuration", tier: 5 }],
};
const hardFallback = generateBossEncounter(sparseBank, 100, 12345);
assert.equal(hardFallback.fallbackUsed, true);
assert.equal(validateBossEncounter(
  hardFallback.segments,
  getBossDifficultyProfile(100),
).valid, true);

assert.equal(generateLevel(10).spawnIntervalMs, 1560);
assert.equal(generateLevel(100).wordSpeedPxPerSec, 90);

const sourceFiles = await Promise.all([
  "js/main.js", "js/gameLoop.js", "js/bossLoop.js", "js/input.js",
].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
assert.equal(sourceFiles.some((source) => source.includes("setInterval(")), false);
assert.equal(sourceFiles[0].split('addEventListener("keydown"').length - 1, 1);
assert.equal(sourceFiles[0].includes("bossPhrases.json"), false);

console.log("Boss profiles, 500 seeded encounters, progression, timing, and fallback tests passed.");

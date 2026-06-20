import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BOSS_WORD_TIERS,
  buildBossWordPools,
  calculateBossTiming,
  generateBossEncounter,
  getBossDifficultyProfile,
  getBossWordTier,
  validateBossEncounter,
} from "../js/bossGenerator.js";
import { generateBossLevel, generateLegacyLevel } from "../js/levelGenerator.js";

const typing = JSON.parse(
  await readFile(new URL("../data/typingTestWords.json", import.meta.url), "utf8"),
);
const long = JSON.parse(
  await readFile(new URL("../data/bossCommonLongWords.json", import.meta.url), "utf8"),
);
const source = {
  pools: buildBossWordPools({ typingWords: typing.words, longWords: long.words }),
};
const expected = {
  10: [1, 5, 33, 40],
  20: [1, 6, 47, 60],
  30: [2, 5, 78, 65],
  40: [2, 7, 106, 70],
  50: [2, 8, 136, 75],
  60: [3, 7, 180, 80],
  70: [3, 9, 231, 85],
  80: [3, 10, 246, 90],
  90: [3, 11, 302, 95],
  100: [3, 12, 362, 100],
};

let distinctBosses = 0;
for (const [levelText, values] of Object.entries(expected)) {
  const level = Number(levelText);
  const [segmentCount, wordsPerSegment, targetCharacters, targetWPM] = values;
  const profile = getBossDifficultyProfile(level);
  assert.deepEqual(
    [profile.segmentCount, profile.wordsPerSegment, profile.targetCharacters, profile.targetWPM],
    values,
  );
  assert.equal(profile.totalWordCount, segmentCount * wordsPerSegment);
  const compatibility = generateBossLevel(level);
  assert.equal(compatibility.phraseCount, segmentCount);
  assert.equal(compatibility.wordsPerPhrase, wordsPerSegment);

  const totals = [];
  const timers = [];
  const firstText = generateBossEncounter(source, level, 1).segments.join("|");
  for (let seed = 1; seed <= 50; seed += 1) {
    const encounter = generateBossEncounter(source, level, seed);
    assert.deepEqual(encounter, generateBossEncounter(source, level, seed));
    const validation = validateBossEncounter(encounter.segments, profile);
    assert.equal(validation.valid, true, validation.errors.join("; "));
    assert.equal(encounter.segments.length, segmentCount);
    assert.ok(encounter.segments.every(
      (segment) => segment.split(" ").length === wordsPerSegment,
    ));
    assert.equal(new Set(encounter.words).size, encounter.words.length);
    assert.ok(encounter.words.every((word) => word.length <= 15));
    for (const segment of encounter.segments) {
      const tiers = segment.split(" ").map(getBossWordTier);
      assert.ok(tiers.includes(BOSS_WORD_TIERS.SHORT));
      assert.ok(tiers.includes(BOSS_WORD_TIERS.MEDIUM));
      if (level >= 30) assert.ok(tiers.includes(BOSS_WORD_TIERS.LONG));
      if (level >= 50) assert.ok(tiers.includes(BOSS_WORD_TIERS.VERY_LONG));
      assert.doesNotMatch(tiers.join(","), /very-long,very-long,very-long/);
    }
    assert.equal(encounter.metrics.totalRequiredCharacters, targetCharacters);
    assert.equal(encounter.timing.totalRequiredCharacters, targetCharacters);
    assert.equal(encounter.profile.targetWPM, targetWPM);
    const ideal = ((targetCharacters / 5) / targetWPM) * 60;
    const allowance = (segmentCount - 1) * 0.35;
    assert.equal(encounter.timing.idealTypingSeconds, ideal);
    assert.equal(encounter.timing.transitionAllowanceSeconds, allowance);
    assert.equal(
      encounter.timing.effectiveTimeLimitSec,
      Math.max(9, Math.min(50, ideal * 1.08 + allowance)),
    );
    totals.push(encounter.metrics.totalRequiredCharacters);
    timers.push(encounter.timing.effectiveTimeLimitSec);
  }
  assert.deepEqual([...new Set(totals)], [targetCharacters]);
  const sorted = [...totals].sort((a, b) => a - b);
  assert.equal(sorted[0], targetCharacters);
  assert.equal(sorted.at(-1), targetCharacters);
  assert.equal((sorted[24] + sorted[25]) / 2, targetCharacters);
  assert.ok(timers.every(Number.isFinite));
  if (generateBossEncounter(source, level, 987654).segments.join("|") !== firstText) {
    distinctBosses += 1;
  }
}
assert.ok(distinctBosses >= 9);

for (const invalid of [0, 9, 11, 55, 110, NaN, "10", null]) {
  assert.equal(getBossDifficultyProfile(invalid), null);
  assert.equal(generateBossLevel(invalid), null);
}
assert.equal(calculateBossTiming(10, ["a"]).effectiveTimeLimitSec, 9);
assert.equal(calculateBossTiming(100, ["x".repeat(1000)]).effectiveTimeLimitSec, 50);
assert.equal(generateLegacyLevel(10).spawnIntervalMs, 1560);
assert.equal(generateLegacyLevel(100).wordSpeedPxPerSec, 90);

const sourceFiles = await Promise.all([
  "js/main.js", "js/gameLoop.js", "js/bossLoop.js", "js/input.js",
].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
assert.equal(sourceFiles.some((text) => text.includes("setInterval(")), false);
assert.equal(sourceFiles[0].split('addEventListener("keydown"').length - 1, 1);

console.log("Boss profiles, 500 mixed-tier encounters, exact budgets, timing, and determinism passed.");

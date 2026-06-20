import assert from "node:assert/strict";
import {
  generateLegacyLevel,
  generateLevel,
} from "../js/levelGenerator.js";

const pressureFields = [
  "minWordLength",
  "maxWordLength",
  "targetAverageWordLength",
  "spawnIntervalMs",
  "wordSpeedPxPerSec",
  "maxSimultaneousWords",
  "targetWPM",
  "wordTier",
];

const equivalentLevels = [
  [1, 1],
  [3, 4],
  [5, 8],
  [6, 12],
  [8, 18],
  [9, 23],
  [11, 30],
  [15, 35],
  [20, 40],
  [30, 50],
  [40, 58],
  [50, 65],
  [60, 70],
  [70, 76],
  [80, 84],
  [90, 92],
  [99, 100],
];

for (const [actualLevel, legacyLevel] of equivalentLevels) {
  const remapped = generateLevel(actualLevel);
  const legacy = generateLegacyLevel(legacyLevel);
  for (const field of pressureFields) {
    assert.equal(
      remapped[field],
      legacy[field],
      `L${actualLevel} ${field} should match legacy L${legacyLevel}`,
    );
  }
}

for (const level of [1, 5, 9, 11, 20, 30, 60, 70, 90, 99]) {
  assert.equal(generateLevel(level).wordCount, generateLegacyLevel(level).wordCount);
}
assert.notEqual(generateLevel(11).wordCount, generateLegacyLevel(30).wordCount);

const legacyMaximum = generateLegacyLevel(100);
const level99 = generateLevel(99);
assert.ok(level99.wordSpeedPxPerSec <= legacyMaximum.wordSpeedPxPerSec);
assert.ok(level99.spawnIntervalMs >= legacyMaximum.spawnIntervalMs);
assert.ok(level99.maxSimultaneousWords <= legacyMaximum.maxSimultaneousWords);
assert.ok(level99.maxWordLength <= legacyMaximum.maxWordLength);
assert.ok(level99.wordTier <= legacyMaximum.wordTier);

let previous = generateLevel(1);
for (let level = 2; level <= 99; level += 1) {
  if (level % 10 === 0) continue;
  const current = generateLevel(level);
  assert.ok(current.wordSpeedPxPerSec >= previous.wordSpeedPxPerSec);
  assert.ok(current.spawnIntervalMs <= previous.spawnIntervalMs);
  assert.ok(current.maxSimultaneousWords >= previous.maxSimultaneousWords);
  assert.ok(current.minWordLength >= previous.minWordLength);
  assert.ok(current.maxWordLength >= previous.maxWordLength);
  assert.ok(current.wordTier >= previous.wordTier);
  previous = current;
}

assert.ok(generateLevel(5).wordSpeedPxPerSec < generateLevel(6).wordSpeedPxPerSec);
assert.ok(generateLevel(9).wordSpeedPxPerSec < generateLevel(11).wordSpeedPxPerSec);
assert.ok(generateLevel(9).spawnIntervalMs > generateLevel(11).spawnIntervalMs);

console.log("Campaign legacy equivalence, word-count isolation, caps, and pressure tests passed.");

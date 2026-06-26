import assert from "node:assert/strict";
import {
  ENDLESS_CONFIG,
  getEndlessWordsPerStage,
  isStandardEndlessConfiguration,
} from "../js/endlessConfig.js";
import {
  getEndlessActiveWordCap,
  getEndlessDifficulty,
  estimateRequiredWpm,
} from "../js/endlessDifficulty.js";

assert.equal(ENDLESS_CONFIG.startingIntegrity, 3);
assert.deepEqual(
  [1, 5, 6, 10, 11, 50].map(getEndlessWordsPerStage),
  [10, 10, 15, 15, 20, 20],
);
assert.equal(getEndlessWordsPerStage(0), 10);
assert.equal(getEndlessWordsPerStage(Number.NaN), 10);
assert.equal(getEndlessDifficulty(1).movementMultiplier, 0.7);
assert.equal(getEndlessDifficulty(10).movementMultiplier, 1);
assert.equal(getEndlessDifficulty(11).movementMultiplier, 1);
assert.equal(getEndlessDifficulty(1).spawnIntervalMs, 1700);
assert.equal(getEndlessDifficulty(2).spawnIntervalMs, 1564);
assert.equal(getEndlessDifficulty(10).spawnIntervalMs, 803);
assert.equal(getEndlessDifficulty(20).spawnIntervalMs, 803);
assert.equal(getEndlessDifficulty(100).spawnIntervalMs, 803);
assert.deepEqual(
  [1, 3, 5, 8, 12, 18, 25].map(getEndlessActiveWordCap),
  [3, 4, 5, 6, 7, 8, 9],
);
assert.equal(getEndlessDifficulty(0).stage, 1);
assert.equal(getEndlessDifficulty(31).maximumWordLength, 14);
const stage10 = getEndlessDifficulty(10);
const stage20 = getEndlessDifficulty(20);
const stage25 = getEndlessDifficulty(25);
const estimate = (profile, interval = profile.spawnIntervalMs) => estimateRequiredWpm({
  targetAverageWordLength: profile.targetAverageLength,
  spawnIntervalMs: interval,
});
assert.ok(estimate(stage10) >= 80 && estimate(stage10) <= 95);
assert.ok(estimate(stage20) >= 90 && estimate(stage20) <= 105);
assert.ok(estimate(stage20) < 120);
assert.ok(estimate(stage25) <= 120);
assert.equal(getEndlessDifficulty(10).movementSpeed, getEndlessDifficulty(100).movementSpeed);
assert.equal(isStandardEndlessConfiguration({
  startStage: 1,
  maximumStages: null,
  recordEligible: true,
}), true);
assert.equal(isStandardEndlessConfiguration({
  startStage: 20,
  maximumStages: null,
  recordEligible: true,
}), false);

console.log("Endless standardized configuration and unchanged capped difficulty tests passed.");

import assert from "node:assert/strict";
import { ENDLESS_CONFIG, isStandardEndlessConfiguration } from "../js/endlessConfig.js";
import {
  getEndlessActiveWordCap,
  getEndlessDifficulty,
  getEndlessQuickFingersInterval,
} from "../js/endlessDifficulty.js";
import {
  getEndlessModifierForStage,
} from "../js/endlessModifiers.js";
import {
  BLACKOUT_ID,
  NO_BACKSPACE_ID,
  QUICK_FINGERS_ID,
} from "../js/modifiers.js";

assert.equal(ENDLESS_CONFIG.startingIntegrity, 3);
assert.equal(ENDLESS_CONFIG.wordsPerStage, 20);
assert.equal(getEndlessDifficulty(1).movementMultiplier, 0.7);
assert.equal(getEndlessDifficulty(10).movementMultiplier, 1);
assert.equal(getEndlessDifficulty(11).movementMultiplier, 1);
assert.equal(getEndlessDifficulty(1).spawnIntervalMs, 1700);
assert.equal(getEndlessDifficulty(2).spawnIntervalMs, 1564);
assert.equal(getEndlessDifficulty(100).spawnIntervalMs, 600);
assert.equal(getEndlessQuickFingersInterval(100), 320);
assert.deepEqual(
  [1, 3, 5, 8, 12, 18, 25].map(getEndlessActiveWordCap),
  [3, 4, 5, 6, 7, 8, 9],
);
assert.equal(getEndlessDifficulty(0).stage, 1);
assert.equal(getEndlessDifficulty(31).maximumWordLength, 14);
assert.equal(getEndlessModifierForStage({ stage: 5, seed: 1 }), QUICK_FINGERS_ID);
assert.equal(getEndlessModifierForStage({ stage: 10, seed: 1 }), NO_BACKSPACE_ID);
assert.equal(getEndlessModifierForStage({ stage: 15, seed: 1 }), BLACKOUT_ID);
assert.equal(getEndlessModifierForStage({ stage: 16, seed: 1 }), null);
const first = getEndlessModifierForStage({ stage: 20, seed: 123 });
assert.equal(first, getEndlessModifierForStage({ stage: 20, seed: 123 }));
assert.notEqual(
  getEndlessModifierForStage({ stage: 25, seed: 123, previousModifier: first }),
  first,
);
assert.equal(isStandardEndlessConfiguration({
  startStage: 1,
  maximumStages: null,
  modifierSchedule: null,
  forcedModifier: null,
  recordEligible: true,
}), true);
assert.equal(isStandardEndlessConfiguration({
  startStage: 20,
  maximumStages: null,
  modifierSchedule: null,
  forcedModifier: null,
  recordEligible: true,
}), false);

console.log("Endless standardized configuration, capped difficulty, and modifier schedule tests passed.");

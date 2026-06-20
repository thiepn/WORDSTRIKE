import assert from "node:assert/strict";
import {
  calculateEndlessScore,
  calculateEndlessStageBonus,
  calculateEndlessSurvivalPoints,
  calculateEndlessWordPoints,
  getPerfectStreakBonus,
  getSurvivalComboBonus,
  getWordScoreMultiplier,
} from "../js/endlessScoring.js";

assert.equal(getSurvivalComboBonus(9), 0);
assert.equal(getSurvivalComboBonus(10), 0.02);
assert.equal(getSurvivalComboBonus(25), 0.04);
assert.equal(getSurvivalComboBonus(50), 0.06);
assert.equal(getPerfectStreakBonus(4), 0);
assert.equal(getPerfectStreakBonus(5), 0.03);
assert.equal(getPerfectStreakBonus(10), 0.06);
assert.equal(getPerfectStreakBonus(20), 0.09);
assert.equal(getPerfectStreakBonus(40), 0.12);
assert.equal(getWordScoreMultiplier(999, 999), 1.18);
assert.equal(calculateEndlessSurvivalPoints(60000), 6000);
assert.equal(calculateEndlessStageBonus(10), 2500);
assert.equal(calculateEndlessWordPoints(1, 5, 0, 0), 98);
assert.equal(calculateEndlessScore(60000, 1000, 250), 7250);
assert.equal(Number.isInteger(calculateEndlessWordPoints(25, 12, 50, 40)), true);

console.log("Endless survival, word, stage, combo, and perfect-streak scoring tests passed.");

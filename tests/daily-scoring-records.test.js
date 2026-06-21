import assert from "node:assert/strict";
import {
  calculateDailyFinalScore,
  calculateDailySuccessBonuses,
  calculateDailyWordPoints,
  getDailyComboMultiplier,
} from "../js/dailyScoring.js";
import {
  compareDailyResults,
  createDefaultDailyRecords,
  updateDailyRecords,
} from "../js/dailyRecords.js";

assert.deepEqual([0, 9, 10, 19, 20, 39, 40].map(getDailyComboMultiplier), [
  1, 1, 1.05, 1.05, 1.10, 1.10, 1.15,
]);
assert.equal(calculateDailyWordPoints(5, 1, 0), 150);
assert.equal(calculateDailyWordPoints(7, 3, 40), Math.round(210 * 1.15));
assert.deepEqual(calculateDailySuccessBonuses({
  integrityRemaining: 2,
  accuracy: 95,
  activeDurationMs: 90000,
}), {
  completion: 10000,
  integrity: 4000,
  accuracy: 1900,
  time: 2500,
  total: 18400,
});
assert.equal(calculateDailyFinalScore({ wordPoints: 500, success: false }).total, 500);

const success = {
  success: true, score: 100, activeDurationMs: 5000, accuracy: 90,
  wordsCompleted: 60, wordsResolved: 60, endedAt: 2,
};
assert.equal(compareDailyResults(success, { ...success, success: false, score: 99999 }), 1);
assert.equal(compareDailyResults(success, { ...success, score: 99 }), 1);
assert.equal(compareDailyResults(success, { ...success, activeDurationMs: 6000 }), 1);
const failure = {
  success: false, score: 500, activeDurationMs: 5000, accuracy: 80,
  wordsCompleted: 20, wordsResolved: 25, endedAt: 2,
};
assert.equal(compareDailyResults(failure, { ...failure, wordsResolved: 24, score: 999 }), 1);
assert.equal(compareDailyResults(failure, { ...failure, activeDurationMs: 4000 }), 1);

const result = (dateKey, id, overrides = {}) => ({
  sessionId: id,
  endedAt: Number(id.replace(/\D/g, "")) || 1,
  success: true,
  score: 100,
  activeDurationMs: 1000,
  accuracy: 100,
  words: { completed: 60, total: 60 },
  modeData: { dateKey, wordsCompleted: 60, wordsResolved: 60, integrityRemaining: 1 },
  ...overrides,
});
let records = updateDailyRecords(createDefaultDailyRecords(), result("2026-06-20", "s1"));
records = updateDailyRecords(records, result("2026-06-21", "s2"));
assert.equal(records.currentStreak, 2);
assert.equal(records.bestStreak, 2);
records = updateDailyRecords(records, result("2026-06-21", "s3", { score: 90 }));
assert.equal(records.days["2026-06-21"].attempts, 2);
assert.equal(records.days["2026-06-21"].best.sessionId, "s2");
records = updateDailyRecords(records, result("2026-06-23", "s4"));
assert.equal(records.currentStreak, 1);
for (let day = 1; day <= 100; day += 1) {
  const date = new Date(Date.UTC(2025, 0, day)).toISOString().slice(0, 10);
  records = updateDailyRecords(records, result(date, `x${day}`, { success: false }));
}
assert.equal(Object.keys(records.days).length, 90);

console.log("Daily score formula, comparator, attempts, streaks, and 90-day bound tests passed.");

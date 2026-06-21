import assert from "node:assert/strict";
import {
  applyResultToLifetimeStatistics,
  backfillLifetimeStatistics,
  createDefaultLifetimeStatistics,
  getWeightedLifetimeAccuracy,
  getWeightedLifetimeWpm,
  sanitizeLifetimeStatistics,
} from "../js/lifetimeStatistics.js";

const result = (overrides = {}) => ({
  success: true,
  activeDurationMs: 1000,
  endedAt: 2000,
  wpm: 60,
  characters: { correct: 8, incorrect: 1, missed: 1, totalKeystrokes: 9 },
  words: { completed: 2, missed: 1 },
  ...overrides,
});

const defaults = createDefaultLifetimeStatistics();
const first = applyResultToLifetimeStatistics(defaults, result());
assert.equal(defaults.finalizedSessions, 0);
assert.equal(first.finalizedSessions, 1);
assert.equal(first.successfulSessions, 1);
assert.equal(first.failedSessions, 0);
assert.equal(first.activePlaytimeMs, 1000);
assert.equal(first.wordsCompleted, 2);
assert.equal(first.wordsMissed, 1);
assert.equal(first.totalKeystrokes, 9);
assert.equal(getWeightedLifetimeAccuracy(first), 80);
assert.equal(getWeightedLifetimeWpm(first), 60);
assert.equal(first.firstSessionAt, 2000);
assert.equal(first.lastSessionAt, 2000);

const second = applyResultToLifetimeStatistics(first, result({
  success: false,
  activeDurationMs: 3000,
  endedAt: 5000,
  wpm: 30,
  characters: { correct: 6, incorrect: 2, missed: 2, totalKeystrokes: 8 },
}));
assert.equal(second.finalizedSessions, 2);
assert.equal(second.failedSessions, 1);
assert.equal(getWeightedLifetimeWpm(second), 37.5);
assert.equal(getWeightedLifetimeAccuracy(second), 70);
assert.equal(second.firstSessionAt, 2000);
assert.equal(second.lastSessionAt, 5000);

const missingWpm = applyResultToLifetimeStatistics(second, result({
  activeDurationMs: 2000,
  wpm: Number.NaN,
}));
assert.equal(missingWpm.wpmWeightedDurationMs, second.wpmWeightedDurationMs);
assert.ok(Object.values(sanitizeLifetimeStatistics({
  lifetimeVersion: 1,
  finalizedSessions: -5,
  wpmWeightedTotal: Infinity,
})).every((value) => value == null || typeof value !== "number" || Number.isFinite(value)));

const backfill = backfillLifetimeStatistics({
  completedSessions: 5,
  failedSessions: 2,
  activePlaytimeMs: 9000,
  wordsCompleted: 20,
  correctCharacters: 80,
  incorrectCharacters: 10,
  missedCharacters: 10,
  charactersTyped: 90,
}, [{ endedAt: 8000 }, { endedAt: 9000 }]);
assert.equal(backfill.finalizedSessions, 5);
assert.equal(backfill.successfulSessions, 3);
assert.equal(backfill.accuracyDenominator, 100);
assert.equal(backfill.wpmWeightedDurationMs, 0);
assert.equal(backfill.firstSessionAt, null);
assert.equal(backfill.lastSessionAt, 9000);
assert.equal(backfill.historicalBackfillApplied, true);

console.log("Lifetime backfill, aggregation, weighted accuracy/WPM, timestamps, and invalid-value tests passed.");

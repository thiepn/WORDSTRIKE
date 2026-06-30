import assert from "node:assert/strict";
import { registerDailyWordCompletion } from "../js/dailyMode.js";
import { buildDailySubmissionResult } from "../js/leaderboardSubmissionService.js";

const game = {
  ended: false, spawnedWordCount: 1, resolvedWordCount: 0,
  completedWordCount: 1, missedWordCount: 0, score: 100,
  accumulatedWordPoints: 0, combo: 1, maxCombo: 0,
};
registerDailyWordCompletion(game, { text: "word" });
assert.equal(game.completedWordCount, 1);
assert.equal(game.resolvedWordCount, 1);

const result = {
  sessionSource: "daily-ready", developerMode: false, success: true,
  failureReason: null, score: 100, accuracy: 100, activeDurationMs: 1000,
  words: { completed: 60, missed: 0, total: 60 },
  modeData: {
    wordsCompleted: 60, wordsResolved: 60, wordsSpawned: 60, totalWords: 60,
    integrityRemaining: 3, dateKey: "2026-06-29", challengeVersion: 2,
    dateOverride: false, recordEligible: true, coreHits: 0, coreBreaches: 0,
    finalWave: 3, wordPoints: 100, completionBonus: 0, integrityBonus: 0,
    accuracyBonus: 0, timeBonus: 0,
  },
};
assert.equal(buildDailySubmissionResult(result).wordsCompleted, 60);
const twoMissed = {
  ...result,
  words: { completed: 58, missed: 2, total: 60 },
  modeData: { ...result.modeData, wordsCompleted: 58, coreBreaches: 2 },
};
assert.equal(buildDailySubmissionResult(twoMissed).wordsCompleted, 58);
assert.equal(buildDailySubmissionResult({
  ...result,
  words: { completed: 120, missed: 0, total: 60 },
  modeData: { ...result.modeData, wordsCompleted: 120 },
}), null);

console.log("Daily completion has one source of truth and rejects malformed 120/60 counters before submission.");

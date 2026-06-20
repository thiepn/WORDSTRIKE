import assert from "node:assert/strict";
import {
  getModeSummary,
  isBetterEndlessScoreRecord,
  isBetterEndlessStageRecord,
  recordCompletedSession,
  resetModeData,
} from "../js/modeStorage.js";

globalThis.localStorage = {
  value: null,
  getItem() { return this.value; },
  setItem(_key, value) { this.value = value; },
};
resetModeData();

const result = (sessionId, overrides = {}) => ({
  schemaVersion: 1,
  sessionId,
  modeId: "endless",
  variantId: "standard",
  endedAt: 1000,
  success: false,
  failureReason: "core-destroyed",
  score: 10000,
  grade: null,
  accuracy: 95,
  wpm: 55,
  activeDurationMs: 60000,
  developerMode: false,
  characters: { correct: 200, incorrect: 10, missed: 5, totalKeystrokes: 210 },
  words: { completed: 40, missed: 3 },
  modeData: {
    recordEligible: true,
    highestStage: 3,
    wordsCompleted: 40,
    survivalTimeMs: 60000,
    maximumCombo: 30,
    maximumPerfectStreak: 12,
    averageWpm: 55,
  },
  ...overrides,
});

assert.equal(recordCompletedSession(result("endless-1")), true);
let summary = getModeSummary("endless");
assert.equal(summary.highestStage, 3);
assert.equal(summary.records.bestStage.stage, 3);
assert.equal(summary.records.highestScore.score, 10000);
assert.equal(recordCompletedSession(result("dev", { developerMode: true })), false);
assert.equal(recordCompletedSession(result("forced", {
  modeData: { ...result("x").modeData, recordEligible: false },
})), false);

assert.equal(isBetterEndlessStageRecord(
  { stage: 4, score: 1, wordsCompleted: 1, accuracy: 1, achievedAt: 2 },
  { stage: 3, score: 99999, wordsCompleted: 99, accuracy: 100, achievedAt: 1 },
), true);
assert.equal(isBetterEndlessScoreRecord(
  { score: 100, stage: 4, accuracy: 90, achievedAt: 2 },
  { score: 100, stage: 3, accuracy: 100, achievedAt: 1 },
), true);

recordCompletedSession(result("endless-2", {
  endedAt: 2000,
  score: 9000,
  accuracy: 90,
  modeData: {
    ...result("x").modeData,
    highestStage: 4,
    wordsCompleted: 60,
  },
}));
summary = getModeSummary("endless");
assert.equal(summary.records.bestStage.stage, 4);
assert.equal(summary.records.highestScore.score, 10000);

console.log("Endless eligibility, compact records, and stage-first tie-breaking tests passed.");

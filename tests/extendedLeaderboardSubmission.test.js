import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateScoreSubmission } from "../supabase/functions/_shared/scoreSubmission.js";
import { buildSubmissionPayload } from "../js/leaderboardSubmissionService.js";
import { campaignSubmission, typingSubmission } from "./extendedLeaderboardFixtures.js";

assert.equal(validateScoreSubmission(campaignSubmission()).valid, true);
assert.equal(validateScoreSubmission(campaignSubmission({ completed: false })).code, "TEST_NOT_COMPLETED");
assert.equal(validateScoreSubmission(campaignSubmission({ grade: "S" })).code, "INVALID_RESULT");
assert.equal(validateScoreSubmission(campaignSubmission({ level: 101 })).code, "INVALID_RESULT");
assert.equal(validateScoreSubmission(campaignSubmission({ sessionSource: "test" })).code, "INVALID_SESSION_SOURCE");
for (const duration of [15, 60]) assert.equal(validateScoreSubmission(typingSubmission(duration)).valid, true);
assert.equal(validateScoreSubmission({ ...typingSubmission(60), boardKey: "typing-15s-english200-v1" }).code, "UNSUPPORTED_TEST_DURATION");
assert.equal(validateScoreSubmission(typingSubmission(60, { wordSetId: "legacy-common-740" })).code, "UNSUPPORTED_WORD_SET");
assert.equal(validateScoreSubmission(typingSubmission(60, { wordSetVersion: 2 })).code, "WORD_SET_VERSION_MISMATCH");
assert.equal(validateScoreSubmission(typingSubmission(60, { completed: false })).code, "TEST_NOT_COMPLETED");
assert.equal(validateScoreSubmission(typingSubmission(60, { wpm: 999 })).code, "METRIC_MISMATCH");
assert.equal(validateScoreSubmission(typingSubmission(15, { rawWpm: 999 })).code, "METRIC_MISMATCH");
assert.equal(validateScoreSubmission(typingSubmission(15, { accuracy: 50 })).code, "METRIC_MISMATCH");
assert.equal(validateScoreSubmission(typingSubmission(15, { sessionSource: "developer", developerMode: true })).code, "DEVELOPER_RESULT");

const campaignPayload = buildSubmissionPayload("campaign", {
  sessionId: campaignSubmission().sessionId, sessionSource: "level-select",
  developerMode: false, success: true, grade: "A", accuracy: 96, activeDurationMs: 83000,
  variantId: "normal", characters: { correct: 100 }, words: { completed: 20 },
  modeData: { level: 12, wordsTotal: 20, correctKeystrokes: 96, totalKeystrokes: 100,
    missedCharacters: 0, recordEligible: true },
});
assert.equal(campaignPayload.boardKey, "campaign-highest-level-v1");
const typingPayload = buildSubmissionPayload("typing", {
  sessionId: typingSubmission(15).sessionId, sessionSource: "mode-select",
  developerMode: false, success: true, wpm: 80, accuracy: 105 / 110 * 100,
  activeDurationMs: 15000, modeData: {
    durationSeconds: 15, configId: "time-15", wordSetId: "english-200", wordSetVersion: 1,
    metricVersion: 2, rawWpm: 88, correctTestCharacters: 100, rawTestCharacters: 110,
    correctKeystrokes: 105, incorrectKeystrokes: 5, missedCharacters: 0,
    completedWordCount: 22, exactWords: 20, incorrectWords: 2, recordEligible: true,
  },
});
assert.equal(typingPayload.boardKey, "typing-15s-english200-v1");
assert.equal(buildSubmissionPayload("typing", {
  ...typingPayload,
  sessionId: "123e4567-e89b-42d3-a456-426614174099",
  modeData: { configId: "words-10", durationSeconds: null, wordCount: 10 },
}), null);
const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
const speed = await readFile(new URL("../js/speedTest.js", import.meta.url), "utf8");
const campaignFinish = main.slice(main.indexOf("function finishLevel"), main.indexOf("function pauseGame"));
assert.ok(campaignFinish.indexOf("updateLevelResult") < campaignFinish.indexOf("prepareAutomaticResultSubmission"));
assert.ok(speed.indexOf("recordCompletedSession(result)") < speed.indexOf("callbacks.onComplete?.(currentSpeedTest, result)"));
assert.doesNotMatch(main.slice(main.indexOf("function openLeaderboardReturn"), main.indexOf("function openModeSelect")), /submitCurrentResult/);

console.log("Campaign and Typing submissions enforce completion, canonical grades, English 200, duration, formulas, and normal-play eligibility.");

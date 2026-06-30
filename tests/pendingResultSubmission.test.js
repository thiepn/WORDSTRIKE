import assert from "node:assert/strict";
import {
  clearPendingResultSubmission,
  loadPendingResultSubmission,
  PENDING_RESULT_MAX_AGE_MS,
  PENDING_RESULT_STORAGE_KEY,
  savePendingResultSubmission,
} from "../js/pendingResultSubmission.js";
import { createLeaderboardSubmissionService } from "../js/leaderboardSubmissionService.js";

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
const result = {
  sessionId: "session-pending-result-12345678",
  success: true,
  grade: "A",
  accuracy: 98,
  activeDurationMs: 30000,
  developerMode: false,
  sessionSource: "level-select",
  variantId: "normal",
  characters: { correct: 120 },
  words: { completed: 20 },
  modeData: {
    level: 10,
    wordsTotal: 20,
    correctKeystrokes: 120,
    totalKeystrokes: 122,
    missedCharacters: 0,
    recordEligible: true,
  },
};
const intent = savePendingResultSubmission("campaign", result, { storage, now: 1000 });
assert.equal(intent.sessionId, result.sessionId);
assert.equal(intent.source, "result-google-sign-in");
assert.equal(intent.expiresAt, 1000 + PENDING_RESULT_MAX_AGE_MS);
assert.equal(loadPendingResultSubmission({ storage, now: 2000 }).sessionId, result.sessionId);

let requests = 0;
const service = createLeaderboardSubmissionService({
  getClient: () => ({ functions: { invoke: async () => {
    requests += 1;
    return { data: { ok: true, data: { duplicate: false, rank: 4 } }, error: null };
  } } }),
  invalidateBoard() {},
});
const auth = { status: "signed-in", user: { id: "user-1" } };
const profile = { status: "ready", profile: { username: "Player_1" } };
const restored = service.restorePreparedSubmission("campaign", intent.immutablePayload, auth, profile);
assert.equal(restored.status, "ready");
assert.equal(restored.sessionId, result.sessionId);
const firstRequest = service.submitCurrentResult();
const duplicateClick = service.submitCurrentResult();
await Promise.all([firstRequest, duplicateClick]);
assert.equal(requests, 1);
assert.equal(service.getSubmissionState().status, "submitted");

values.set(PENDING_RESULT_STORAGE_KEY, "not json");
assert.equal(loadPendingResultSubmission({ storage, now: 2000 }), null);
assert.equal(values.has(PENDING_RESULT_STORAGE_KEY), false);

savePendingResultSubmission("campaign", result, { storage, now: 1000 });
assert.equal(loadPendingResultSubmission({ storage, now: 1000 + PENDING_RESULT_MAX_AGE_MS }), null);
assert.equal(clearPendingResultSubmission(storage), true);

console.log("Result-originated pending submission stores one immutable session, expires safely, and rejects malformed state.");

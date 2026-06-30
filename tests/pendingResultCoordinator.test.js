import assert from "node:assert/strict";
import { createPendingResultCoordinator } from "../js/pendingResultCoordinator.js";
import { createLeaderboardSubmissionService } from "../js/leaderboardSubmissionService.js";
import {
  bindPendingResultSubmission,
  clearPendingResultSubmission,
  inspectPendingResultSubmission,
  loadPendingResultSubmission,
  PENDING_RESULT_STORAGE_KEY,
  savePendingResultSubmission,
} from "../js/pendingResultSubmission.js";

const createStorage = () => {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

const result = (sessionId) => ({
  sessionId,
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
});

const signedIn = (id = "user-1") => ({ status: "signed-in", user: { id } });
const loadingProfile = { status: "loading", profile: null };
const newProfile = { status: "needs-username", profile: null };
const readyProfile = { status: "ready", profile: { username: "Player_1" } };

function createHarness(storage, { online = true, duplicate = false, now = 2000 } = {}) {
  let onlineState = online;
  let requests = 0;
  let hydrations = 0;
  let usernamePrompts = 0;
  const service = createLeaderboardSubmissionService({
    isOnline: () => onlineState,
    getClient: () => ({ functions: { invoke: async () => {
      requests += 1;
      return { data: { ok: true, data: { duplicate, rank: 7 } }, error: null };
    } } }),
    invalidateBoard() {},
  });
  const coordinator = createPendingResultCoordinator({
    loadIntent: () => loadPendingResultSubmission({ storage, now }),
    inspectIntent: () => inspectPendingResultSubmission({ storage, now }),
    bindIntent: (userId) => bindPendingResultSubmission(userId, { storage, now }),
    clearIntent: () => clearPendingResultSubmission(storage),
    hydrate: (...args) => { hydrations += 1; return service.restorePreparedSubmission(...args); },
    submit: service.submitCurrentResult,
    submissionState: service.getSubmissionState,
    onUsernameRequired: () => { usernamePrompts += 1; },
  });
  return {
    coordinator,
    get requests() { return requests; },
    get hydrations() { return hydrations; },
    get usernamePrompts() { return usernamePrompts; },
    setOnline(value) { onlineState = value; },
  };
}

// Page A stores the immutable result before OAuth; page B creates fresh services after reload.
const existingStorage = createStorage();
savePendingResultSubmission("campaign", result("session-existing-account-0001"), { storage: existingStorage, now: 1000 });
const existingPageB = createHarness(existingStorage);
assert.equal((await existingPageB.coordinator.evaluate(signedIn(), loadingProfile)).status, "waiting-for-profile");
assert.equal(existingPageB.requests, 0);
const firstEvaluation = existingPageB.coordinator.evaluate(signedIn(), readyProfile);
const concurrentEvaluation = existingPageB.coordinator.evaluate(signedIn(), readyProfile);
assert.equal(firstEvaluation, concurrentEvaluation);
assert.equal((await firstEvaluation).status, "submitted");
assert.equal(existingPageB.requests, 1);
assert.equal(existingPageB.hydrations, 1);
assert.equal(loadPendingResultSubmission({ storage: existingStorage, now: 2000 }), null);

const newStorage = createStorage();
savePendingResultSubmission("campaign", result("session-new-account-0000002"), { storage: newStorage, now: 1000 });
const newPageB = createHarness(newStorage);
assert.equal((await newPageB.coordinator.evaluate(signedIn(), newProfile)).status, "username-required");
assert.equal((await newPageB.coordinator.evaluate(signedIn(), newProfile)).status, "username-required");
assert.equal(newPageB.usernamePrompts, 1);
assert.equal(newPageB.requests, 0);
assert.equal((await newPageB.coordinator.evaluate(signedIn(), readyProfile)).status, "submitted");
assert.equal(newPageB.requests, 1);

const retryStorage = createStorage();
savePendingResultSubmission("campaign", result("session-offline-retry-00003"), { storage: retryStorage, now: 1000 });
const retryPage = createHarness(retryStorage, { online: false });
assert.equal((await retryPage.coordinator.evaluate(signedIn(), readyProfile)).status, "failed");
assert.equal(retryPage.coordinator.getState().errorCode, "OFFLINE");
assert.ok(loadPendingResultSubmission({ storage: retryStorage, now: 2000 }));
retryPage.setOnline(true);
assert.equal((await retryPage.coordinator.resume(signedIn(), readyProfile)).status, "submitted");
assert.equal(retryPage.hydrations, 2);
assert.equal(retryPage.requests, 1);

const duplicateStorage = createStorage();
savePendingResultSubmission("campaign", result("session-duplicate-result-004"), { storage: duplicateStorage, now: 1000 });
const duplicatePage = createHarness(duplicateStorage, { duplicate: true });
assert.equal((await duplicatePage.coordinator.evaluate(signedIn(), readyProfile)).status, "duplicate");
assert.equal(loadPendingResultSubmission({ storage: duplicateStorage, now: 2000 }), null);

const wrongUserStorage = createStorage();
savePendingResultSubmission("campaign", result("session-wrong-user-000005"), { storage: wrongUserStorage, now: 1000 });
const wrongUserPage = createHarness(wrongUserStorage);
assert.equal((await wrongUserPage.coordinator.evaluate(signedIn("user-1"), loadingProfile)).status, "waiting-for-profile");
assert.equal((await wrongUserPage.coordinator.evaluate(signedIn("user-2"), readyProfile)).errorCode, "USER_MISMATCH");
assert.equal(loadPendingResultSubmission({ storage: wrongUserStorage, now: 2000 }), null);
assert.equal(wrongUserPage.requests, 0);

const genericLogin = createHarness(createStorage());
assert.equal((await genericLogin.coordinator.evaluate(signedIn(), readyProfile)).status, "idle");
assert.equal(genericLogin.requests, 0);

const expiredStorage = createStorage();
savePendingResultSubmission("campaign", result("session-expired-result-0006"), { storage: expiredStorage, now: 1000 });
const expiredPage = createHarness(expiredStorage, { now: 2_000_000 });
const expiredState = await expiredPage.coordinator.evaluate(signedIn(), readyProfile);
assert.equal(expiredState.status, "expired");
assert.equal(expiredState.errorCode, "EXPIRED");
assert.equal(expiredPage.requests, 0);

const malformedStorage = createStorage();
malformedStorage.setItem(PENDING_RESULT_STORAGE_KEY, "not-json");
const malformedPage = createHarness(malformedStorage);
assert.equal((await malformedPage.coordinator.evaluate(signedIn(), readyProfile)).errorCode, "MALFORMED_INTENT");
assert.equal(malformedPage.requests, 0);

console.log("Pending results survive OAuth reloads, wait for settled profiles, submit once, retry safely, and reject mismatched users.");

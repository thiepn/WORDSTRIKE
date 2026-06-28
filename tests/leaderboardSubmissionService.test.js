import assert from "node:assert/strict";
import {
  buildSubmissionPayload,
  createLeaderboardSubmissionService,
} from "../js/leaderboardSubmissionService.js";

const RUN_ONE = "123e4567-e89b-42d3-a456-426614174001";
const RUN_TWO = "123e4567-e89b-42d3-a456-426614174002";
const OLD_RUN = "123e4567-e89b-42d3-a456-426614174003";
const NEW_RUN = "123e4567-e89b-42d3-a456-426614174004";
const result = (id = RUN_ONE) => ({
  sessionId: id, sessionSource: "mode-select", developerMode: false, success: false,
  failureReason: "core-destroyed", score: 1250, accuracy: 90, activeDurationMs: 10000,
  modeData: {
    highestStage: 1, finalStage: 1, wordsCompleted: 2, stageProgress: 2,
    completedStages: 0, recordEligible: true, metricVersion: 1,
    survivalPoints: 1000, wordPoints: 250, stageBonusPoints: 0,
    coreHits: 3, coreBreaches: 3, startStage: 1,
  },
});
const auth = { status: "signed-in", user: { id: "user-1" } };
const profile = { profile: { username: "Player_1" } };
let online = true;
let invalidated = null;
let invokeCount = 0;
let resolveRequest;
const client = { functions: { invoke(name, options) {
  invokeCount += 1;
  assert.equal(name, "submit-score");
  assert.equal(options.body.sessionId, RUN_ONE);
  return new Promise((resolve) => { resolveRequest = resolve; });
} } };
const service = createLeaderboardSubmissionService({
  getClient: () => client,
  isOnline: () => online,
  invalidateBoard: (board) => { invalidated = board; },
});
assert.equal(service.prepareResultSubmission("endless", result(), { status: "signed-out" }, {}).reason, "signed-out");
assert.equal(service.refreshSubmissionEligibility(auth, {}).reason, "username-required");
assert.equal(service.refreshSubmissionEligibility(auth, profile).status, "ready");
assert.equal(invokeCount, 0);
const pending = service.submitCurrentResult();
assert.equal(service.getSubmissionState().status, "submitting");
assert.equal((await service.submitCurrentResult()).status, "submitting");
assert.equal(invokeCount, 1);
resolveRequest({ data: { ok: true, data: { duplicate: false, rank: 42 } } });
await pending;
assert.equal(service.getSubmissionState().status, "submitted");
assert.equal(service.getSubmissionState().rank, 42);
assert.equal(invalidated, "endless-v1");

service.prepareResultSubmission("endless", result(RUN_TWO), auth, profile);
online = false;
assert.equal((await service.submitCurrentResult()).status, "offline");
online = true;
assert.equal(buildSubmissionPayload("endless", result(RUN_TWO)).sessionId, RUN_TWO);
assert.equal(buildSubmissionPayload("endless", { ...result(RUN_TWO), activeDurationMs: 10000.9 }).result.durationMs, 10000);

let staleResolve;
const staleService = createLeaderboardSubmissionService({
  getClient: () => ({ functions: { invoke: () => new Promise((resolve) => { staleResolve = resolve; }) } }),
});
staleService.prepareResultSubmission("endless", result(OLD_RUN), auth, profile);
const stalePending = staleService.submitCurrentResult();
staleService.prepareResultSubmission("endless", result(NEW_RUN), auth, profile);
staleResolve({ data: { ok: true, data: { rank: 1 } } });
await stalePending;
assert.equal(staleService.getSubmissionState().sessionId, NEW_RUN);
assert.equal(staleService.getSubmissionState().status, "ready");

console.log("Submission service is explicit, single-flight, retry-stable, offline-safe, cache-invalidating, and stale-safe.");

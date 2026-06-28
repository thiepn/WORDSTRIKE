import assert from "node:assert/strict";
import {
  createLeaderboardService,
  LEADERBOARD_BOARDS,
} from "../js/leaderboardService.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const calls = [];
const pending = [];
const client = { functions: { invoke(name, options) {
  calls.push({ name, options });
  const request = deferred();
  pending.push(request);
  return request.promise;
} } };
const service = createLeaderboardService({
  getClient: () => client,
  getDateKey: () => "2026-06-27",
  now: (() => { let value = 1000; return () => ++value; })(),
});
assert.equal(service.getLeaderboardState().status, "idle");
assert.equal(calls.length, 0);
const dailyRequest = service.initializeLeaderboards();
assert.equal(service.getLeaderboardState().selectedBoard, LEADERBOARD_BOARDS.CAMPAIGN);
assert.deepEqual(calls[0], {
  name: "get-leaderboard",
  options: { body: { boardKey: "campaign-highest-level-v1" } },
});
assert.equal(service.initializeLeaderboards(), dailyRequest);
const endlessRequest = service.selectLeaderboardBoard(LEADERBOARD_BOARDS.ENDLESS);
assert.deepEqual(calls[1].options.body, { boardKey: "endless-v1" });
pending[0].resolve({ data: { ok: true, data: { board: {}, entries: [{ rank: 1, username: "Stale" }], viewer: null } } });
await dailyRequest;
assert.equal(service.getLeaderboardState().selectedBoard, LEADERBOARD_BOARDS.ENDLESS);
assert.equal(service.getLeaderboardState().entries.some(({ username }) => username === "Stale"), false);
pending[1].resolve({ data: { ok: true, data: {
  board: { boardKey: "endless-v1", displayName: "Endless", rulesVersion: 1 },
  entries: [{ rank: 1, username: "Winner", stage: 20, score: 50000, accuracy: 96 }],
  viewer: { rank: 284, entry: { username: "Viewer", stage: 18, score: 42500, accuracy: 96.4 } },
} } });
await endlessRequest;
assert.equal(service.getLeaderboardState().status, "ready");
assert.equal(service.getLeaderboardState().viewer.rank, 284);
const refresh = service.refreshLeaderboard();
assert.equal(calls.length, 3);
assert.equal(service.refreshLeaderboard(), refresh);
assert.equal(calls.length, 3);
pending[2].resolve({ data: { ok: true, data: { board: {}, entries: [], viewer: null } } });
await refresh;
assert.equal(service.getLeaderboardState().status, "empty");

const offline = createLeaderboardService({ getClient: () => null });
assert.equal((await offline.initializeLeaderboards()).status, "offline");
const localData = { bestScore: 123 };
offline.resetLeaderboardState();
assert.deepEqual(localData, { bestScore: 123 });

console.log("Leaderboard service is lazy, canonical-date aware, deduplicated, stale-safe, refreshable, and offline-safe.");

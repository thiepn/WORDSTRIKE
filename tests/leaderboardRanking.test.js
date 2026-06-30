import assert from "node:assert/strict";
import {
  compareDailyLeaderboardRows,
  compareEndlessLeaderboardRows,
  rankLeaderboardRows,
} from "../supabase/functions/_shared/leaderboardRead.js";

const row = (userId, overrides = {}) => ({
  id: `${userId}-1`, userId, username: `Player_${userId}`,
  boardKey: "endless-v1", rulesVersion: 1, moderationStatus: "accepted",
  stage: 10, score: 1000, wordsCompleted: 40, accuracy: 90,
  submittedAt: "2026-06-27T00:00:00.000Z",
  ...overrides,
});
const rows = [
  row("a", { stage: 12, id: "a-low" }),
  row("a", { stage: 18, id: "a-best" }),
  row("a", { stage: 15, id: "a-mid" }),
  row("b", { stage: 18, score: 900, username: "CasePreserved" }),
  row("c", { stage: 99, moderationStatus: "flagged" }),
  row("d", { stage: 98, moderationStatus: "removed" }),
  row("e", { stage: 97, username: null }),
  row("f", { stage: 96, rulesVersion: 2 }),
];
const endless = rankLeaderboardRows(rows, { boardKey: "endless-v1", viewerUserId: "b" });
assert.equal(endless.entries.length, 2);
assert.equal(endless.entries[0].stage, 18);
assert.equal(endless.entries[0].score, 1000);
assert.equal(endless.entries[1].username, "CasePreserved");
assert.equal(endless.viewer.rank, 2);
assert.equal("userId" in endless.entries[0], false);
assert.equal("userId" in endless.viewer.entry, false);
assert.ok(compareEndlessLeaderboardRows(row("a", { stage: 11 }), row("b", { stage: 10 })) < 0);

const dailyBase = row("daily", {
  boardKey: "daily-strike-v1", challengeDate: "2026-06-27", challengeVersion: 2,
  completed: true, score: 1000, durationMs: 5000, accuracy: 90, wordsCompleted: 60,
});
assert.ok(compareDailyLeaderboardRows(dailyBase, { ...dailyBase, completed: false, score: 99999 }) < 0);
assert.ok(compareDailyLeaderboardRows(dailyBase, { ...dailyBase, score: 999 }) < 0);
assert.ok(compareDailyLeaderboardRows(dailyBase, { ...dailyBase, durationMs: 6000 }) < 0);
const daily = rankLeaderboardRows([
  dailyBase,
  { ...dailyBase, id: "date-wrong", userId: "x", challengeDate: "2026-06-26", score: 99999 },
  { ...dailyBase, id: "version-wrong", userId: "y", challengeVersion: 1, score: 99999 },
], { boardKey: "daily-strike-v1", challengeDate: "2026-06-27" });
assert.equal(daily.entries.length, 1);

const tied = [
  row("late", { id: "z", submittedAt: "2026-06-28T00:00:00.000Z" }),
  row("early-b", { id: "b" }),
  row("early-a", { id: "a" }),
];
assert.deepEqual(
  rankLeaderboardRows(tied, { boardKey: "endless-v1" }).entries.map(({ username }) => username),
  ["Player_early-a", "Player_early-b", "Player_late"],
);

const many = Array.from({ length: 130 }, (_, index) => row(`u${index}`, { stage: 130 - index }));
const limited = rankLeaderboardRows(many, { boardKey: "endless-v1", viewerUserId: "u120" });
assert.equal(limited.entries.length, 100);
assert.equal(limited.viewer.rank, 121);

console.log("Leaderboard ranking mirrors Daily/Endless comparators, best-per-player, moderation, top-100, and viewer rank.");

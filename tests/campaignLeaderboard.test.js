import assert from "node:assert/strict";
import {
  compareCampaignLeaderboardRows,
  rankLeaderboardRows,
} from "../supabase/functions/_shared/leaderboardRead.js";

const row = (userId, overrides = {}) => ({
  id: `${userId}-1`, userId, username: `Player_${userId}`,
  boardKey: "campaign-highest-level-v1", rulesVersion: 1,
  moderationStatus: "accepted", completed: true, level: 12,
  grade: "A", accuracy: 96, submittedAt: "2026-06-28T00:00:00Z",
  ...overrides,
});
assert.ok(compareCampaignLeaderboardRows(row("a", { level: 13 }), row("b")) < 0);
assert.ok(compareCampaignLeaderboardRows(row("a", { grade: "S" }), row("b", { grade: "A" })) < 0);
assert.ok(compareCampaignLeaderboardRows(row("a", { accuracy: 97 }), row("b", { accuracy: 96 })) < 0);
const ranked = rankLeaderboardRows([
  row("a", { level: 10 }), row("a", { level: 15, grade: "B" }),
  row("b", { level: 15, grade: "A" }), row("failed", { level: 100, completed: false }),
], { boardKey: "campaign-highest-level-v1", viewerUserId: "a" });
assert.deepEqual(ranked.entries.map(({ username }) => username), ["Player_b", "Player_a"]);
assert.equal(ranked.viewer.rank, 2);
assert.deepEqual(Object.keys(ranked.entries[0]).sort(), ["accuracy", "grade", "level", "rank", "submittedAt", "username"].sort());

console.log("Campaign leaderboard ranks only completed levels by level, canonical grade, accuracy, and stable ties.");

import assert from "node:assert/strict";
import { compareTypingLeaderboardRows, rankLeaderboardRows } from "../supabase/functions/_shared/leaderboardRead.js";

const row = (userId, boardKey, overrides = {}) => ({
  id: `${userId}-1`, userId, username: `Player_${userId}`, boardKey,
  rulesVersion: 1, moderationStatus: "accepted", completed: true,
  wpm: 80, rawWpm: 90, accuracy: 95, submittedAt: "2026-06-28T00:00:00Z",
  ...overrides,
});
const sixty = "typing-60s-english200-v1";
const fifteen = "typing-15s-english200-v1";
assert.ok(compareTypingLeaderboardRows(row("a", sixty, { wpm: 81 }), row("b", sixty)) < 0);
assert.ok(compareTypingLeaderboardRows(row("a", sixty, { accuracy: 96 }), row("b", sixty)) < 0);
assert.ok(compareTypingLeaderboardRows(row("a", sixty, { rawWpm: 91 }), row("b", sixty)) < 0);
const ranked60 = rankLeaderboardRows([
  row("a", sixty, { wpm: 80 }), row("a", sixty, { wpm: 90 }),
  row("b", fifteen, { wpm: 200 }), row("failed", sixty, { completed: false, wpm: 999 }),
  row("version-two", sixty, { rulesVersion: 2, wpm: 999 }),
], { boardKey: sixty });
assert.equal(ranked60.entries.length, 1);
assert.equal(ranked60.entries[0].wpm, 90);
assert.equal("userId" in ranked60.entries[0], false);
assert.equal(rankLeaderboardRows([row("b", fifteen)], { boardKey: fifteen }).entries.length, 1);

console.log("Typing leaderboards isolate 15s/60s and rank completed tests by WPM, accuracy, raw WPM, and stable ties.");

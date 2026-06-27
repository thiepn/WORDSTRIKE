import assert from "node:assert/strict";
import {
  canChangeLeaderboardUsername,
  formatUsernameChangeDate,
  normalizeUsernameInput,
  validateLeaderboardUsername,
} from "../js/leaderboardUsername.js";

for (const value of ["ABC", "a".repeat(20), "speed_runner", "WordStriker27"]) {
  assert.equal(validateLeaderboardUsername(value).valid, true, value);
}
for (const value of ["ab", "a".repeat(21), "name with spaces", "user-name", "player!", "<script>"]) {
  assert.equal(validateLeaderboardUsername(value).valid, false, value);
}
assert.equal(normalizeUsernameInput("  WordStriker  "), "WordStriker");
assert.deepEqual(
  ["WordStriker", "wordstriker", "WORDSTRIKER"].map((value) => validateLeaderboardUsername(value).normalized),
  ["wordstriker", "wordstriker", "wordstriker"],
);
assert.equal(canChangeLeaderboardUsername({ canChangeAt: null }), true);
assert.equal(canChangeLeaderboardUsername({ canChangeAt: "2030-01-01T00:00:00.000Z" }, 0), false);
assert.notEqual(formatUsernameChangeDate("2030-01-01T00:00:00.000Z"), "an unavailable date");

console.log("Leaderboard username validation, normalization, and cooldown formatting passed.");

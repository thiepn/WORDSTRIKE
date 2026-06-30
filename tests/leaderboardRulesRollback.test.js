import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DAILY_CHALLENGE_VERSION as CLIENT_DAILY_VERSION } from "../js/dailyConfig.js";
import { EXPECTED_LEADERBOARD_RULES_VERSIONS } from "../js/leaderboardService.js";
import {
  DAILY_CHALLENGE_VERSION as READ_DAILY_VERSION,
  LEADERBOARD_RULES_VERSION,
} from "../supabase/functions/_shared/leaderboardRead.js";
import {
  DAILY_CHALLENGE_VERSION as SUBMISSION_DAILY_VERSION,
  validateScoreSubmission,
} from "../supabase/functions/_shared/scoreSubmission.js";
import { dailySubmission } from "./leaderboardSubmissionFixtures.js";

const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
const migrations = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
const incrementName = "20260630170000_increment_ranked_gameplay_rules_versions.sql";
const rollbackName = "20260701010000_restore_original_leaderboard_rules.sql";
assert.ok(migrations.includes(incrementName));
assert.ok(migrations.includes(rollbackName));
assert.ok(migrations.indexOf(rollbackName) > migrations.indexOf(incrementName));

const increment = await readFile(new URL(incrementName, migrationsUrl), "utf8");
const rollback = await readFile(new URL(rollbackName, migrationsUrl), "utf8");
const databaseContract = await readFile(
  new URL("../supabase/migrations/20260628023000_complete_global_leaderboards.sql", import.meta.url),
  "utf8",
);

assert.match(increment, /set rules_version = 2/);
assert.doesNotMatch(increment, /typing-15s|typing-60s/);
assert.match(rollback, /^begin;/);
assert.match(rollback, /update public\.leaderboard_boards\s+set rules_version = 1/s);
for (const boardKey of ["campaign-highest-level-v1", "endless-v1", "daily-strike-v1"]) {
  assert.match(rollback, new RegExp(`'${boardKey}'`));
}
assert.doesNotMatch(rollback, /typing-15s|typing-60s/);
assert.doesNotMatch(rollback, /public\.leaderboard_submissions/);
assert.doesNotMatch(rollback, /\bdelete\s+from\b/i);
assert.doesNotMatch(rollback, /\b(score|submitted_at|username|session_id|moderation_status)\s*=/i);
assert.match(rollback, /commit;\s*$/);

assert.match(databaseContract, /p_user_id, selected_board\.board_key, selected_board\.rules_version/);
assert.match(databaseContract, /s\.rules_version = selected_board\.rules_version/);
assert.match(databaseContract, /s\.challenge_version = 1/);
assert.doesNotMatch(databaseContract, /delete from public\.leaderboard_submissions/i);

assert.equal(LEADERBOARD_RULES_VERSION, 1);
assert.equal(CLIENT_DAILY_VERSION, 1);
assert.equal(READ_DAILY_VERSION, 1);
assert.equal(SUBMISSION_DAILY_VERSION, 1);
assert.ok(Object.values(EXPECTED_LEADERBOARD_RULES_VERSIONS).every((version) => version === 1));
const dailyValidation = validateScoreSubmission(dailySubmission(), {
  now: new Date("2026-06-28T12:00:00Z"),
});
assert.equal(dailyValidation.valid, true);
assert.equal(dailyValidation.value.challengeVersion, 1);

console.log("Rollback migration restores active rules version 1 without rewriting submissions, and Daily uses challenge version 1 end to end.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const edge = await readFile(new URL("../supabase/functions/submit-score/index.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20260628023000_complete_global_leaderboards.sql", import.meta.url), "utf8");
const frontend = await readFile(new URL("../js/leaderboardSubmissionService.js", import.meta.url), "utf8");
assert.match(edge, /auth\.getUser\(token\)/);
assert.match(edge, /p_user_id: userId/);
assert.doesNotMatch(frontend, /service[_-]?role|\.from\(["']leaderboard_submissions/iu);
assert.match(migration, /moderation_status[\s\S]*'accepted'/);
assert.match(migration, /recent_count >= 30/);
assert.match(migration, /on conflict \(user_id, board_key, session_id\) do nothing/);
assert.match(migration, /from public, anon, authenticated/);
assert.match(migration, /to service_role/);
assert.doesNotMatch(edge, /error\.message|error\.stack/);

console.log("Submission security keeps identity server-derived, insertion service-only, errors stable, moderation fixed, and rate limiting database-enforced.");

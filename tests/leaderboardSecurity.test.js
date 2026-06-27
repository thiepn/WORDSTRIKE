import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getCorsHeaders } from "../supabase/functions/_shared/leaderboardProfile.js";
import { validateLeaderboardRequest } from "../supabase/functions/_shared/leaderboardRead.js";

assert.equal(validateLeaderboardRequest({ boardKey: "endless-v1" }).valid, true);
assert.equal(validateLeaderboardRequest({ boardKey: "daily-strike-v1", challengeDate: "2026-06-27" }).valid, true);
assert.equal(validateLeaderboardRequest({ boardKey: "campaign-highest-level-v1" }).code, "INVALID_BOARD");
assert.equal(validateLeaderboardRequest({ boardKey: "daily-strike-v1", challengeDate: "bad" }).code, "INVALID_CHALLENGE_DATE");
assert.equal(validateLeaderboardRequest({ boardKey: "endless-v1", limit: 1000 }).code, "INVALID_REQUEST");
assert.equal(validateLeaderboardRequest({ boardKey: "endless-v1", orderBy: "raw sql" }).code, "INVALID_REQUEST");
assert.equal(validateLeaderboardRequest({ boardKey: "endless-v1", user_id: "ignored" }).valid, true);
assert.equal(getCorsHeaders("https://evil.example"), null);

const edge = await readFile(new URL("../supabase/functions/get-leaderboard/index.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20260628003000_add_public_leaderboard_reads.sql", import.meta.url), "utf8");
const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
assert.match(edge, /auth\.getUser\(token\)/);
assert.match(edge, /viewerUserId = null/);
assert.doesNotMatch(edge, /body\.user_id|body\.limit|body\.orderBy/);
assert.match(edge, /get_public_leaderboard/);
assert.doesNotMatch(edge, /leaderboard_submissions["']\)\.insert|\.insert\(/);
assert.match(migration, /moderation_status = 'accepted'/);
assert.match(migration, /row_number\(\) over \(\s*partition by user_id/s);
assert.match(migration, /coalesce\(completed, false\)/);
assert.match(migration, /where rank <= 100/);
assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/);
assert.match(migration, /grant execute on function[\s\S]*to service_role/);
assert.match(config, /\[functions\.get-leaderboard\]\s*verify_jwt = false/);
assert.match(config, /\[functions\.leaderboard-profile\]\s*verify_jwt = false/);

console.log("Public leaderboard API validation, optional JWT, CORS, read-only behavior, and service-only SQL passed.");

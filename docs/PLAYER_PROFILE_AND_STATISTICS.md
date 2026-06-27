# Player Profile and Statistics

WORDSTRIKE exposes a local-only `PROFILE & STATS` screen from the title menu. It is not a gameplay mode and creates no session. The screen opens on Overview and contains Campaign, Typing Test, Endless, Daily, Recent, and Profile tabs.

## Local profile

The profile is stored inside `wordstrike_mode_data_v1` and is created lazily when the statistics screen or public-profile helper first needs it. The immutable player ID uses `crypto.randomUUID()` or `crypto.getRandomValues()` and is never derived from the display name.

Display names default to `Player`. Edits trim surrounding whitespace, collapse repeated whitespace, reject control characters, and require 2–20 Unicode code points. `getPublicPlayerProfile()` returns only the player ID, display name, and profile version for future integration.

## Optional global account

The Profile tab offers optional Google authentication through Supabase. Local gameplay, progress, and records do not require an account. Google is the only provider; email OTP, passwords, and anonymous authentication are not implemented. Google names, email addresses, and avatars are never adopted automatically as public WORDSTRIKE identities.

Signed-in players may claim a separate public leaderboard username containing 3–20 ASCII letters, numbers, or underscores. Uniqueness is case-insensitive. The initial claim does not start a cooldown; after the first later change, additional changes require 30 days. Validation, ownership, uniqueness, and cooldown enforcement occur in the protected `leaderboard-profile` Edge Function and database functions rather than through direct browser table writes.

Score submission is not implemented yet.

## Public leaderboards

Daily Strike and Endless global leaderboards are publicly viewable without signing in. Each board displays up to 100 ranked players, while a signed-in player with a public username can also see their own rank when it falls outside the top 100. Daily rankings use the canonical UTC challenge date and current challenge version; Endless rankings use the standard rules version.

Global score submission is not implemented yet, so boards may remain empty. Campaign and Typing Test leaderboards remain reserved for a later phase. If Supabase is unavailable, local gameplay, progress, and records continue to work normally.

## Lifetime aggregation

`lifetimeVersion: 1` tracks eligible finalized sessions, successes and failures, active playtime, completed and missed words, character totals, total keystrokes, weighted character accuracy, duration-weighted WPM, and known first/last session timestamps.

Aggregation occurs once in `recordCompletedSession()`, alongside authoritative mode records and the bounded recent-session summary. Developer sessions, aborted sessions, invalid Typing Test configurations, forced-stage Endless runs, forced-date Daily runs, and duplicate session IDs are excluded.

Existing trusted root totals are backfilled once when lifetime data is absent. Historical WPM weighting, missed-word totals, per-mode word/character activity, and Typing Test configuration usage were not previously stored, so they begin tracking with this version and display an empty value until reliable. Recent sessions are not treated as complete lifetime history.

## Selectors and records

`js/statistics.js` contains pure selectors for Overview, Campaign saves and grades, Typing Test configuration records, Endless personal bests, Daily streak/day records, and the 30-entry recent-session list. Existing mode-specific comparators remain authoritative.

Typing Test statistics display only the current **English 200** (`english-200`) record namespace. Older records without a word-set identity remain preserved as `legacy-common-740` data but do not compete with English 200 personal bests. New recent summaries identify English 200; legacy summaries continue to render safely.

Daily detailed dates remain capped at 90. A separate distinct-completed-day counter survives pruning. Recent filters never mutate storage.

Gameplay and statistics data stay in this browser. Authentication stores only its Supabase session under a separate browser key; public username management does not synchronize local records or submit scores.

# Player Profile and Statistics

WORDSTRIKE exposes a local-only `PROFILE & STATS` screen from the title menu. It is not a gameplay mode and creates no session. The screen opens on Overview and contains Campaign, Typing Test, Endless, Daily, Recent, and Profile tabs.

## Local profile

The profile is stored inside `wordstrike_mode_data_v1` and is created lazily when the statistics screen or public-profile helper first needs it. The immutable player ID uses `crypto.randomUUID()` or `crypto.getRandomValues()` and is never derived from the display name.

Display names default to `Player`. Edits trim surrounding whitespace, collapse repeated whitespace, reject control characters, and require 2–20 Unicode code points. `getPublicPlayerProfile()` returns only the player ID, display name, and profile version for future integration. No account, network request, or upload exists.

## Lifetime aggregation

`lifetimeVersion: 1` tracks eligible finalized sessions, successes and failures, active playtime, completed and missed words, character totals, total keystrokes, weighted character accuracy, duration-weighted WPM, and known first/last session timestamps.

Aggregation occurs once in `recordCompletedSession()`, alongside authoritative mode records and the bounded recent-session summary. Developer sessions, aborted sessions, invalid Typing Test configurations, forced-stage Endless runs, forced-date Daily runs, and duplicate session IDs are excluded.

Existing trusted root totals are backfilled once when lifetime data is absent. Historical WPM weighting, missed-word totals, per-mode word/character activity, and Typing Test configuration usage were not previously stored, so they begin tracking with this version and display an empty value until reliable. Recent sessions are not treated as complete lifetime history.

## Selectors and records

`js/statistics.js` contains pure selectors for Overview, Campaign saves and grades, Typing Test configuration records, Endless personal bests, Daily streak/day records, and the 30-entry recent-session list. Existing mode-specific comparators remain authoritative.

Daily detailed dates remain capped at 90. A separate distinct-completed-day counter survives pruning. Recent filters never mutate storage.

All data stays in this browser. The feature has no accounts, cloud synchronization, leaderboard, graphs, destructive reset controls, or additional storage key.

# WORDSTRIKE Mode and Session Architecture

## Mode registry

`js/modes.js` is the source of truth for mode IDs, availability, labels, routes, and capabilities. Campaign is enabled; Typing Test, Endless, Daily Strike, and Practice Lab are immutable disabled entries. Navigation must check `isModeEnabled()` before starting a controller.

## Session lifecycle

`js/sessionManager.js` owns one metadata session at a time. It does not run gameplay. Normal and boss loops remain authoritative and the Campaign adapter publishes their phases:

- `preparing` → level data is being created.
- `briefing` → modifier briefing or boss intro.
- `active` → typing time is running.
- `paused` → active or phase-specific time is suspended.
- `transitioning` → boss sequence transition.
- `completed` → one normalized result was finalized.
- `aborted` → navigation or retry ended an unfinished attempt.

Only valid forward transitions are accepted. Completion and abort are idempotent. Retry and Next Level begin new session identities. Monotonic timestamps measure active and paused runtime; epoch timestamps are used for persisted dates. Campaign WPM continues using the existing loop-owned `game.elapsedMs`.

## Results and records

`js/sessionResult.js` creates an immutable, JSON-safe schema with generic metrics and a `modeData` object for Campaign fields. `js/sessionMetrics.js` delegates to the existing authoritative accuracy and WPM formulas.

`js/modeStorage.js` uses `wordstrike_mode_data_v1`. It stores bounded aggregates, at most 30 compact recent summaries, and a bounded duplicate-ID guard. Runtime state, word lists, aborted sessions, and developer sessions are not stored. The existing `wordstrike_save` Campaign key remains independent and authoritative for unlocks, grades, and settings.

## Campaign adapter and cleanup

`js/campaignSession.js` starts Campaign sessions, maps normal/boss phases, builds normalized results, and records completed attempts once. It never changes spawning, scoring, grades, modifiers, or boss behavior.

`js/sessionCleanup.js` coordinates existing loop stops, pause-overlay removal, runtime clearing, session abort, and session removal. Gameplay modules retain ownership of their internal cleanup.

## Navigation

The route is Title → Mode Select → Campaign → Level Select. Mode Select creates no session. A session begins only when a level launches. Level Select and Main Menu abort and clear unfinished sessions; Results keeps the completed session until Retry, Next Level, or exit.

## Adding a future mode

1. Add or enable its registry entry.
2. Add a focused mode controller.
3. Begin one shared session.
4. Publish lifecycle states.
5. Build a normalized result.
6. Use shared cleanup.
7. Persist through the record store.
8. Add navigation and tests.

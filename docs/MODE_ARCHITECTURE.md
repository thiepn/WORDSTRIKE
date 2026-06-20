# WORDSTRIKE Mode and Session Architecture

## Mode registry

`js/modes.js` is the source of truth for mode IDs, availability, labels, routes, and capabilities. Campaign and Typing Test are enabled. Endless, Daily Strike, and Practice Lab remain immutable disabled entries. Navigation checks `isModeEnabled()` and the registered route before starting a controller.

## Shared session lifecycle

`js/sessionManager.js` owns one metadata session at a time and never runs gameplay. Supported states are `preparing`, `briefing`, `active`, `paused`, `transitioning`, `results`, `completed`, and `aborted`.

Only valid forward transitions are accepted. Completion and abort are idempotent. Retry creates a new identity. Monotonic timestamps measure runtime; epoch timestamps are used for persisted dates. Campaign WPM continues using the loop-owned `game.elapsedMs`.

## Results and records

`js/sessionResult.js` creates immutable JSON-safe results with generic metrics and mode-specific `modeData`. `js/sessionMetrics.js` delegates to the authoritative Campaign formulas.

`js/modeStorage.js` uses `wordstrike_mode_data_v1`. It stores bounded aggregates, at most 30 compact recent summaries, a bounded duplicate-ID guard, and separate Typing Test records for all seven configurations. Runtime state, word lists, aborted sessions, and developer sessions are not stored. The existing `wordstrike_save` key remains authoritative and independent.

## Campaign adapter

`js/campaignSession.js` maps existing normal and boss phases into shared session states, builds normalized results, and records completed attempts once. It does not change spawning, scoring, grades, modifiers, timing, or boss behavior.

## Typing Test controller

`js/speedTest.js` owns the active test buffer, generated words, one deadline-based animation loop, keystroke history, completion, and normalized result publication. The timer begins on the first accepted printable character; setup, waiting, and Results time are excluded.

`js/speedTestConfig.js` defines four timed and three word-count configurations. `js/speedTestWords.js` creates an unlimited deterministic stream from the dedicated common-English vocabulary. `js/speedTestMetrics.js` owns Typing Test accuracy, raw WPM, and net WPM without changing Campaign formulas.

## Cleanup contract

`js/sessionCleanup.js` coordinates authoritative loop stops, pause removal, mode runtime clearing, session abort, and session removal. Each gameplay controller retains ownership of its internal state and frame cancellation.

## Navigation

Campaign: Title → Mode Select → Campaign → Level Select.

Typing Test: Title → Mode Select → Typing Test Setup → Run → Results.

Mode Select and setup create no sessions. A Typing Test session begins in `preparing` when the run opens and becomes `active` on the first printable character. Escape aborts an unfinished test and returns to setup. Results retains the completed session until Retry or navigation.

## Adding a future mode

1. Add or enable its registry entry.
2. Add a focused mode controller.
3. Begin one shared session.
4. Publish lifecycle states.
5. Build a normalized result.
6. Use shared cleanup.
7. Persist through the record store.
8. Add navigation and tests.

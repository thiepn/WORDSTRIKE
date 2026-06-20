# WORDSTRIKE Mode and Session Architecture

## Mode registry

`js/modes.js` is the source of truth for mode IDs, availability, routes, and capabilities. Campaign, Typing Test, and Endless are enabled. Daily Strike and Practice Lab remain immutable disabled entries.

## Shared session lifecycle

`js/sessionManager.js` owns one metadata session at a time. Controllers own gameplay. Valid transitions, monotonic active timing, idempotent completion, abort behavior, and unique retry identities remain centralized.

## Results and records

`js/sessionResult.js` creates immutable JSON-safe results. `js/modeStorage.js` keeps bounded aggregates and at most 30 compact recent summaries under `wordstrike_mode_data_v1`. Campaign save data remains independent.

## Controllers

- Campaign adapts existing normal and boss loops through `campaignSession.js`.
- Typing Test owns its ready/active buffer and deadline loop in `speedTest.js`.
- Endless owns its standardized survival runtime in `endlessMode.js`, reusing Campaign word rendering, prefix targeting, movement geometry, separation, and compatible modifiers.

Exactly one gameplay controller is active. Shared cleanup stops all loops before clearing mode runtime and session state.

## Navigation

- Campaign: Title → Mode Select → Level Select → Run → Results.
- Typing Test: Title → Mode Select → Ready Test → Results.
- Endless: Title → Mode Select → Endless Ready → Run → Results.

Mode Select and Endless Ready create no session. Endless begins its session only when the player starts. Stage and modifier banners remain active gameplay and do not exclude survival time.

## Adding a future mode

1. Register the mode.
2. Add one focused controller.
3. Begin one shared session.
4. Publish normalized results.
5. Use shared cleanup and bounded storage.
6. Add navigation and regression tests.

# Endless Mode

Endless is one standardized survival ruleset: three core integrity, twenty destroyed words per stage, no regeneration, bosses, elite waves, Chain, upgrades, or mid-run resume.

Movement rises from 70% to a 66 px/s cap by stage 10. Spawn delay follows `max(600, round(1700 * 0.92^(stage-1)))`; Quick Fingers halves it with a 320 ms floor. Active words rise from three to a hard cap of nine. Word ranges progress from 3–6 to 6–14 characters.

Vocabulary blends common Typing Test words with Campaign tiers. Tiers 1–3 form the normal pool, tiers 4–5 the difficult pool, and individual boss words become eligible at stage 25. Selection is deterministic, length-weighted, unique within a stage, and avoids a bounded forty-word history when possible.

Stages 5, 10, and 15 use Quick Fingers, No Backspace, and Blackout. From stage 20, every fifth stage uses a seeded rotation of those three without immediate repeats. Chain is excluded.

Score combines 100 survival points per active second, modest word points, and `250 * completedStage` bonuses. Records rank stage first, then score, completed words, accuracy, and earlier timestamp.

Only a natural standard stage-1 run outside developer mode is record eligible. Runtime state is never saved. Developer URLs support `mode=endless`, fixed `seed`, and starting `stage`; developer runs remain ineligible.

The internal runtime configuration is suitable for future Daily Strike reuse, but no networking or challenge backend is implemented.

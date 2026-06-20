# Endless Mode

Endless is one standardized survival ruleset: three core integrity, twenty
destroyed words per stage, no regeneration, bosses, special rule stages,
upgrades, or mid-run resume.

Movement rises from 70% to a 66 px/s cap by stage 10. The original exponential
spawn curve is preserved through stage 10, then held at 803 ms. Late difficulty
comes from sustained backlog, active-word count, vocabulary, and gradual
word-length growth.

Vocabulary blends common Typing Test words with Campaign tiers. Tiers 1–3 form
the normal pool, tiers 4–5 the difficult pool, and curated common boss words
become eligible at stage 25. Selection is deterministic, length-weighted,
unique within a stage, and avoids a bounded forty-word history when possible.

Every stage follows the same rules. Every fifth stage is ordinary, and stage
transition banners display only the new stage number.

Score combines 100 survival points per active second, modest word points, and
`250 * completedStage` bonuses. Records rank stage first, then score, completed
words, accuracy, and earlier timestamp.

Only a natural standard stage-1 run outside developer mode is record eligible.
Runtime state is never saved. Developer URLs support `mode=endless`, fixed
`seed`, and starting `stage`; developer runs remain ineligible.

# Daily Strike

Daily Strike is a finite, deterministic UTC-date challenge. Version 1 derives its seed from `wordstrike-daily-v1:YYYY-MM-DD`, pre-generates the complete encounter, and uses independent deterministic domains for vocabulary selection, source ordering, spawn edges, and edge positions.

## Rules

- Three waves of 20 words (60 total).
- Three core integrity, no healing, modifiers, or bosses.
- Unlimited retries reproduce the same full plan for that UTC date.
- New-wave spawns pause for one second while active words, input, and movement continue.
- Difficulty pressure reuses legacy Campaign profiles 30, 45, and 60. Spawned words retain their original speed.

## Vocabulary and scoring

The challenge uses Typing Test common words and Campaign tiers only. Boss vocabulary is excluded. The 60 selected words are unique and obey each wave's length range.

Word points are `round((100 + 5 × length + 25 × wave) × combo multiplier)`. Successful runs add completion, remaining-integrity, accuracy, and time bonuses. Failed runs retain word points only.

## Records

Daily records live inside `wordstrike_mode_data_v1`. Each date stores attempts, its comparator-selected best result, first completion time, and last attempt time. At most 90 dates are retained. Successful eligible runs update current and best streaks.

Developer sessions and date overrides never update records. Use `?dev=1&mode=daily&date=YYYY-MM-DD` to inspect a date.

# Campaign Difficulty

WORDSTRIKE's normal Campaign pressure is calculated through a continuous
virtual legacy level. The real level remains authoritative for level labels,
word count, boss detection, scoring, grades, progression, and save
data.

## Architecture

Before this rebalance, `generateLevel(actualLevel)` fed the actual level
directly into every normal-level formula:

- word count: `8 + floor(level / 4)`, clamped to 8–30;
- movement: `50 + level * 0.4` pixels/second;
- spawn interval: `1600 - level * 4` milliseconds;
- active cap: `3 + floor(level / 15)`;
- word range: a level-derived minimum plus a level-derived width;
- vocabulary tier: thresholds at legacy levels 15, 35, 60, and 85.

There was no explicit target average word length. The selection system now
uses the midpoint of the existing min/max range as that target and performs
deterministic weighted sampling around it. Nearby vocabulary tiers and shorter
words remain eligible as relief; normal words still cannot exceed the existing
11-character maximum.

`getCampaignDifficultyLevel(actualLevel)` now interpolates between these
anchors:

| Actual | Legacy |
| ---: | ---: |
| 1 | 1 |
| 3 | 4 |
| 5 | 8 |
| 6 | 12 |
| 8 | 18 |
| 9 | 23 |
| 11 | 30 |
| 15 | 35 |
| 20 | 40 |
| 30 | 50 |
| 40 | 58 |
| 50 | 65 |
| 60 | 70 |
| 70 | 76 |
| 80 | 84 |
| 90 | 92 |
| 99 | 100 |

Values between anchors are piecewise-linear floating-point values. Inputs at
or below 1 clamp to legacy level 1; inputs at or above 99 clamp to legacy level
100.

The virtual level controls movement speed, spawn interval, active-word cap,
word-length range and average target, target WPM, and vocabulary tier. The
actual level controls word count, displayed/stored level, boss detection,
scoring, grades, progression, and world index. Each pressure formula receives
the virtual level exactly once.

Boss levels continue to use their dedicated boss profiles and ignore the
normal Campaign profile. Endless Mode and Typing Test use separate generators.
No save migration or new storage key is required.

## Generated comparison

This table was generated from `generateLegacyLevel(actualLevel)` and
`generateLevel(actualLevel)`. Rows that are boss numbers describe the normal
profile only for comparison; actual boss gameplay still uses the unchanged
boss generator.

| Level | Virtual | Old speed | New speed | Old interval | New interval | Old cap | New cap | Old range | New range | Old tier | New tier | Words |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: | :---: | ---: | ---: | ---: |
| 1 | 1.00 | 50.40 | 50.40 | 1596.00 | 1596.00 | 3 | 3 | 3–5 | 3–5 | 1 | 1 | 8 |
| 3 | 4.00 | 51.20 | 51.60 | 1588.00 | 1584.00 | 3 | 3 | 3–5 | 3–5 | 1 | 1 | 8 |
| 5 | 8.00 | 52.00 | 53.20 | 1580.00 | 1568.00 | 3 | 3 | 3–5 | 3–5 | 1 | 1 | 9 |
| 6 | 12.00 | 52.40 | 54.80 | 1576.00 | 1552.00 | 3 | 3 | 3–5 | 3–5 | 1 | 1 | 9 |
| 8 | 18.00 | 53.20 | 57.20 | 1568.00 | 1528.00 | 3 | 4 | 3–5 | 3–5 | 1 | 2 | 10 |
| 9 | 23.00 | 53.60 | 59.20 | 1564.00 | 1508.00 | 3 | 4 | 3–5 | 4–6 | 1 | 2 | 10 |
| 11 | 30.00 | 54.40 | 62.00 | 1556.00 | 1480.00 | 3 | 5 | 3–5 | 4–6 | 1 | 2 | 10 |
| 15 | 35.00 | 56.00 | 64.00 | 1540.00 | 1460.00 | 4 | 5 | 3–5 | 4–6 | 2 | 3 | 11 |
| 19 | 39.00 | 57.60 | 65.60 | 1524.00 | 1444.00 | 4 | 5 | 3–5 | 4–6 | 2 | 3 | 12 |
| 21 | 41.00 | 58.40 | 66.40 | 1516.00 | 1436.00 | 4 | 5 | 4–6 | 5–8 | 2 | 3 | 13 |
| 25 | 45.00 | 60.00 | 68.00 | 1500.00 | 1420.00 | 4 | 6 | 4–6 | 5–8 | 2 | 3 | 14 |
| 29 | 49.00 | 61.60 | 69.60 | 1484.00 | 1404.00 | 4 | 6 | 4–6 | 5–8 | 2 | 3 | 15 |
| 31 | 50.80 | 62.40 | 70.32 | 1476.00 | 1396.80 | 5 | 6 | 4–6 | 5–8 | 2 | 3 | 15 |
| 40 | 58.00 | 66.00 | 73.20 | 1440.00 | 1368.00 | 5 | 6 | 5–8 | 5–8 | 3 | 3 | 18 |
| 50 | 65.00 | 70.00 | 76.00 | 1400.00 | 1340.00 | 6 | 7 | 5–8 | 6–9 | 3 | 4 | 20 |
| 60 | 70.00 | 74.00 | 78.00 | 1360.00 | 1320.00 | 7 | 7 | 6–9 | 6–9 | 4 | 4 | 23 |
| 70 | 76.00 | 78.00 | 80.40 | 1320.00 | 1296.00 | 7 | 8 | 6–9 | 6–9 | 4 | 4 | 25 |
| 80 | 84.00 | 82.00 | 83.60 | 1280.00 | 1264.00 | 8 | 8 | 7–11 | 7–11 | 4 | 4 | 28 |
| 90 | 92.00 | 86.00 | 86.80 | 1240.00 | 1232.00 | 9 | 9 | 7–11 | 7–11 | 5 | 5 | 30 |
| 99 | 100.00 | 89.60 | 90.00 | 1204.00 | 1200.00 | 9 | 9 | 7–11 | 7–11 | 5 | 5 | 30 |

## Playtest checkpoints

Check normal levels 1, 5, 8, 9, 11, 15, 19, 21, 22, 40, 42, 50, 60,
62, 70, 80, 82, 90, 97, and 99. Former special-rule levels now use the same
normal moving-word rules as every other non-boss Campaign level.

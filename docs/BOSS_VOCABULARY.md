# Boss Vocabulary

Bosses use recognizable mixed-length English words. Difficulty comes from
target WPM, exact character volume, sequence length, transitions, and sustained
accuracy rather than rare terminology.

## Sources and tiers

- `data/typingTestWords.json` supplies common short and medium words and some
  long words. Its source array and ordering are never mutated.
- `data/bossCommonLongWords.json` contains 241 manually reviewed, unique,
  lowercase words between 9 and 15 characters.
- The deleted difficult boss bank is not imported or used.

| Tier | Length |
| --- | ---: |
| Short | 3–5 |
| Medium | 6–8 |
| Long | 9–11 |
| Very long | 12–15 |

The curated list favors familiar words used in ordinary speech, education,
news, work, and daily life. Automated validation proves spelling shape,
length, uniqueness, source isolation, and tier membership; it cannot prove
linguistic familiarity, so the fixed-seed samples remain a manual review
surface.

## Profiles and preserved pressure

The baseline was measured over seeds 1–50 before replacement. Every old
encounter had a fixed character total, so the new generator targets that exact
center.

For the 50-seed baseline, minimum, maximum, mean, and median characters were
all equal to the listed center.

| Boss | Segments × words | Characters | Old average timer | WPM |
| ---: | :---: | ---: | ---: | ---: |
| 10 | 1 × 5 | 33 | 10.692s | 40 |
| 20 | 1 × 6 | 47 | 10.152s | 60 |
| 30 | 2 × 5 | 78 | 15.902s | 65 |
| 40 | 2 × 7 | 106 | 19.975s | 70 |
| 50 | 2 × 8 | 136 | 23.851s | 75 |
| 60 | 3 × 7 | 180 | 29.860s | 80 |
| 70 | 3 × 9 | 231 | 35.921s | 85 |
| 80 | 3 × 10 | 246 | 36.124s | 90 |
| 90 | 3 × 11 | 302 | 41.899s | 95 |
| 100 | 3 × 12 | 362 | 47.615s | 100 |

Each segment contains short and medium words. Bosses 30+ also contain long
words, and bosses 50+ contain very-long words. No encounter repeats a word,
and no segment permits three consecutive very-long words.

Independent deterministic seed domains drive tier patterns and word selection.
Selection uses bounded backtracking against per-segment character targets.
Runtime failure falls back to a small recognizable built-in vocabulary.

The timer remains:

```text
ideal = ((actual characters including spaces / 5) / target WPM) * 60
allowance = (segment count - 1) * 0.35
effective = clamp(ideal * 1.08 + allowance, 9, 50)
```

## Fixed seed 12345 samples

- Boss 10: `trouble pull perhaps body through`
- Boss 20: `problem teacher additional fact weather capital`
- Boss 30: `set ticket necessary diamond successful` / `summer future afternoon much restaurant`
- Boss 40: `yesterday financial toward strong low teacher machine` / `beginning challenge decide why future correct example`
- Boss 50: `happen introduction practical amount was animal following invitation` / `war common announcement excellent sometimes around sister conclusion`
- Boss 60: `transport dollar return introduction correct motivation copy` / `choose forest telephone follow accounting companionship hand` / `sunday little conversation wonderful population morning hard`
- Boss 70: `dangerous ear situation better picture expectation unfortunately wife someone` / `war attention around sky develop historical comparison constitutional perhaps` / `wonderful manufacturer beautiful miss bear measure brother believe unexpected`
- Boss 80: `strong statement common accept beginning age hungry transportation friendship same` / `curiosity new animal condition cotton bad uncomfortable compare outside membership` / `change follow beside doctor contribution try background additional investment late`
- Boss 90: `toward contribution classroom direction become invitation will qualification clothes talk conclusion` / `relationship beginning carefully double travel rest instruction map nothing responsibility individual` / `decide afternoon saw recommend circumstances university circle capital constitutional hope unexpected`
- Boss 100: `selection yesterday newspaper ground day difficult understanding someone nothing themselves administration encouragement` / `carefully little inside refrigerator organization leadership basketball land confidence shoulder completely qualification` / `lot entertaining including statement sometimes increasing weather outside throughout holiday transformation international`

Run `node scripts/printBossSamples.js [seed]` for annotated tiers, targets, WPM,
and calculated timers.

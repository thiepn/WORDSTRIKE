# Gameplay vocabulary source

WORDSTRIKE's general gameplay vocabulary is generated from the US-English, no-swears
edition of [first20hours/google-10000-english](https://github.com/first20hours/google-10000-english),
a frequency-ranked list derived from Google's Trillion Word Corpus.

- License: MIT (source repository)
- Source file: `google-10000-english-usa-no-swears.txt`
- Retrieved: 2026-06-30
- Source SHA-256: `ee2d83651fbb91642bbed2bd30ead404c2cfbdfece01dacf284af6ea47795811`
- Generator: `scripts/buildWordPools.mjs`

The generator accepts lowercase ASCII words of 2–12 characters, removes duplicates,
uses the upstream swear-filtered edition, and applies an additional reviewed exclusion
set for brands, abbreviations, technical/browser terms, and niche words. Personal names
come from the U.S. Social Security Administration national baby-name dataset (CC0),
using the checked-in `personalNameExclusions.json` generated from names that reached at
least 1,000 births in one year. Ambiguous ordinary words and a small geographic allowlist
are documented in `scripts/buildWordPools.mjs`.

Regular `-s`, `-es`, `-ies`, `-ed`, and `-ing` forms are removed when an earlier-ranked
base form exists. Explicit exception lists preserve common irregular forms, independent
words, and legitimate singular words ending in `s`. Two- and three-letter words use an
explicit everyday-function-word allowlist, excluding initialisms such as UTC and DSL.
It keeps the first 3,000 accepted words in source frequency order.

Difficulty is primarily frequency-based (72%), with a smaller typing-complexity factor
(28%) based on length, uncommon letters, consonant clusters, repeated letters, and
recognizable morphology. The resulting five tiers contain 600 words each.

`data/english200.json` is deliberately independent and remains the immutable English
200 v1 set used by ranked 15-second and 60-second Typing Test boards.

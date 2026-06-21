import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getPreviousUtcDateKey,
  getUtcDateKey,
  isValidDailyDateKey,
  parseDailyDateOverride,
} from "../js/dailyDate.js";
import {
  DAILY_CHALLENGE_VERSION,
  DAILY_TOTAL_WORDS,
  DAILY_WAVE_PROFILES,
} from "../js/dailyConfig.js";
import {
  createDailyVocabulary,
  generateDailyPlan,
  getDailyChallengeSeed,
} from "../js/dailyGenerator.js";

assert.equal(getUtcDateKey("2026-06-21T23:59:59-07:00"), "2026-06-22");
assert.equal(isValidDailyDateKey("2024-02-29"), true);
assert.equal(isValidDailyDateKey("2025-02-29"), false);
assert.equal(getPreviousUtcDateKey("2026-01-01"), "2025-12-31");
assert.equal(parseDailyDateOverride("?date=bad", "2026-06-21"), "2026-06-21");
assert.equal(parseDailyDateOverride("?date=2026-05-04", "2026-06-21"), "2026-05-04");
assert.equal(
  getDailyChallengeSeed("2026-06-21"),
  getDailyChallengeSeed("2026-06-21", DAILY_CHALLENGE_VERSION),
);

const typing = JSON.parse(await readFile(new URL("../data/typingTestWords.json", import.meta.url)));
const campaign = JSON.parse(await readFile(new URL("../data/theme-default.json", import.meta.url)));
const vocabulary = createDailyVocabulary({
  commonWords: typing.words,
  campaignBank: campaign,
});
const first = generateDailyPlan({ dateKey: "2026-06-21", vocabulary });
const same = generateDailyPlan({ dateKey: "2026-06-21", vocabulary });
const different = generateDailyPlan({ dateKey: "2026-06-22", vocabulary });
assert.deepEqual(first, same);
assert.notDeepEqual(first.entries.map(({ word }) => word), different.entries.map(({ word }) => word));
assert.equal(first.entries.length, DAILY_TOTAL_WORDS);
assert.equal(new Set(first.entries.map(({ word }) => word)).size, DAILY_TOTAL_WORDS);
assert.deepEqual(
  first.entries.map(({ source }) => source).reduce((counts, source) => ({
    ...counts,
    [source]: (counts[source] || 0) + 1,
  }), {}),
  { common: 23, lowMid: 7, mid: 11, difficult: 7, midHigh: 12 },
);
for (const entry of first.entries) {
  const profile = DAILY_WAVE_PROFILES[entry.wave - 1];
  assert.ok(entry.word.length >= profile.minWordLength);
  assert.ok(entry.word.length <= profile.maxWordLength);
  assert.ok(["top", "right", "bottom", "left"].includes(entry.edge));
  assert.ok(entry.edgeRatio >= 0.08 && entry.edgeRatio <= 0.92);
}
const averages = [1, 2, 3].map((wave) => {
  const entries = first.entries.filter((entry) => entry.wave === wave);
  return entries.reduce((sum, entry) => sum + entry.word.length, 0) / entries.length;
});
assert.ok(Math.abs(averages[0] - 5) <= 1);
assert.ok(Math.abs(averages[1] - 6) <= 1);
assert.ok(Math.abs(averages[2] - 7) <= 1);
assert.deepEqual(
  DAILY_WAVE_PROFILES.map(({ spawnIntervalMs, wordSpeedPxPerSec, maxSimultaneousWords }) => ({
    spawnIntervalMs, wordSpeedPxPerSec, maxSimultaneousWords,
  })),
  [
    { spawnIntervalMs: 1480, wordSpeedPxPerSec: 62, maxSimultaneousWords: 5 },
    { spawnIntervalMs: 1420, wordSpeedPxPerSec: 68, maxSimultaneousWords: 6 },
    { spawnIntervalMs: 1360, wordSpeedPxPerSec: 74, maxSimultaneousWords: 7 },
  ],
);

console.log("Daily UTC identity, deterministic plan, source mix, geometry, and pressure tests passed.");

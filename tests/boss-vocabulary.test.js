import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BOSS_BANNED_WORDS,
  BOSS_VOCABULARY_BUCKETS,
  EMERGENCY_BOSS_WORDS,
  generateBossEncounter,
  normalizeBossVocabulary,
  validateBossVocabulary,
} from "../js/bossGenerator.js";
import { loadBossWordBank } from "../js/wordBank.js";

const source = JSON.parse(
  await readFile(new URL("../data/bossWords.json", import.meta.url), "utf8"),
);
const validation = validateBossVocabulary(source);
assert.equal(validation.valid, true, validation.errors.join("\n"));
assert.ok(validation.entries.length > 400);
assert.equal(new Set(validation.entries.map(({ word }) => word)).size, validation.entries.length);
assert.ok(validation.entries.every(({ word, tier }) => (
  /^[a-z]+$/.test(word) &&
  word === word.toLowerCase() &&
  word.length >= 6 &&
  word.length <= 20 &&
  Number.isInteger(tier) &&
  tier >= 1 &&
  tier <= 10 &&
  !BOSS_BANNED_WORDS.has(word)
)));
assert.equal(validation.entries.some(({ word }) => word === "the"), false);
assert.equal(validation.entries.some(({ word }) => word === "its"), false);
for (const requirement of BOSS_VOCABULARY_BUCKETS) {
  const actual = validation.bucketCounts.find(({ min, max }) => (
    min === requirement.min && max === requirement.max
  ));
  assert.ok(actual.count >= requirement.minimum, `${requirement.min}-${requirement.max}: ${actual.count}`);
}
assert.ok(validation.lateGameCount >= 220);

const invalid = validateBossVocabulary({
  words: [
    { word: "the", tier: 1 },
    { word: "Bad-word", tier: 99 },
    { word: "quantum", tier: 2 },
    { word: "quantum", tier: 2 },
  ],
});
assert.equal(invalid.valid, false);
assert.match(invalid.errors.join("\n"), /the: length 3 is outside 6-20/);
assert.match(invalid.errors.join("\n"), /the: banned boss word/);
assert.match(invalid.errors.join("\n"), /Bad-word: must contain lowercase ASCII letters only/);
assert.match(invalid.errors.join("\n"), /quantum: duplicate word/);

const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  async json() { return source; },
});
const loaded = await loadBossWordBank();
assert.equal(loaded.source, "dedicated");
assert.equal(loaded.words.length, validation.entries.length);

const realWarn = console.warn;
let fallbackWarning = "";
console.warn = (...parts) => { fallbackWarning = parts.join(" "); };
globalThis.fetch = async () => { throw new Error("offline"); };
const emergency = await loadBossWordBank();
globalThis.fetch = realFetch;
console.warn = realWarn;
assert.equal(emergency.source, "emergency");
assert.match(fallbackWarning, /difficult emergency boss vocabulary/i);
assert.deepEqual(emergency.words, EMERGENCY_BOSS_WORDS);
assert.ok(emergency.words.every(({ word }) => word.length >= 15));
for (let level = 10; level <= 100; level += 10) {
  assert.doesNotThrow(() => generateBossEncounter(emergency, level, 77));
}

assert.equal(normalizeBossVocabulary(source).length, validation.entries.length);
console.log(`Boss vocabulary validation passed with ${validation.entries.length} difficult words.`);

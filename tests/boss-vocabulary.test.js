import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BOSS_WORD_TIERS,
  buildBossWordPools,
  getBossWordTier,
  validateBossLongVocabulary,
  validateBossWordPools,
} from "../js/bossGenerator.js";
import { loadBossWordBank } from "../js/wordBank.js";

const typingSource = JSON.parse(
  await readFile(new URL("../data/typingTestWords.json", import.meta.url), "utf8"),
);
const typingSnapshot = JSON.stringify(typingSource);
const longSource = JSON.parse(
  await readFile(new URL("../data/bossCommonLongWords.json", import.meta.url), "utf8"),
);

const longValidation = validateBossLongVocabulary(longSource);
assert.equal(longValidation.valid, true, longValidation.errors.join("\n"));
assert.ok(longValidation.words.length >= 180);
assert.equal(new Set(longValidation.words).size, longValidation.words.length);
assert.ok(longValidation.words.every((word) => /^[a-z]{9,15}$/.test(word)));

assert.equal(getBossWordTier("cat"), BOSS_WORD_TIERS.SHORT);
assert.equal(getBossWordTier("animal"), BOSS_WORD_TIERS.MEDIUM);
assert.equal(getBossWordTier("adventure"), BOSS_WORD_TIERS.LONG);
assert.equal(getBossWordTier("communication"), BOSS_WORD_TIERS.VERY_LONG);
for (const invalid of ["at", "sixteencharacters", "Bad", "two-words", "", null]) {
  assert.equal(getBossWordTier(invalid), null);
}

const pools = buildBossWordPools({
  typingWords: typingSource.words,
  longWords: longValidation.words,
});
const poolValidation = validateBossWordPools(pools);
assert.equal(poolValidation.valid, true, poolValidation.errors.join("\n"));
const allPoolWords = Object.values(pools).flat().map(({ word }) => word);
assert.equal(new Set(allPoolWords).size, allPoolWords.length);
for (const [tier, entries] of Object.entries(pools)) {
  assert.ok(entries.every(({ word }) => getBossWordTier(word) === tier));
  assert.equal(Object.isFrozen(entries), true);
}
assert.equal(JSON.stringify(typingSource), typingSnapshot);

const oldPath = new URL("../data/bossWords.json", import.meta.url);
await assert.rejects(readFile(oldPath, "utf8"));

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const text = String(url);
  return {
    ok: true,
    async json() {
      return text.includes("typingTestWords") ? typingSource : longSource;
    },
  };
};
const loaded = await loadBossWordBank();
assert.equal(loaded.source, "typing-test+curated-long");
assert.equal(validateBossWordPools(loaded.pools).valid, true);

const realWarn = console.warn;
let warning = "";
console.warn = (...parts) => { warning = parts.join(" "); };
globalThis.fetch = async () => { throw new Error("offline"); };
const emergency = await loadBossWordBank();
globalThis.fetch = realFetch;
console.warn = realWarn;
assert.equal(emergency.source, "emergency");
assert.match(warning, /recognizable emergency boss vocabulary/i);
assert.ok(Object.values(emergency.pools).flat().length > 0);

console.log(`Boss vocabulary validated with ${longValidation.words.length} curated common long words.`);

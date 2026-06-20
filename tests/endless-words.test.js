import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createEndlessVocabulary,
  createEndlessWordGenerator,
} from "../js/endlessWords.js";

const common = JSON.parse(
  await readFile(new URL("../data/typingTestWords.json", import.meta.url), "utf8"),
).words;
const campaign = JSON.parse(
  await readFile(new URL("../data/theme-default.json", import.meta.url), "utf8"),
);
const bossSource = JSON.parse(
  await readFile(new URL("../data/bossWords.json", import.meta.url), "utf8"),
);
const bossBank = {
  words: Object.entries(bossSource.tiers).flatMap(([tier, words]) => (
    words.map((word) => ({ word, tier: Number(tier) }))
  )),
};
const vocabulary = createEndlessVocabulary({
  commonWords: common,
  campaignBank: campaign,
  bossBank,
});
const generate = (seed, stage, count) => {
  const generator = createEndlessWordGenerator(vocabulary, seed);
  return Array.from({ length: count }, () => generator.next(stage));
};
const first = generate(12345, 1, 20);
assert.deepEqual(first, generate(12345, 1, 20));
assert.notDeepEqual(first, generate(54321, 1, 20));
assert.equal(new Set(first).size, 20);
assert.ok(first.every((word) => word.length >= 3 && word.length <= 6));
const late = generate(12345, 31, 40);
assert.ok(late.every((word) => word.length >= 3 && word.length <= 14));
assert.equal(late.some((word) => word.length <= 5), true);
const generator = createEndlessWordGenerator(vocabulary, 99);
for (let index = 0; index < 100; index += 1) generator.next(25 + Math.floor(index / 20));
assert.ok(generator.recentWords.length <= 40);

console.log("Endless deterministic blended vocabulary and bounded repetition tests passed.");

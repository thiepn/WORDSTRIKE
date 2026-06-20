import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildBossWordPools, generateBossEncounter } from "../js/bossGenerator.js";
import { generateLevel } from "../js/levelGenerator.js";
import { createNormalWordAttempt } from "../js/wordBank.js";
import {
  createAttemptSeed,
  createSeededRandom,
  parseDeveloperSeed,
  shuffleSeeded,
} from "../js/random.js";

const wordBank = JSON.parse(
  await readFile(new URL("../data/theme-default.json", import.meta.url), "utf8"),
);
const typingBank = JSON.parse(await readFile(
  new URL("../data/typingTestWords.json", import.meta.url),
  "utf8",
));
const longBank = JSON.parse(await readFile(
  new URL("../data/bossCommonLongWords.json", import.meta.url),
  "utf8",
));
const bossBank = {
  pools: buildBossWordPools({
    typingWords: typingBank.words,
    longWords: longBank.words,
  }),
};

const normalConfig = generateLevel(67);
const first = createNormalWordAttempt(wordBank, normalConfig, 12345);
const repeat = createNormalWordAttempt(wordBank, normalConfig, 12345);
const different = createNormalWordAttempt(wordBank, normalConfig, 54321);
assert.deepEqual(first, repeat);
assert.ok(
  first.selectedWords.join("|") !== different.selectedWords.join("|") ||
  first.spawnQueue.join("|") !== different.spawnQueue.join("|"),
);
assert.equal(first.selectedWords.length, normalConfig.wordCount);
assert.equal(first.spawnQueue.length, normalConfig.wordCount);
assert.equal(new Set(first.selectedWords).size, first.selectedWords.length);
assert.ok(first.selectedWords.every((word) => /^[a-z]+$/.test(word)));
assert.ok(first.selectedWords.every((word) => (
  word.length >= normalConfig.minWordLength &&
  word.length <= normalConfig.maxWordLength
)));
assert.deepEqual([...first.spawnQueue].sort(), [...first.selectedWords].sort());

const shuffled = shuffleSeeded(["a", "b", "c", "d"], 99);
assert.deepEqual(shuffled, shuffleSeeded(["a", "b", "c", "d"], 99));
assert.notDeepEqual(shuffled, shuffleSeeded(["a", "b", "c", "d"], 100));
const random = createSeededRandom(123);
assert.deepEqual(
  [random(), random(), random()],
  (() => {
    const again = createSeededRandom(123);
    return [again(), again(), again()];
  })(),
);
assert.equal(parseDeveloperSeed("?dev=1&seed=12345"), 12345);
assert.equal(parseDeveloperSeed("?dev=1&seed=bad"), null);
assert.ok(Number.isInteger(createAttemptSeed()));
assert.ok(new Set(Array.from({ length: 8 }, createAttemptSeed)).size > 1);

let differentBossSeedCount = 0;
for (const level of [10, 30, 50, 70, 100]) {
  const firstBoss = generateBossEncounter(bossBank, level, 12345);
  const repeatBoss = generateBossEncounter(bossBank, level, 12345);
  const differentBoss = generateBossEncounter(bossBank, level, 54321);
  assert.deepEqual(firstBoss, repeatBoss);
  if (firstBoss.segments.join("|") !== differentBoss.segments.join("|")) {
    differentBossSeedCount += 1;
  }
}
assert.ok(differentBossSeedCount >= 4);

console.log("Attempt seed, unchanged normal variation, and seeded boss variation tests passed.");

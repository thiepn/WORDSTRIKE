import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createSpeedTestWordStream,
  generateSpeedTestWords,
  SPEED_TEST_WORD_SET,
  validateSpeedTestVocabulary,
} from "../js/speedTestWords.js";

const source = JSON.parse(
  await readFile(new URL("../data/english200.json", import.meta.url), "utf8"),
);
const validation = validateSpeedTestVocabulary(source);
assert.equal(validation.valid, true, validation.errors.join("\n"));
assert.equal(validation.words.length, 199);
assert.equal(new Set(validation.words).size, validation.words.length);
assert.ok(validation.words.every((word) => /^[a-z]{1,10}$/.test(word)));
assert.deepEqual(SPEED_TEST_WORD_SET, {
  id: "english-200", name: "English 200", version: 1, wordCount: 199,
});

const first = generateSpeedTestWords(validation.words, 12345, "time-60", 600);
const repeat = generateSpeedTestWords(validation.words, 12345, "time-60", 600);
const different = generateSpeedTestWords(validation.words, 54321, "time-60", 600);
assert.deepEqual(first, repeat);
assert.notDeepEqual(first.slice(0, 100), different.slice(0, 100));
assert.equal(first.length, 600);
assert.ok(first.every((word) => validation.words.includes(word)));

const stream = createSpeedTestWordStream(validation.words, 77, "time-120");
stream.ensure(validation.words.length + 10);
assert.ok(stream.words.length >= validation.words.length + 10);
assert.equal(
  stream.words[198] === stream.words[199],
  false,
);
assert.equal(typeof stream.baseSeed, "number");
assert.equal(typeof stream.lastBatchSeed, "number");
assert.ok(stream.batchCount > 1);
assert.equal(generateSpeedTestWords(validation.words, 9, "words-100", 100).length, 100);

const invalid = validateSpeedTestVocabulary({
  words: ["Bad", "two-two", "valid", "valid"],
});
assert.equal(invalid.valid, false);
assert.match(invalid.errors.join("\n"), /duplicate/);
assert.match(invalid.errors.join("\n"), /1-10 letters/);

console.log("Typing Test vocabulary and deterministic extendable word-stream tests passed.");

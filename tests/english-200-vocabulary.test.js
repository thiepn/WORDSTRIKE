import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SPEED_TEST_WORD_SET } from "../js/speedTestWords.js";

const approved = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it",
  "that", "for", "they", "with", "as", "not", "on", "she", "at", "by",
  "this", "we", "you", "do", "but", "from", "or", "which", "one", "would",
  "all", "will", "there", "say", "who", "make", "when", "can", "more", "if",
  "no", "man", "out", "other", "so", "what", "time", "up", "go", "about",
  "than", "into", "could", "state", "only", "new", "year", "some", "take", "come",
  "these", "know", "see", "use", "get", "like", "then", "first", "any", "work",
  "now", "may", "such", "give", "over", "think", "most", "even", "find", "day",
  "also", "after", "way", "many", "must", "look", "before", "great", "back", "through",
  "long", "where", "much", "should", "well", "people", "down", "own", "just", "because",
  "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little",
  "world", "very", "still", "nation", "hand", "old", "life", "tell", "write", "become",
  "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under",
  "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin",
  "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form",
  "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest",
  "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again",
  "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however",
  "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact",
  "group", "play", "stand", "increase", "early", "course", "change", "help", "line",
];

const source = JSON.parse(
  await readFile(new URL("../data/english200.json", import.meta.url), "utf8"),
);
assert.deepEqual(source.words, approved);
assert.equal(source.words.length, 199);
assert.equal(new Set(source.words).size, 199);
assert.equal(source.words.includes("I"), false);
assert.equal(source.words.includes("i"), false);
assert.ok(source.words.every((word) => typeof word === "string" && word.length > 0));
assert.ok(source.words.every((word) => /^[a-z]+$/.test(word)));
assert.equal(source.wordSetId, "english-200");
assert.equal(source.wordSetName, "English 200");
assert.equal(source.wordSetVersion, 1);
assert.equal(source.wordCount, 199);
assert.deepEqual(SPEED_TEST_WORD_SET, {
  id: "english-200",
  name: "English 200",
  version: 1,
  wordCount: 199,
});

console.log("Approved list length: 199");
console.log("Unique list length: 199");
console.log("I present: false");
console.log("i present: false");

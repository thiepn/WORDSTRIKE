import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const english = JSON.parse(
  await readFile(new URL("../data/english200.json", import.meta.url), "utf8"),
);
const legacyRaw = await readFile(
  new URL("../data/typingTestWords.json", import.meta.url),
  "utf8",
);
const legacy = JSON.parse(legacyRaw);
const originalLegacyHashMaterial = legacyRaw;
assert.equal(
  createHash("sha256").update(legacyRaw).digest("hex"),
  "ef87f74d6a5fbdf396b93a25cd40e74b0205908a74449a02332b7cd393f63abf",
);

globalThis.fetch = async (url) => {
  const path = String(url);
  if (path.includes("english200.json")) {
    return { ok: true, async json() { return english; } };
  }
  if (path.includes("typingTestWords.json")) {
    return { ok: true, async json() { return legacy; } };
  }
  return { ok: false, status: 404 };
};

const {
  createSpeedTestWordStream,
  loadSpeedTestWordBank,
} = await import("../js/speedTestWords.js");
const { loadCommonWordBank } = await import("../js/wordBank.js");
const speedBank = await loadSpeedTestWordBank();
const commonBank = await loadCommonWordBank();
assert.equal(speedBank.wordSet.id, "english-200");
assert.equal(speedBank.words.length, 199);
assert.deepEqual(speedBank.words, english.words);
assert.equal(commonBank.words.length, 740);
assert.deepEqual(commonBank.words, legacy.words);

for (const configId of [
  "time-15", "time-30", "time-60", "time-120",
  "words-25", "words-50", "words-100",
]) {
  const first = createSpeedTestWordStream(speedBank.words, 12345, configId);
  const repeat = createSpeedTestWordStream(speedBank.words, 12345, configId);
  first.ensure(800);
  repeat.ensure(800);
  assert.deepEqual(first.words, repeat.words);
  assert.ok(first.words.every((word) => english.words.includes(word)));
  assert.equal(first.words.includes("I"), false);
  assert.equal(first.words.includes("i"), false);
  assert.ok(first.words.every((word, index) => index === 0 || word !== first.words[index - 1]));
  assert.deepEqual(new Set(first.words.slice(0, 199)), new Set(english.words));
}
assert.equal(
  await readFile(new URL("../data/typingTestWords.json", import.meta.url), "utf8"),
  originalLegacyHashMaterial,
);

const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
const speedLoader = await readFile(new URL("../js/speedTestWords.js", import.meta.url), "utf8");
assert.match(speedLoader, /data\/english200\.json/);
assert.doesNotMatch(speedLoader, /data\/typingTestWords\.json/);
assert.match(main, /commonWords:\s*appState\.commonWordBank\.words/g);
assert.doesNotMatch(main, /commonWords:\s*appState\.speedTestWordBank\.words/);

console.log("English 200 loader, deterministic extension, no duplicates, and cross-mode 740-word isolation passed.");

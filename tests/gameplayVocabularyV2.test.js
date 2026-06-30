import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildDataset, EXCLUDED_WORDS } from "../scripts/buildWordPools.mjs";

const data = JSON.parse(await readFile(new URL("../data/commonGameplayWords.json", import.meta.url), "utf8"));
assert.equal(data.schemaVersion, 2);
assert.equal(data.source.license, "MIT");
assert.match(data.source.url, /first20hours\/google-10000-english/);
assert.equal(data.words.length, 3000);
assert.equal(new Set(data.words.map(({ word }) => word)).size, 3000);
assert.ok(data.words.every(({ word }) => /^[a-z]{2,12}$/.test(word)));
assert.ok(data.words.every((entry, index) => index === 0 || entry.frequencyRank > data.words[index - 1].frequencyRank));
for (const term of ["viewport", "breakpoint", "renderer", "websocket", "debugging", "bandwidth", "prototype", "overdrive"]) {
  assert.equal(data.words.some(({ word }) => word === term), false, `${term} must be excluded`);
  assert.equal(EXCLUDED_WORDS.has(term), true);
}
const tierWords = Object.values(data.tiers).flat();
assert.deepEqual(Object.values(data.tiers).map((tier) => tier.length), [600, 600, 600, 600, 600]);
assert.equal(new Set(tierWords).size, 3000);
assert.deepEqual(new Set(tierWords), new Set(data.words.map(({ word }) => word)));

const alpha = (number) => {
  let value = number;
  let output = "";
  do { output = String.fromCharCode(97 + value % 26) + output; value = Math.floor(value / 26); } while (value);
  return `w${output}`;
};
const synthetic = Array.from({ length: 4000 }, (_, index) => alpha(index)).join("\n");
assert.deepEqual(buildDataset(synthetic), buildDataset(synthetic));

const english200 = JSON.parse(await readFile(new URL("../data/english200.json", import.meta.url), "utf8"));
assert.equal(english200.wordSetVersion, 1);
assert.equal(english200.wordSetId, "english-200");

console.log("Gameplay vocabulary v2 has 3,000 sourced, filtered, deterministic, tiered words; English 200 v1 is unchanged.");

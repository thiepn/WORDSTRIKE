import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AMBIGUOUS_NAME_ALLOWLIST,
  buildDataset,
  EXCLUDED_WORDS,
  GEOGRAPHIC_ALLOWLIST,
  INFLECTION_EXCEPTIONS,
} from "../scripts/buildWordPools.mjs";

const data = JSON.parse(await readFile(new URL("../data/commonGameplayWords.json", import.meta.url), "utf8"));
const names = JSON.parse(await readFile(new URL("../data/personalNameExclusions.json", import.meta.url), "utf8"));
assert.equal(data.schemaVersion, 2);
assert.equal(data.source.license, "MIT");
assert.match(data.source.url, /first20hours\/google-10000-english/);
assert.equal(data.words.length, 3000);
assert.equal(names.names.length, 1656);
assert.equal(names.source.license, "CC0-1.0 / U.S. public-domain data");
assert.match(names.source.datasetUrl, /catalog\.data\.gov/);
assert.equal(names.source.sourceSha256, "f9aa39846ff5b724e8bc497d3c0d2d5d777ed483c93f5508f8a3bd25e3313018");
assert.equal(new Set(data.words.map(({ word }) => word)).size, 3000);
assert.ok(data.words.every(({ word }) => /^[a-z]{2,12}$/.test(word)));
assert.ok(data.words.every((entry, index) => index === 0 || entry.frequencyRank > data.words[index - 1].frequencyRank));
for (const term of ["viewport", "breakpoint", "renderer", "websocket", "debugging", "bandwidth", "prototype", "overdrive"]) {
  assert.equal(data.words.some(({ word }) => word === term), false, `${term} must be excluded`);
  assert.equal(EXCLUDED_WORDS.has(term), true);
}
for (const term of ["james", "jan", "john", "mary", "michael", "sarah", "api", "html", "utc", "dsl", "goes", "costs", "worked", "working"]) {
  assert.equal(data.words.some(({ word }) => word === term), false, `${term} must be filtered`);
}
const allowedNameWords = new Set([...AMBIGUOUS_NAME_ALLOWLIST, ...GEOGRAPHIC_ALLOWLIST, ...INFLECTION_EXCEPTIONS]);
const selectedWords = new Set(data.words.map(({ word }) => word));
for (const name of names.names) {
  if (!allowedNameWords.has(name)) assert.equal(selectedWords.has(name), false, `${name} is a blocked personal name`);
}
for (const term of ["address", "grass", "was", "does", "done", "gone", "england", "berlin"]) {
  assert.equal(data.words.some(({ word }) => word === term), true, `${term} must be preserved`);
}
assert.deepEqual(data.statistics, {
  totalWords: 3000,
  wordsPerTier: { 1: 600, 2: 600, 3: 600, 4: 600, 5: 600 },
  sEndingTotal: 264,
  likelyPluralOrVerbSTotal: 0,
  edEndingTotal: 91,
  likelyPastTenseTotal: 0,
  ingEndingTotal: 59,
  likelyContinuousTotal: 0,
  personalNamesRemoved: 404,
  abbreviationsRemoved: 1047,
  regularInflectionsRemoved: 2062,
  geographicNamesIncluded: [
    "canada", "america", "china", "london", "france", "europe", "germany", "india",
    "japan", "africa", "england", "mexico", "italy", "ireland", "asia", "spain",
    "paris", "scotland", "korea", "wales", "brazil", "rome", "egypt", "berlin",
  ],
});
assert.ok(data.statistics.geographicNamesIncluded.length / data.words.length < 0.02);
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

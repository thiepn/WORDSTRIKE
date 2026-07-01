import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildDataset,
  SOURCE_SHA256,
  validateManualReview,
} from "../scripts/buildWordPools.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const data = await readJson("../data/commonGameplayWords.json");
const review = await readJson("../data/commonGameplayWords.manual-review.json");
const qualityRules = await readJson("../data/vocabularyQualityRules.json");
const names = await readJson("../data/personalNameExclusions.json");

// Review entries are a contiguous row-level record of the source prefix. Rebuilding
// this prefix verifies every recorded rank and every KEEP/REMOVE decision without
// requiring the licensed upstream source file in the repository.
const reviewedSourcePrefix = `${review.entries.map(({ word }) => word).join("\n")}\n`;
const validation = validateManualReview(reviewedSourcePrefix, {
  review,
  qualityRules,
  personalNames: names.names,
});
assert.equal(validation.valid, true, validation.errors.join("\n"));
assert.equal(review.manualReviewCompleted, true);
assert.equal(review.source.sourceSha256, SOURCE_SHA256);
assert.equal(review.reviewedCandidateCount, 7406);
assert.equal(review.approvedCount, 3000);
assert.equal(review.entries.length, 7406);
assert.ok(review.entries.every((entry) => (
  typeof entry.word === "string"
  && Number.isSafeInteger(entry.sourceFrequencyRank)
  && ["KEEP", "REMOVE"].includes(entry.decision)
  && typeof entry.category === "string"
  && entry.category.length > 0
  && typeof entry.reviewNote === "string"
  && entry.reviewNote.length > 0
)));

const rebuilt = buildDataset(reviewedSourcePrefix, {
  review,
  qualityRules,
  personalNames: names.names,
  personalNameSource: names.source,
});
assert.deepEqual(rebuilt, data);
assert.equal(data.schemaVersion, 2);
assert.equal(data.words.length, 3000);
assert.equal(new Set(data.words.map(({ word }) => word)).size, 3000);
assert.ok(data.words.every(({ word }) => /^[a-z]{2,12}$/.test(word)));
assert.deepEqual(Object.values(data.tiers).map((tier) => tier.length), [600, 600, 600, 600, 600]);
assert.deepEqual(
  new Set(Object.values(data.tiers).flat()),
  new Set(data.words.map(({ word }) => word)),
);
assert.deepEqual(data.statistics, {
  totalWords: 3000,
  wordsPerTier: { 1: 600, 2: 600, 3: 600, 4: 600, 5: 600 },
  manuallyReviewedCount: 7406,
  manuallyApprovedCount: 3000,
  sEndingTotal: 104,
  likelyPluralOrVerbSTotal: 0,
  edEndingTotal: 12,
  likelyPastTenseTotal: 0,
  ingEndingTotal: 25,
  likelyContinuousTotal: 0,
  removedByCategory: {
    "malformed-token": 145,
    abbreviation: 613,
    "technical-term": 77,
    "inflected-form": 1890,
    "organization-or-institution": 3,
    "company-or-brand": 47,
    "other-proper-noun": 123,
    "obscure-word": 1055,
    "personal-name": 300,
    "us-city": 41,
    "us-state": 39,
    "offensive-or-unsuitable": 29,
    "duplicate-variant": 33,
    "scientific-term": 11,
  },
  companiesBrandsRemoved: 47,
  usStatesRemoved: 39,
  usCitiesRemoved: 41,
  personalNamesRemoved: 300,
  technicalTermsRemoved: 88,
  abbreviationsRemoved: 613,
  regularInflectionsRemoved: 1890,
  ambiguousOrdinaryWordsRetained: [
    "will", "may", "art", "april", "mobile", "august", "blue", "bill",
    "mark", "bank", "king", "hope", "union", "bush", "summer", "normal",
    "target", "winter", "apple", "square", "rose", "orange", "faith", "bear",
    "hunter", "turkey", "cook", "potter", "shell", "grace", "rob", "liberty",
    "joy", "foster", "baker", "independence", "singer", "mason",
  ],
  geographicNamesIncluded: [
    "china", "london", "france", "germany", "india", "japan", "england",
    "paris", "korea", "rome", "berlin",
  ],
});

const english200 = await readJson("../data/english200.json");
assert.equal(english200.wordSetVersion, 1);
assert.equal(english200.wordSetId, "english-200");

console.log("Manual review ledger reproduces the 3,000-word, five-tier gameplay vocabulary exactly.");

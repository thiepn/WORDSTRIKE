import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const SOURCE_URL = "https://github.com/first20hours/google-10000-english";
const SOURCE_FILE = "google-10000-english-usa-no-swears.txt";
export const SOURCE_SHA256 = "ee2d83651fbb91642bbed2bd30ead404c2cfbdfece01dacf284af6ea47795811";
export const OUTPUT_COUNT = 3000;

export const INFLECTION_EXCEPTIONS = new Set(`
address access across business class glass grass less loss mass pass press process success
analysis basis crisis focus gas his its news series status virus canvas bonus campus minus
was were been did done gone had has does means always perhaps towards clothes
morning evening thing spring ring king bring sing wing ceiling during
`.trim().split(/\s+/));

function baseCandidates(word) {
  const candidates = [];
  if (word.length >= 4 && word.endsWith("ies")) candidates.push(`${word.slice(0, -3)}y`);
  if (word.length >= 4 && word.endsWith("es")) {
    candidates.push(word.slice(0, -2), word.slice(0, -1));
  } else if (word.length > 3 && word.endsWith("s")) {
    candidates.push(word.slice(0, -1));
  }
  if (word.length >= 4 && word.endsWith("ied")) candidates.push(`${word.slice(0, -3)}y`);
  if (word.length >= 4 && word.endsWith("ed")) {
    const stem = word.slice(0, -2);
    candidates.push(stem, word.slice(0, -1));
    if (/(.)\1$/.test(stem)) candidates.push(stem.slice(0, -1));
  }
  if (word.length >= 5 && word.endsWith("ing")) {
    const stem = word.slice(0, -3);
    candidates.push(stem, `${stem}e`);
    if (/(.)\1$/.test(stem)) candidates.push(stem.slice(0, -1));
  }
  return [...new Set(candidates)];
}

export function findInflectionBase(word, sourceWords) {
  if (INFLECTION_EXCEPTIONS.has(word)) return null;
  const hasWord = sourceWords instanceof Map
    ? (candidate) => sourceWords.has(candidate)
    : sourceWords instanceof Set
      ? (candidate) => sourceWords.has(candidate)
      : (candidate) => Array.isArray(sourceWords) && sourceWords.includes(candidate);
  return baseCandidates(word).find(hasWord) || null;
}

export function analyzeMorphology(words, sourceWords) {
  const values = words.map((entry) => typeof entry === "string" ? entry : entry.word);
  return {
    sEndingTotal: values.filter((word) => word.endsWith("s")).length,
    likelyPluralOrVerbSTotal: values.filter((word) => word.endsWith("s") && Boolean(findInflectionBase(word, sourceWords))).length,
    edEndingTotal: values.filter((word) => word.endsWith("ed")).length,
    likelyPastTenseTotal: values.filter((word) => word.endsWith("ed") && Boolean(findInflectionBase(word, sourceWords))).length,
    ingEndingTotal: values.filter((word) => word.endsWith("ing")).length,
    likelyContinuousTotal: values.filter((word) => word.endsWith("ing") && Boolean(findInflectionBase(word, sourceWords))).length,
  };
}

function exclusionMap(qualityRules) {
  const blocked = new Map();
  for (const [category, words] of Object.entries(qualityRules?.exclusions || {})) {
    for (const word of words || []) if (!blocked.has(word)) blocked.set(word, category);
  }
  return blocked;
}

function countRemoved(entries) {
  const counts = {};
  for (const entry of entries) {
    if (entry.decision !== "REMOVE") continue;
    counts[entry.category] = (counts[entry.category] || 0) + 1;
  }
  return counts;
}

export function validateManualReview(sourceText, {
  review,
  qualityRules,
  personalNames = [],
} = {}) {
  const errors = [];
  const sourceWords = sourceText.split(/\r?\n/).map((word) => word.trim());
  const sourceSet = new Set(sourceWords);
  const entries = Array.isArray(review?.entries) ? review.entries : [];
  const blocked = exclusionMap(qualityRules);
  const ambiguous = new Set(qualityRules?.ambiguousOrdinaryWords || []);
  const allowedGeography = new Set(qualityRules?.allowedGeographicNames || []);
  const shortAllowlist = new Set(qualityRules?.shortWordAllowlist || []);
  const names = new Set(personalNames);
  const seen = new Set();

  if (review?.manualReviewCompleted !== true) errors.push("Manual review is not marked complete");
  if (review?.source?.sourceSha256 !== SOURCE_SHA256) errors.push("Review source checksum mismatch");
  if (!entries.length || review?.reviewedCandidateCount !== entries.length) errors.push("Reviewed candidate count mismatch");

  for (const entry of entries) {
    const word = entry?.word;
    if (typeof word !== "string" || seen.has(word)) {
      errors.push(`Invalid or duplicate review word: ${String(word)}`);
      continue;
    }
    seen.add(word);
    if (!Number.isSafeInteger(entry.sourceFrequencyRank) || sourceWords[entry.sourceFrequencyRank - 1] !== word) {
      errors.push(`Source rank mismatch: ${word}`);
    }
    if (!["KEEP", "REMOVE"].includes(entry.decision)) errors.push(`Invalid decision: ${word}`);
    if (typeof entry.category !== "string" || !entry.category) errors.push(`Missing category: ${word}`);
    if (typeof entry.reviewNote !== "string" || !entry.reviewNote) errors.push(`Missing review note: ${word}`);
    if (entry.decision === "REMOVE" && entry.difficultyTier != null) errors.push(`Removed word has a tier: ${word}`);
  }

  const kept = entries.filter((entry) => entry.decision === "KEEP");
  if (kept.length !== OUTPUT_COUNT) errors.push(`Expected ${OUTPUT_COUNT} approved words, found ${kept.length}`);
  for (const entry of kept) {
    const { word } = entry;
    if (!/^[a-z]{2,12}$/.test(word)) errors.push(`Malformed approved word: ${word}`);
    if (!Number.isInteger(entry.difficultyTier) || entry.difficultyTier < 1 || entry.difficultyTier > 5) {
      errors.push(`Invalid difficulty tier: ${word}`);
    }
    if (word.length <= 3 && !shortAllowlist.has(word)) errors.push(`Unapproved short word: ${word}`);
    if (blocked.has(word) && !ambiguous.has(word) && !allowedGeography.has(word)) {
      errors.push(`Blocked ${blocked.get(word)} word was approved: ${word}`);
    }
    if (names.has(word) && !ambiguous.has(word) && !allowedGeography.has(word)) {
      errors.push(`Blocked personal name was approved: ${word}`);
    }
    if (!sourceSet.has(word)) errors.push(`Approved word missing from source: ${word}`);
  }
  const tierCounts = Object.fromEntries(Array.from({ length: 5 }, (_, index) => {
    const tier = index + 1;
    return [String(tier), kept.filter((entry) => entry.difficultyTier === tier).length];
  }));
  if (Object.values(tierCounts).some((count) => count !== 600)) errors.push("Difficulty tiers must contain exactly 600 words each");
  const morphology = analyzeMorphology(kept, sourceSet);
  if (morphology.likelyPluralOrVerbSTotal || morphology.likelyPastTenseTotal || morphology.likelyContinuousTotal) {
    errors.push("Approved review contains a removable regular inflection");
  }
  return Object.freeze({ valid: errors.length === 0, errors, entries, kept, tierCounts, morphology });
}

export function buildDataset(sourceText, options = {}) {
  const validation = validateManualReview(sourceText, options);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  const { review, qualityRules, personalNameSource = null } = options;
  const removedByCategory = countRemoved(validation.entries);
  const allowedGeography = new Set(qualityRules.allowedGeographicNames);
  const ambiguous = new Set(qualityRules.ambiguousOrdinaryWords);
  const words = validation.kept
    .map((entry) => ({
      word: entry.word,
      frequencyRank: entry.sourceFrequencyRank,
      difficultyTier: entry.difficultyTier,
    }))
    .sort((a, b) => a.frequencyRank - b.frequencyRank);
  const tiers = Object.fromEntries(Array.from({ length: 5 }, (_, index) => {
    const tier = index + 1;
    return [String(tier), words.filter((entry) => entry.difficultyTier === tier).map(({ word }) => word)];
  }));
  const geographicNames = words.filter(({ word }) => allowedGeography.has(word)).map(({ word }) => word);
  const ambiguousRetained = words.filter(({ word }) => ambiguous.has(word)).map(({ word }) => word);
  return {
    schemaVersion: 2,
    source: {
      name: "google-10000-english (US no-swears)",
      url: SOURCE_URL,
      file: SOURCE_FILE,
      license: "MIT",
      retrieved: "2026-06-30",
      sourceSha256: SOURCE_SHA256,
      description: "Frequency-ranked from Google's Trillion Word Corpus; every selected word is manually approved.",
    },
    supportingSources: [
      ...(personalNameSource ? [{ ...personalNameSource, purpose: "Personal-name review support" }] : []),
      ...(qualityRules.supportingSources || []),
    ],
    filtering: {
      format: "lowercase ASCII letters, 2-12 characters",
      unique: true,
      outputCount: OUTPUT_COUNT,
      manualReviewArtifact: "data/commonGameplayWords.manual-review.json",
      qualityRules: "data/vocabularyQualityRules.json",
      tiering: "72% source-frequency position and 28% typing complexity; manual recognizability approval is mandatory.",
    },
    statistics: {
      totalWords: words.length,
      wordsPerTier: validation.tierCounts,
      manuallyReviewedCount: review.reviewedCandidateCount,
      manuallyApprovedCount: words.length,
      ...validation.morphology,
      removedByCategory,
      companiesBrandsRemoved: removedByCategory["company-or-brand"] || 0,
      usStatesRemoved: removedByCategory["us-state"] || 0,
      usCitiesRemoved: removedByCategory["us-city"] || 0,
      personalNamesRemoved: removedByCategory["personal-name"] || 0,
      technicalTermsRemoved: (removedByCategory["technical-term"] || 0) + (removedByCategory["scientific-term"] || 0),
      abbreviationsRemoved: removedByCategory.abbreviation || 0,
      regularInflectionsRemoved: removedByCategory["inflected-form"] || 0,
      ambiguousOrdinaryWordsRetained: ambiguousRetained,
      geographicNamesIncluded: geographicNames,
    },
    words,
    tiers,
  };
}

async function main() {
  const [sourcePath, reviewPath, rulesPath, namesPath, outputArg] = process.argv.slice(2);
  if (!sourcePath || !reviewPath || !rulesPath || !namesPath) {
    throw new Error("Usage: node scripts/buildWordPools.mjs <frequency-list> <manual-review-json> <quality-rules-json> <name-exclusions-json> [output-json]");
  }
  const outputPath = outputArg || new URL("../data/commonGameplayWords.json", import.meta.url);
  const source = await readFile(sourcePath, "utf8");
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== SOURCE_SHA256) throw new Error(`Unexpected source checksum: ${hash}`);
  const review = JSON.parse(await readFile(reviewPath, "utf8"));
  const qualityRules = JSON.parse(await readFile(rulesPath, "utf8"));
  const namesSource = JSON.parse(await readFile(namesPath, "utf8"));
  const dataset = buildDataset(source, {
    review,
    qualityRules,
    personalNames: namesSource.names,
    personalNameSource: namesSource.source,
  });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(dataset.statistics, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) await main();

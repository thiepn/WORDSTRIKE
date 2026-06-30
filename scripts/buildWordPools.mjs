import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const SOURCE_URL = "https://github.com/first20hours/google-10000-english";
const SOURCE_FILE = "google-10000-english-usa-no-swears.txt";
const SOURCE_SHA256 = "ee2d83651fbb91642bbed2bd30ead404c2cfbdfece01dacf284af6ea47795811";
const OUTPUT_COUNT = 3000;

export const SHORT_WORD_ALLOWLIST = new Set(`
an as at be by do go he if in is it me my no of on or so to up us we am did had has may
can how man new now old one our out own put say see she too two use way who why you
was
`.trim().split(/\s+/));

export const INFLECTION_EXCEPTIONS = new Set(`
address access across business class glass grass less loss mass pass press process success
analysis basis crisis focus gas his its news series status virus canvas bonus campus minus
was were been did done gone had has does means always perhaps towards clothes
morning evening thing spring ring king ceiling during
`.trim().split(/\s+/));

export const REQUIRED_COMMON_FORMS = new Set(`
address access across business class glass grass less loss mass pass press process success
did done gone been was were had has does
`.trim().split(/\s+/));

export const AMBIGUOUS_NAME_ALLOWLIST = new Set(`
will may mark rose hope grace faith joy summer autumn april june august bill bob rob
`.trim().split(/\s+/));

export const GEOGRAPHIC_ALLOWLIST = new Set(`
england france germany korea japan china india paris berlin london rome canada mexico
italy spain europe africa asia america brazil egypt ireland scotland wales
`.trim().split(/\s+/));

export const EXCLUDED_WORDS = new Set(`
adobe ajax amazon amd android apache apple asus bbc bluetooth canon cbs craigslist dell
disney ebay firefox github google hewlett hp ibm intel microsoft mozilla mysql nasa netflix
nginx nike nokia oracle paypal pinterest reddit samsung sony spotify twitter ubuntu verizon
windows wordpress yahoo youtube viewport breakpoint debugging bandwidth overdrive prototype
renderer websocket cryptocurrency blockchain javascript jquery runtime backend frontend
firmware malware spyware localhost pixel shader chipset codec servlet desktop gateway
api css cpu dsl ftp gps html http https php ram sql tcp usb utc dns url xml vpn pdf
`.trim().split(/\s+/));

function complexity(word) {
  const uncommon = (word.match(/[jqxz]/g) || []).length;
  const clusters = (word.match(/[^aeiou]{3,}/g) || []).join("").length;
  const repeats = /(.)\1/.test(word) ? 1 : 0;
  const morphology = /(tion|ment|ness|able|ible|ally|ously|ative|istic)$/.test(word) ? 1 : 0;
  return Math.min(1, Math.max(0, word.length - 4) / 10 + uncommon * 0.16 + clusters * 0.025 + repeats * 0.08 + morphology * 0.1);
}

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

export function findInflectionBase(word, rankByWord) {
  if (INFLECTION_EXCEPTIONS.has(word)) return null;
  const formRank = rankByWord.get(word) ?? Infinity;
  return baseCandidates(word).find((base) => {
    const baseRank = rankByWord.get(base);
    return Number.isFinite(baseRank) && baseRank < formRank;
  }) || null;
}

export function analyzeMorphology(words, rankByWord) {
  const values = words.map((entry) => typeof entry === "string" ? entry : entry.word);
  return {
    sEndingTotal: values.filter((word) => word.endsWith("s")).length,
    likelyPluralOrVerbSTotal: values.filter((word) => word.endsWith("s") && Boolean(findInflectionBase(word, rankByWord))).length,
    edEndingTotal: values.filter((word) => word.endsWith("ed")).length,
    likelyPastTenseTotal: values.filter((word) => word.endsWith("ed") && Boolean(findInflectionBase(word, rankByWord))).length,
    ingEndingTotal: values.filter((word) => word.endsWith("ing")).length,
    likelyContinuousTotal: values.filter((word) => word.endsWith("ing") && Boolean(findInflectionBase(word, rankByWord))).length,
  };
}

export function buildDataset(sourceText, { personalNames = [], personalNameSource = null } = {}) {
  const rawWords = sourceText.split(/\r?\n/).map((word) => word.trim());
  const rankByWord = new Map();
  rawWords.forEach((word, index) => { if (!rankByWord.has(word)) rankByWord.set(word, index + 1); });
  const nameSet = new Set(personalNames);
  const seen = new Set();
  const eligible = [];
  const removed = { personalNames: 0, abbreviations: 0, inflections: 0, invalid: 0 };
  for (let sourceIndex = 0; sourceIndex < rawWords.length; sourceIndex += 1) {
    const word = rawWords[sourceIndex];
    if (!/^[a-z]{2,12}$/.test(word) || seen.has(word)) { removed.invalid += 1; continue; }
    if ((word.length <= 3 && !SHORT_WORD_ALLOWLIST.has(word)) || EXCLUDED_WORDS.has(word)) {
      removed.abbreviations += 1; continue;
    }
    if (nameSet.has(word) && !AMBIGUOUS_NAME_ALLOWLIST.has(word) && !GEOGRAPHIC_ALLOWLIST.has(word) && !INFLECTION_EXCEPTIONS.has(word)) {
      removed.personalNames += 1; continue;
    }
    if (findInflectionBase(word, rankByWord)) { removed.inflections += 1; continue; }
    seen.add(word);
    eligible.push({ word, frequencyRank: sourceIndex + 1 });
  }
  const candidates = eligible.slice(0, OUTPUT_COUNT);
  for (const required of REQUIRED_COMMON_FORMS) {
    if (candidates.some(({ word }) => word === required)) continue;
    const requiredEntry = eligible.find(({ word }) => word === required);
    if (!requiredEntry) continue;
    const replaceIndex = candidates.findLastIndex(({ word }) => !REQUIRED_COMMON_FORMS.has(word));
    candidates.splice(replaceIndex, 1, requiredEntry);
  }
  candidates.sort((a, b) => a.frequencyRank - b.frequencyRank);
  if (candidates.length !== OUTPUT_COUNT) throw new Error(`Expected ${OUTPUT_COUNT} words, found ${candidates.length}`);

  const scored = candidates.map((entry, index) => ({
    ...entry,
    difficultyScore: (index / (OUTPUT_COUNT - 1)) * 0.72 + complexity(entry.word) * 0.28,
  })).sort((a, b) => a.difficultyScore - b.difficultyScore || a.frequencyRank - b.frequencyRank);
  const tierByWord = new Map(scored.map((entry, index) => [entry.word, Math.min(5, Math.floor(index / 600) + 1)]));
  const words = candidates.map((entry) => ({ ...entry, difficultyTier: tierByWord.get(entry.word) }));
  const tiers = Object.fromEntries(Array.from({ length: 5 }, (_, index) => {
    const tier = index + 1;
    return [String(tier), words.filter((entry) => entry.difficultyTier === tier).map(({ word }) => word)];
  }));
  const geographicNames = words.filter(({ word }) => GEOGRAPHIC_ALLOWLIST.has(word)).map(({ word }) => word);
  const morphology = analyzeMorphology(words, rankByWord);
  return {
    schemaVersion: 2,
    source: {
      name: "google-10000-english (US no-swears)", url: SOURCE_URL, file: SOURCE_FILE,
      license: "MIT", retrieved: "2026-06-30", sourceSha256: SOURCE_SHA256,
      description: "Frequency-ranked from Google's Trillion Word Corpus; upstream swear-filtered list.",
    },
    supportingSources: [{
      ...(personalNameSource || {
        name: "U.S. Social Security Administration national baby names",
        license: "CC0-1.0 / U.S. public-domain data",
      }),
      purpose: "Deterministic personal-name exclusions",
    }],
    filtering: {
      format: "lowercase ASCII letters, 2-12 characters", unique: true, outputCount: OUTPUT_COUNT,
      exclusions: "Upstream swear filter, SSA-derived common personal names, short-token allowlist, technical abbreviations, and regular inflections when an earlier-ranked base exists.",
      tiering: "72% frequency-rank position and 28% typing complexity.",
    },
    statistics: {
      totalWords: words.length,
      wordsPerTier: Object.fromEntries(Object.entries(tiers).map(([tier, values]) => [tier, values.length])),
      ...morphology,
      personalNamesRemoved: removed.personalNames,
      abbreviationsRemoved: removed.abbreviations,
      regularInflectionsRemoved: removed.inflections,
      geographicNamesIncluded: geographicNames,
    },
    words,
    tiers,
  };
}

async function main() {
  const sourcePath = process.argv[2];
  const namesPath = process.argv[3];
  const outputPath = process.argv[4] || new URL("../data/commonGameplayWords.json", import.meta.url);
  if (!sourcePath || !namesPath) throw new Error("Usage: node scripts/buildWordPools.mjs <frequency-list> <name-exclusions-json> [output-json]");
  const source = await readFile(sourcePath, "utf8");
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== SOURCE_SHA256) throw new Error(`Unexpected source checksum: ${hash}`);
  const namesSource = JSON.parse(await readFile(namesPath, "utf8"));
  const dataset = buildDataset(source, {
    personalNames: namesSource.names,
    personalNameSource: namesSource.source,
  });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(dataset.statistics, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) await main();

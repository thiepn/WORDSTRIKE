import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const SOURCE_URL = "https://github.com/first20hours/google-10000-english";
const SOURCE_FILE = "google-10000-english-usa-no-swears.txt";
const SOURCE_SHA256 = "ee2d83651fbb91642bbed2bd30ead404c2cfbdfece01dacf284af6ea47795811";
const OUTPUT_COUNT = 3000;

// Editorial exclusions supplement the upstream no-swear list. They remove proper names,
// brands, abbreviations, web/programming jargon, and words unsuitable for ordinary play.
export const EXCLUDED_WORDS = new Set(`
aaron adobe ajax alabama alaska alex alexander alfred amazon amd android angela apache
apple arizona arkansas arthur asus atlanta australia barbara bbc benjamin bible bluetooth
brandon brian britain british california canon carol carolina catherine catholic cbs
charles chicago china chinese christ christian christine christopher colorado columbia
connecticut craigslist daniel david deborah dell denmark dennis desktop disney dns donald
dorothy douglas ebay edward elizabeth emily england eric firefox florida francis frank
france french ftp gabriel gamma gateway george georgia german germany github google gregory
hawaii hewlett hollywood hong hp html http https ibm idaho illinois indiana intel ireland
irish israel italy james jason jeffrey jennifer jeremy jesus john johnny joseph joshua
kansas kentucky kevin kimberly larry laura linda linux lisa london louis louisiana mac
maine margaret maria mark mary maryland massachusetts matthew melissa mexico michael
microsoft minnesota mississippi missouri montana mozilla mysql nancy nasa nebraska netflix
nevada nginx nike nokia oracle oregon oscar pamela paris patricia paul paypal pennsylvania
peter php pinterest prototype python raymond rebecca reddit renderer rhode richard robert
ronald samsung sandra sarah scott sean sony spotify sql stephen steven susan tcp texas
thomas timothy twitter ubuntu utah verizon victoria virginia washington websocket william
windows wisconsin wordpress wyoming yahoo youtube viewport breakpoint debugging bandwidth
overdrive cryptocurrency blockchain javascript jquery runtime backend frontend firmware
malware spyware localhost pixel shader chipset codec servlet
`.trim().split(/\s+/));

function complexity(word) {
  const uncommon = (word.match(/[jqxz]/g) || []).length;
  const clusters = (word.match(/[^aeiou]{3,}/g) || []).join("").length;
  const repeats = /(.)\1/.test(word) ? 1 : 0;
  const morphology = /(tion|ment|ness|able|ible|ally|ously|ative|istic)$/.test(word) ? 1 : 0;
  return Math.min(1, (
    Math.max(0, word.length - 4) / 10 +
    uncommon * 0.16 + clusters * 0.025 + repeats * 0.08 + morphology * 0.1
  ));
}

export function buildDataset(sourceText) {
  const rawWords = sourceText.split(/\r?\n/).map((word) => word.trim());
  const seen = new Set();
  const candidates = [];
  for (let sourceIndex = 0; sourceIndex < rawWords.length; sourceIndex += 1) {
    const word = rawWords[sourceIndex];
    if (!/^[a-z]{2,12}$/.test(word) || seen.has(word) || EXCLUDED_WORDS.has(word)) continue;
    seen.add(word);
    candidates.push({ word, frequencyRank: sourceIndex + 1 });
    if (candidates.length === OUTPUT_COUNT) break;
  }
  if (candidates.length !== OUTPUT_COUNT) throw new Error(`Expected ${OUTPUT_COUNT} words, found ${candidates.length}`);

  const scored = candidates.map((entry, index) => ({
    ...entry,
    difficultyScore: (index / (OUTPUT_COUNT - 1)) * 0.72 + complexity(entry.word) * 0.28,
  })).sort((a, b) => a.difficultyScore - b.difficultyScore || a.frequencyRank - b.frequencyRank);
  const tierByWord = new Map(scored.map((entry, index) => [
    entry.word,
    Math.min(5, Math.floor(index / (OUTPUT_COUNT / 5)) + 1),
  ]));
  const words = candidates.map((entry) => ({
    ...entry,
    difficultyTier: tierByWord.get(entry.word),
  }));
  const tiers = Object.fromEntries(Array.from({ length: 5 }, (_, index) => {
    const tier = index + 1;
    return [String(tier), words.filter((entry) => entry.difficultyTier === tier).map(({ word }) => word)];
  }));
  return {
    schemaVersion: 2,
    source: {
      name: "google-10000-english (US no-swears)",
      url: SOURCE_URL,
      file: SOURCE_FILE,
      license: "MIT",
      retrieved: "2026-06-30",
      sourceSha256: SOURCE_SHA256,
      description: "Frequency-ranked from Google's Trillion Word Corpus; upstream swear-filtered list.",
    },
    filtering: {
      format: "lowercase ASCII letters, 2-12 characters",
      unique: true,
      outputCount: OUTPUT_COUNT,
      exclusions: "Upstream swear filter plus WORDSTRIKE names, brands, abbreviations, technical jargon, and niche terms.",
      tiering: "72% frequency-rank position and 28% typing complexity (length, uncommon letters, consonant clusters, repeated letters, morphology).",
    },
    words,
    tiers,
  };
}

async function main() {
  const sourcePath = process.argv[2];
  const outputPath = process.argv[3] || new URL("../data/commonGameplayWords.json", import.meta.url);
  if (!sourcePath) throw new Error("Usage: node scripts/buildWordPools.mjs <source-list> [output-json]");
  const source = await readFile(sourcePath, "utf8");
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== SOURCE_SHA256) throw new Error(`Unexpected source checksum: ${hash}`);
  const dataset = buildDataset(source);
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(`Generated ${dataset.words.length} words across ${Object.keys(dataset.tiers).length} tiers.`);
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  await main();
}

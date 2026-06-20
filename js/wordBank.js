import {
  EMERGENCY_BOSS_WORDS,
  validateBossVocabulary,
} from "./bossGenerator.js";
import { mixSeed, shuffleSeeded } from "./random.js";

const FALLBACK_WORDS = [
  "arc", "bit", "code", "dash", "echo", "flux", "glow", "grid", "laser", "neon",
  "pixel", "pulse", "quick", "react", "shift", "spark", "strike", "target", "vector",
  "velocity", "keyboard", "midnight", "overdrive", "precision", "starlight",
];

export async function loadWordBank() {
  try {
    const response = await fetch(new URL("../data/theme-default.json", import.meta.url));
    if (!response.ok) throw new Error(`Word bank request failed: ${response.status}`);
    const data = await response.json();
    if (!data?.tiers) throw new Error("Invalid word bank");
    return data;
  } catch (error) {
    console.warn("Using fallback word bank.", error);
    return { theme: "fallback", tiers: { 1: FALLBACK_WORDS } };
  }
}

export async function loadBossWordBank() {
  try {
    const response = await fetch(new URL("../data/bossWords.json", import.meta.url));
    if (!response.ok) throw new Error(`Boss vocabulary request failed: ${response.status}`);
    const data = await response.json();
    const validation = validateBossVocabulary(data);
    if (!validation.valid) {
      throw new Error(`Invalid boss vocabulary: ${validation.errors.join("; ")}`);
    }
    return {
      schemaVersion: data.schemaVersion ?? 1,
      source: "dedicated",
      words: validation.entries,
      bucketCounts: validation.bucketCounts,
    };
  } catch (error) {
    console.warn("Using difficult emergency boss vocabulary.", error);
    return {
      schemaVersion: 1,
      source: "emergency",
      words: EMERGENCY_BOSS_WORDS.map((entry) => ({ ...entry })),
      bucketCounts: [],
    };
  }
}

function isValidWord(word) {
  return typeof word === "string" && /^[a-z]+$/.test(word);
}

export function createNormalWordAttempt(bank, config, attemptSeed) {
  const tiers = Object.keys(bank?.tiers || {})
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const tierDistance = (tier) => Math.abs(tier - config.wordTier);
  const orderedTiers = [...tiers].sort(
    (a, b) => tierDistance(a) - tierDistance(b) || a - b,
  );
  const exactLength = (word) => (
    word.length >= config.minWordLength &&
    word.length <= config.maxWordLength
  );
  const pool = [];
  const seen = new Set();
  const addWords = (words, requireLength = true) => {
    for (const word of words || []) {
      if (
        isValidWord(word) &&
        (!requireLength || exactLength(word)) &&
        !seen.has(word)
      ) {
        seen.add(word);
        pool.push(word);
      }
    }
  };

  for (const tier of orderedTiers) {
    addWords(bank.tiers[String(tier)] || bank.tiers[tier]);
    if (pool.length >= config.wordCount) break;
  }
  if (pool.length < config.wordCount) {
    for (const tier of orderedTiers) {
      addWords(bank.tiers[String(tier)] || bank.tiers[tier], false);
      if (pool.length >= config.wordCount) break;
    }
  }
  if (!pool.length) addWords(FALLBACK_WORDS, false);

  const selectionOrder = shuffleSeeded(pool, mixSeed(attemptSeed, 0x51ec7));
  const selectedWords = [];
  for (let index = 0; index < config.wordCount; index += 1) {
    selectedWords.push(selectionOrder[index % selectionOrder.length]);
  }
  const spawnQueue = shuffleSeeded(
    selectedWords,
    mixSeed(attemptSeed, 0x5a17e),
  );
  return { selectedWords, spawnQueue };
}

export function selectWordsForLevel(bank, config, attemptSeed) {
  return createNormalWordAttempt(bank, config, attemptSeed).spawnQueue;
}

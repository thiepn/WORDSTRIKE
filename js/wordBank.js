const FALLBACK_WORDS = [
  "arc", "bit", "code", "dash", "echo", "flux", "glow", "grid", "laser", "neon",
  "pixel", "pulse", "quick", "react", "shift", "spark", "strike", "target", "vector",
  "velocity", "keyboard", "midnight", "overdrive", "precision", "starlight",
];

const FALLBACK_BOSS_PHRASES = [
  { tier: 1, text: "the quiet storm" },
  { tier: 1, text: "light fills the room" },
  { tier: 2, text: "follow the road through rain" },
  { tier: 2, text: "the morning opens every door" },
  { tier: 3, text: "steady hands guide the signal home" },
  { tier: 3, text: "bright currents move beneath the surface" },
  { tier: 4, text: "careful observation reveals the hidden pattern" },
  { tier: 4, text: "precision transforms uncertainty into reliable progress" },
  { tier: 5, text: "patient coordination sustains the complex communication network" },
  { tier: 5, text: "the architecture of memory persists beyond conscious thought" },
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

export async function loadBossPhraseBank() {
  try {
    const response = await fetch(new URL("../data/bossPhrases.json", import.meta.url));
    if (!response.ok) throw new Error(`Boss phrase request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data?.phrases)) throw new Error("Invalid boss phrase bank");
    const phrases = data.phrases.filter((entry) => (
      Number.isInteger(entry?.tier) &&
      entry.tier >= 1 &&
      entry.tier <= 5 &&
      typeof entry.text === "string" &&
      /^[a-z]+(?: [a-z]+)*$/.test(entry.text.trim())
    )).map((entry) => ({ tier: entry.tier, text: entry.text.trim() }));
    if (!phrases.length) throw new Error("Boss phrase bank contains no usable phrases");
    return { phrases };
  } catch (error) {
    console.warn("Using fallback boss phrase bank.", error);
    return { phrases: FALLBACK_BOSS_PHRASES };
  }
}

export function selectBossPhrases(bank, config, attemptSeed = config.level * 104729) {
  const valid = (bank?.phrases || []).filter((entry) => (
    entry.tier === config.wordTier &&
    typeof entry.text === "string" &&
    /^[a-z]+(?: [a-z]+)*$/.test(entry.text)
  ));
  const sameOrLowerTier = (bank?.phrases || []).filter((entry) => (
    entry.tier <= config.wordTier &&
    typeof entry.text === "string" &&
    /^[a-z]+(?: [a-z]+)*$/.test(entry.text)
  ));
  const initialSource = valid.length >= config.phraseCount
    ? valid
    : sameOrLowerTier.length
      ? sameOrLowerTier
      : FALLBACK_BOSS_PHRASES;
  let unique = [...new Map(initialSource.map((entry) => [entry.text, entry])).values()];
  if (unique.length < config.phraseCount) {
    const supplements = FALLBACK_BOSS_PHRASES.filter((entry) => entry.tier <= config.wordTier);
    unique = [...new Map([...unique, ...supplements].map((entry) => [entry.text, entry])).values()];
  }
  const ranked = unique
    .map((entry) => ({
      ...entry,
      distance: Math.abs(entry.text.split(" ").length - config.wordsPerPhrase),
    }))
    .sort((a, b) => a.distance - b.distance || a.text.localeCompare(b.text));
  const exact = ranked.filter((entry) => entry.distance === 0);
  const closestDistance = ranked[0]?.distance ?? 0;
  const preferred = ranked.filter((entry) => entry.distance <= closestDistance + 1);
  const candidates = exact.length >= config.phraseCount
    ? exact
    : preferred.length >= config.phraseCount
      ? preferred
      : ranked;
  const ordered = shuffleSeeded(candidates, mixSeed(attemptSeed, config.level * 104729));
  const selected = [];
  for (let index = 0; index < config.phraseCount; index += 1) {
    selected.push(ordered[index % ordered.length]?.text || FALLBACK_BOSS_PHRASES[index].text);
  }
  return selected;
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
import { mixSeed, shuffleSeeded } from "./random.js";

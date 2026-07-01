import { mixSeed, shuffleSeeded } from "./random.js";
import { AUDITED_FALLBACK_WORDS } from "./auditedFallbackWords.js";

export const MAX_BOSS_GENERATION_ATTEMPTS = 32;

export const BOSS_WORD_TIERS = Object.freeze({
  SHORT: "short",
  MEDIUM: "medium",
  LONG: "long",
  VERY_LONG: "very-long",
});

const TIER_LIMITS = Object.freeze({
  [BOSS_WORD_TIERS.SHORT]: Object.freeze({ min: 3, max: 5 }),
  [BOSS_WORD_TIERS.MEDIUM]: Object.freeze({ min: 6, max: 8 }),
  [BOSS_WORD_TIERS.LONG]: Object.freeze({ min: 9, max: 11 }),
  [BOSS_WORD_TIERS.VERY_LONG]: Object.freeze({ min: 12, max: 15 }),
});

export const BOSS_BANNED_WORDS = new Set([
  "the", "and", "but", "for", "from", "with", "this", "that", "these",
  "those", "they", "them", "their", "there", "where", "which", "would",
  "could", "should",
]);

const PROFILE_ROWS = [
  [10, 1, 5, 33, 40],
  [20, 1, 6, 47, 60],
  [30, 2, 5, 78, 65],
  [40, 2, 7, 106, 70],
  [50, 2, 8, 136, 75],
  [60, 3, 7, 180, 80],
  [70, 3, 9, 231, 85],
  [80, 3, 10, 246, 90],
  [90, 3, 11, 302, 95],
  [100, 3, 12, 362, 100],
];

export const BOSS_DIFFICULTY_PROFILES = Object.freeze(Object.fromEntries(
  PROFILE_ROWS.map(([level, segmentCount, wordsPerSegment, targetCharacters, targetWPM]) => [
    level,
    Object.freeze({
      level,
      bossIndex: level / 10,
      segmentCount,
      wordsPerSegment,
      totalWordCount: segmentCount * wordsPerSegment,
      targetCharacters,
      minimumCharacters: Math.floor(targetCharacters * 0.95),
      maximumCharacters: Math.ceil(targetCharacters * 1.05),
      targetWPM,
    }),
  ]),
));

const PATTERN_COUNTS = Object.freeze({
  10: Object.freeze({ short: 2, medium: 3, long: 0, "very-long": 0 }),
  20: Object.freeze({ short: 1, medium: 4, long: 1, "very-long": 0 }),
  30: Object.freeze({ short: 1, medium: 2, long: 2, "very-long": 0 }),
  40: Object.freeze({ short: 1, medium: 4, long: 2, "very-long": 0 }),
  50: Object.freeze({ short: 1, medium: 3, long: 3, "very-long": 1 }),
  60: Object.freeze({ short: 1, medium: 3, long: 2, "very-long": 1 }),
  70: Object.freeze({ short: 2, medium: 3, long: 3, "very-long": 1 }),
  80: Object.freeze({ short: 2, medium: 4, long: 3, "very-long": 1 }),
  90: Object.freeze({ short: 2, medium: 3, long: 4, "very-long": 2 }),
  100: Object.freeze({ short: 1, medium: 3, long: 5, "very-long": 3 }),
});

function hashLabel(label) {
  let hash = 0x811c9dc5;
  for (const character of label) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function domainSeed(attemptSeed, level, label, index = 0) {
  return mixSeed(
    mixSeed(attemptSeed, Math.imul(level, 104729)),
    hashLabel(`${label}:${index}`),
  );
}

function validBossWord(word) {
  return (
    typeof word === "string" &&
    /^[a-z]+$/.test(word) &&
    word.length >= 3 &&
    word.length <= 15 &&
    !BOSS_BANNED_WORDS.has(word)
  );
}

export function getBossWordTier(word) {
  if (!validBossWord(word)) return null;
  for (const [tier, { min, max }] of Object.entries(TIER_LIMITS)) {
    if (word.length >= min && word.length <= max) return tier;
  }
  return null;
}

function freezePool(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

export function buildBossWordPools({ typingWords = [], longWords = [] } = {}) {
  const pools = Object.fromEntries(
    Object.values(BOSS_WORD_TIERS).map((tier) => [tier, []]),
  );
  const seen = new Set();
  const add = (words, source) => {
    for (const word of words || []) {
      const tier = getBossWordTier(word);
      if (!tier || seen.has(word)) continue;
      if (
        source === "typing-test" &&
        ![BOSS_WORD_TIERS.SHORT, BOSS_WORD_TIERS.MEDIUM, BOSS_WORD_TIERS.LONG].includes(tier)
      ) continue;
      if (
        source === "curated-long" &&
        ![BOSS_WORD_TIERS.LONG, BOSS_WORD_TIERS.VERY_LONG].includes(tier)
      ) continue;
      seen.add(word);
      pools[tier].push({ word, tier, source });
    }
  };
  add(typingWords, "typing-test");
  add(longWords, "curated-long");
  return Object.freeze(Object.fromEntries(
    Object.entries(pools).map(([tier, entries]) => [tier, freezePool(entries)]),
  ));
}

export function validateBossWordPools(pools) {
  const errors = [];
  const seen = new Set();
  for (const tier of Object.values(BOSS_WORD_TIERS)) {
    const entries = pools?.[tier];
    if (!Array.isArray(entries) || !entries.length) {
      errors.push(`${tier}: empty pool`);
      continue;
    }
    for (const entry of entries) {
      if (getBossWordTier(entry?.word) !== tier) errors.push(`${entry?.word}: invalid ${tier} entry`);
      if (seen.has(entry?.word)) errors.push(`${entry?.word}: duplicate across pools`);
      seen.add(entry?.word);
    }
  }
  if ((pools?.short?.length || 0) < 40) errors.push("short pool requires at least 40 words");
  if ((pools?.medium?.length || 0) < 80) errors.push("medium pool requires at least 80 words");
  if ((pools?.long?.length || 0) < 100) errors.push("long pool requires at least 100 words");
  if ((pools?.["very-long"]?.length || 0) < 50) errors.push("very-long pool requires at least 50 words");
  return { valid: errors.length === 0, errors };
}

export function validateBossLongVocabulary(source) {
  const words = Array.isArray(source?.words) ? source.words : [];
  const errors = [];
  const seen = new Set();
  for (const [index, word] of words.entries()) {
    if (typeof word !== "string") {
      errors.push(`entry ${index}: missing word`);
      continue;
    }
    if (!/^[a-z]{9,15}$/.test(word)) errors.push(`${word}: must be 9-15 lowercase ASCII letters`);
    if (seen.has(word)) errors.push(`${word}: duplicate word`);
    seen.add(word);
  }
  if (seen.size < 180) errors.push(`requires at least 180 unique words; found ${seen.size}`);
  return { valid: errors.length === 0, errors, words: [...seen] };
}

export function getBossDifficultyProfile(level) {
  if (!Number.isInteger(level)) return null;
  const profile = BOSS_DIFFICULTY_PROFILES[level];
  return profile ? { ...profile } : null;
}

function rootKey(word) {
  return word
    .replace(/(ations|ation|ments|ment|ingly|ing|edly|ness|able|ible|ally|ly|ed|s)$/u, "")
    .slice(0, 8);
}

export function areBossWordsRootSimilar(first, second) {
  if (first === second) return true;
  if (!first || !second) return false;
  if (first.slice(0, 6) === second.slice(0, 6)) return true;
  const firstRoot = rootKey(first);
  const secondRoot = rootKey(second);
  return firstRoot.length >= 6 && firstRoot === secondRoot;
}

function patternFromCounts(counts) {
  return Object.entries(counts).flatMap(([tier, count]) => Array(count).fill(tier));
}

function hasVeryLongRun(pattern) {
  let run = 0;
  for (const tier of pattern) {
    run = tier === BOSS_WORD_TIERS.VERY_LONG ? run + 1 : 0;
    if (run > 2) return true;
  }
  return false;
}

export function getBossTierPattern({ bossLevel, segmentIndex, seed }) {
  const counts = PATTERN_COUNTS[bossLevel];
  if (!counts) return null;
  const base = patternFromCounts(counts);
  const tierSeed = domainSeed(seed, bossLevel, "boss-tier-pattern", segmentIndex);
  const orderSeed = domainSeed(seed, bossLevel, "boss-segment-order", segmentIndex);
  const seededBase = shuffleSeeded(base, tierSeed);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const pattern = shuffleSeeded(seededBase, mixSeed(orderSeed, attempt + 1));
    if (!hasVeryLongRun(pattern)) return Object.freeze(pattern);
  }
  return Object.freeze(base);
}

function segmentCharacterTargets(profile) {
  const base = Math.floor(profile.targetCharacters / profile.segmentCount);
  const remainder = profile.targetCharacters % profile.segmentCount;
  return Array.from(
    { length: profile.segmentCount },
    (_, index) => base + (index >= profile.segmentCount - remainder ? 1 : 0),
  );
}

function theoreticalRange(pattern) {
  return pattern.reduce(
    (range, tier) => ({
      min: range.min + TIER_LIMITS[tier].min,
      max: range.max + TIER_LIMITS[tier].max,
    }),
    { min: 0, max: 0 },
  );
}

function selectSegmentWords({
  pools,
  pattern,
  targetCharacters,
  selectedWords,
  level,
  segmentIndex,
  seed,
  generationAttempt,
}) {
  const targetLetters = targetCharacters - (pattern.length - 1);
  const selectionSeed = mixSeed(
    domainSeed(seed, level, "boss-word-selection", segmentIndex),
    domainSeed(generationAttempt, level, "boss-budget-adjustment", segmentIndex),
  );
  let visited = 0;

  const search = (slot, letters, chosen) => {
    visited += 1;
    if (visited > 12000) return null;
    if (slot >= pattern.length) return letters === targetLetters ? chosen : null;
    const tier = pattern[slot];
    const remainingPattern = pattern.slice(slot + 1);
    const remainingRange = theoreticalRange(remainingPattern);
    const candidates = shuffleSeeded(
      pools[tier],
      mixSeed(selectionSeed, Math.imul(slot + 1, 0x9e3779b9)),
    ).filter(({ word }) => (
      !selectedWords.has(word) &&
      !chosen.some((entry) => entry.word === word) &&
      !chosen.some((entry) => areBossWordsRootSimilar(entry.word, word))
    ));
    candidates.sort((first, second) => {
      const firstRemaining = targetLetters - letters - first.word.length;
      const secondRemaining = targetLetters - letters - second.word.length;
      const ideal = remainingPattern.length
        ? (remainingRange.min + remainingRange.max) / 2
        : 0;
      return Math.abs(firstRemaining - ideal) - Math.abs(secondRemaining - ideal);
    });
    for (const candidate of candidates.slice(0, 48)) {
      const nextLetters = letters + candidate.word.length;
      const required = targetLetters - nextLetters;
      if (required < remainingRange.min || required > remainingRange.max) continue;
      const result = search(slot + 1, nextLetters, [...chosen, candidate]);
      if (result) return result;
    }
    return null;
  };

  return search(0, 0, []);
}

function orderedWords(segments) {
  return segments.flatMap((segment) => segment.split(" ").filter(Boolean));
}

export function getBossEncounterMetrics(segments) {
  const words = orderedWords(segments);
  const lengths = words.map((word) => word.length);
  const totalWordCharacters = lengths.reduce((sum, length) => sum + length, 0);
  return {
    words,
    totalWordCount: words.length,
    minimumSelectedWordLength: lengths.length ? Math.min(...lengths) : 0,
    averageSelectedWordLength: lengths.length ? totalWordCharacters / lengths.length : 0,
    longestSelectedWord: lengths.length ? Math.max(...lengths) : 0,
    totalRequiredCharacters: segments.reduce((sum, segment) => sum + segment.length, 0),
  };
}

function tierCounts(words) {
  const counts = { short: 0, medium: 0, long: 0, "very-long": 0 };
  for (const word of words) counts[getBossWordTier(word)] += 1;
  return counts;
}

export function validateBossEncounter(segments, profile) {
  const errors = [];
  if (!profile) return { valid: false, errors: ["missing boss profile"] };
  if (!Array.isArray(segments) || segments.length !== profile.segmentCount) {
    errors.push(`expected ${profile.segmentCount} segments`);
  }
  const wordsBySegment = (Array.isArray(segments) ? segments : []).map(
    (segment) => String(segment).split(" ").filter(Boolean),
  );
  if (wordsBySegment.some((words) => words.length !== profile.wordsPerSegment)) {
    errors.push(`expected ${profile.wordsPerSegment} words per segment`);
  }
  const words = wordsBySegment.flat();
  if (words.length !== profile.totalWordCount) errors.push(`expected ${profile.totalWordCount} total words`);
  if (new Set(words).size !== words.length) errors.push("duplicate word");
  if (words.some((word) => !getBossWordTier(word))) errors.push("invalid word");
  for (const segmentWords of wordsBySegment) {
    const tiers = segmentWords.map(getBossWordTier);
    if (!tiers.includes(BOSS_WORD_TIERS.SHORT)) errors.push("segment missing short word");
    if (!tiers.includes(BOSS_WORD_TIERS.MEDIUM)) errors.push("segment missing medium word");
    if (hasVeryLongRun(tiers)) errors.push("more than two very-long words consecutively");
    if (new Set(tiers).size < 2) errors.push("segment lacks tier variety");
    if (profile.level >= 30 && !tiers.includes(BOSS_WORD_TIERS.LONG)) {
      errors.push("later segment missing long word");
    }
    if (profile.level >= 50 && !tiers.includes(BOSS_WORD_TIERS.VERY_LONG)) {
      errors.push("advanced segment missing very-long word");
    }
  }
  const metrics = getBossEncounterMetrics(segments || []);
  if (
    metrics.totalRequiredCharacters < profile.minimumCharacters ||
    metrics.totalRequiredCharacters > profile.maximumCharacters
  ) errors.push(`characters ${metrics.totalRequiredCharacters} outside target range`);
  return { valid: errors.length === 0, errors, metrics };
}

export function calculateBossTiming(profileOrLevel, selectedSegments) {
  const profile = typeof profileOrLevel === "number"
    ? getBossDifficultyProfile(profileOrLevel)
    : profileOrLevel;
  if (!profile) return null;
  const segments = Array.isArray(selectedSegments) ? selectedSegments : [];
  const totalRequiredCharacters = segments.reduce(
    (sum, segment) => sum + String(segment).length,
    0,
  );
  const idealTypingSeconds = ((totalRequiredCharacters / 5) / profile.targetWPM) * 60;
  const transitionAllowanceSeconds = Math.max(0, profile.segmentCount - 1) * 0.35;
  const effectiveTimeLimitSec = Math.max(
    9,
    Math.min(50, idealTypingSeconds * 1.08 + transitionAllowanceSeconds),
  );
  return {
    totalRequiredCharacters,
    targetWPM: profile.targetWPM,
    bossTargetWPM: profile.targetWPM,
    idealTypingSeconds,
    transitionAllowanceSeconds,
    effectiveTimeLimitSec,
  };
}

const FALLBACK_TYPING_WORDS = AUDITED_FALLBACK_WORDS;

const FALLBACK_LONG_WORDS = Object.freeze([
  "adventure", "agreement", "attention", "beautiful", "breakfast", "challenge",
  "character", "community", "connection", "conversation", "dangerous", "decision",
  "different", "direction", "education", "equipment", "especially", "experience",
  "financial", "following", "friendly", "government", "happiness", "important",
  "information", "interesting", "knowledge", "leadership", "management", "meaningful",
  "necessary", "opportunity", "organization", "particular", "performance", "personal",
  "population", "practical", "production", "professional", "relationship", "restaurant",
  "successful", "temperature", "traditional", "understand", "wonderful", "achievement",
  "advertising", "appointment", "celebration", "comfortable", "communication",
  "competition", "confidence", "construction", "department", "description",
  "development", "discussion", "environment", "everything", "explanation",
  "friendship", "immediately", "improvement", "independent", "individual",
  "international", "introduction", "investment", "invitation", "partnership",
  "personality", "preparation", "presentation", "prevention", "responsibility",
  "technology", "themselves", "throughout", "understanding", "university",
]);

export const EMERGENCY_BOSS_WORDS = Object.freeze([
  ...FALLBACK_TYPING_WORDS,
  ...FALLBACK_LONG_WORDS,
]);

function normalizePools(source) {
  if (source?.pools) return source.pools;
  return buildBossWordPools({
    typingWords: source?.typingWords || FALLBACK_TYPING_WORDS,
    longWords: source?.longWords || FALLBACK_LONG_WORDS,
  });
}

function createEncounter(profile, pools, attemptSeed, generationAttempt, fallbackUsed) {
  const targets = segmentCharacterTargets(profile);
  const used = new Set();
  const entriesBySegment = [];
  const tierPatterns = [];
  for (let segmentIndex = 0; segmentIndex < profile.segmentCount; segmentIndex += 1) {
    const pattern = getBossTierPattern({
      bossLevel: profile.level,
      segmentIndex,
      seed: mixSeed(attemptSeed, generationAttempt),
      generationAttempt,
    });
    const entries = selectSegmentWords({
      pools,
      pattern,
      targetCharacters: targets[segmentIndex],
      selectedWords: used,
      level: profile.level,
      segmentIndex,
      seed: mixSeed(attemptSeed, generationAttempt),
    });
    if (!entries) return null;
    entries.forEach(({ word }) => used.add(word));
    entriesBySegment.push(entries);
    tierPatterns.push(pattern);
  }
  const segments = entriesBySegment.map((entries) => entries.map(({ word }) => word).join(" "));
  const validation = validateBossEncounter(segments, profile);
  if (!validation.valid) return null;
  const flatEntries = entriesBySegment.flat();
  return {
    profile: { ...profile },
    segments,
    words: validation.metrics.words,
    wordSources: flatEntries.map(({ source }) => source),
    tierPatterns: tierPatterns.map((pattern) => [...pattern]),
    tierCounts: tierCounts(validation.metrics.words),
    targetSegmentCharacters: targets,
    generationAttempt,
    fallbackUsed,
    metrics: validation.metrics,
    timing: calculateBossTiming(profile, segments),
  };
}

export function generateBossEncounter(source, level, attemptSeed) {
  const profile = getBossDifficultyProfile(level);
  if (!profile) return null;
  const pools = normalizePools(source);
  const validation = validateBossWordPools(pools);
  const primaryPools = validation.valid
    ? pools
    : buildBossWordPools({
      typingWords: FALLBACK_TYPING_WORDS,
      longWords: FALLBACK_LONG_WORDS,
    });
  for (let attempt = 1; attempt <= MAX_BOSS_GENERATION_ATTEMPTS; attempt += 1) {
    const encounter = createEncounter(
      profile,
      primaryPools,
      attemptSeed,
      attempt,
      !validation.valid,
    );
    if (encounter) return encounter;
  }
  throw new Error(`Unable to generate a valid level ${level} boss encounter`);
}

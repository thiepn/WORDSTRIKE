import { mixSeed, shuffleSeeded } from "./random.js";

export const MAX_BOSS_GENERATION_ATTEMPTS = 64;

export const BOSS_BANNED_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "at", "by",
  "for", "from", "with", "as", "is", "it", "its", "be", "are", "was", "were",
  "this", "that", "these", "those", "he", "she", "we", "you", "they",
]);

const PROFILE_ROWS = [
  [10, 1, 4, 6, 7.5, 9, 55],
  [20, 1, 5, 7, 8.5, 10, 60],
  [30, 2, 4, 7, 9.0, 11, 65],
  [40, 2, 5, 8, 9.8, 12, 70],
  [50, 2, 6, 8, 10.5, 13, 75],
  [60, 3, 5, 9, 11.2, 14, 80],
  [70, 3, 6, 9, 12.0, 15, 85],
  [80, 3, 6, 10, 12.8, 16, 90],
  [90, 3, 7, 10, 13.5, 17, 95],
  [100, 3, 8, 11, 14.2, 18, 100],
];

export const BOSS_DIFFICULTY_PROFILES = Object.freeze(Object.fromEntries(
  PROFILE_ROWS.map(([
    level,
    segmentCount,
    wordsPerSegment,
    minimumWordLength,
    requiredAverageWordLength,
    minimumLongestWord,
    targetWPM,
  ]) => [level, Object.freeze({
    level,
    bossIndex: level / 10,
    segmentCount,
    wordsPerSegment,
    totalWordCount: segmentCount * wordsPerSegment,
    minimumWordLength,
    requiredAverageWordLength,
    minimumLongestWord,
    targetWPM,
  })]),
));

export const BOSS_VOCABULARY_BUCKETS = Object.freeze([
  Object.freeze({ min: 6, max: 7, minimum: 60 }),
  Object.freeze({ min: 8, max: 9, minimum: 80 }),
  Object.freeze({ min: 10, max: 11, minimum: 100 }),
  Object.freeze({ min: 12, max: 14, minimum: 120 }),
  Object.freeze({ min: 15, max: 20, minimum: 100 }),
]);

const COMMON_SUFFIXES = [
  "izations", "ization", "ational", "ations", "ation", "ingly", "ments",
  "ment", "tions", "tion", "ness", "ists", "ist", "ing", "edly", "ed", "ly", "s",
];

export const EMERGENCY_BOSS_WORDS = Object.freeze([
  "electromagnetic", "intercontinental", "misinterpretation", "multidimensional",
  "microarchitecture", "counterproductive", "photosensitivity", "characterization",
  "institutionalization", "psychopharmacology", "circumnavigation", "commercialization",
  "comprehensibility", "decentralization", "disenfranchisement", "electrophoresis",
  "environmentalist", "extraterrestrial", "gastrointestinal", "hydroelectricity",
  "immunodeficiency", "incomprehensible", "industrialization", "interdisciplinary",
  "intergovernmental", "interoperability", "intersectionality", "microelectronics",
  "neurodegenerative", "overcompensation", "overgeneralization", "parliamentarian",
  "reproducibility", "superconductivity", "telecommunication", "thermoregulation",
  "transcontinental", "uncharacteristic", "unconstitutional", "vascularization",
].map((word) => Object.freeze({ word, tier: 10 })));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getBossDifficultyProfile(level) {
  if (!Number.isInteger(level)) return null;
  const profile = BOSS_DIFFICULTY_PROFILES[level];
  return profile ? { ...profile } : null;
}

export function normalizeBossVocabulary(source) {
  if (Array.isArray(source?.words)) {
    return source.words.map((entry) => (
      typeof entry === "string"
        ? { word: entry, tier: clamp(entry.length - 5, 1, 10) }
        : { word: entry?.word, tier: entry?.tier }
    ));
  }
  if (!source?.tiers || typeof source.tiers !== "object") return [];
  return Object.entries(source.tiers).flatMap(([tier, words]) => (
    Array.isArray(words)
      ? words.map((word) => ({ word, tier: Number(tier) }))
      : []
  ));
}

export function validateBossVocabulary(source, { requireBucketMinimums = true } = {}) {
  const entries = normalizeBossVocabulary(source);
  const errors = [];
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    const label = typeof entry.word === "string" ? entry.word : `entry ${index}`;
    if (typeof entry.word !== "string") {
      errors.push(`${label}: missing word`);
      continue;
    }
    if (!/^[a-z]+$/.test(entry.word)) errors.push(`${label}: must contain lowercase ASCII letters only`);
    if (entry.word.length < 6 || entry.word.length > 20) {
      errors.push(`${label}: length ${entry.word.length} is outside 6-20`);
    }
    if (!Number.isInteger(entry.tier) || entry.tier < 1 || entry.tier > 10) {
      errors.push(`${label}: tier ${entry.tier} is outside 1-10`);
    }
    if (BOSS_BANNED_WORDS.has(entry.word)) errors.push(`${label}: banned boss word`);
    if (seen.has(entry.word)) errors.push(`${label}: duplicate word`);
    seen.add(entry.word);
  }
  const bucketCounts = BOSS_VOCABULARY_BUCKETS.map(({ min, max, minimum }) => {
    const count = entries.filter(({ word }) => (
      typeof word === "string" && word.length >= min && word.length <= max
    )).length;
    if (requireBucketMinimums && count < minimum) {
      errors.push(`length ${min}-${max}: ${count} words; requires ${minimum}`);
    }
    return { min, max, minimum, count };
  });
  const lateGameCount = entries.filter(({ word }) => (
    typeof word === "string" && word.length >= 11 && word.length <= 20
  )).length;
  if (requireBucketMinimums && lateGameCount < 220) {
    errors.push(`late-game 11-20 pool: ${lateGameCount} words; requires at least 220`);
  }
  return {
    valid: errors.length === 0,
    errors,
    entries: errors.length ? entries : entries.map((entry) => ({ ...entry })),
    bucketCounts,
    lateGameCount,
  };
}

function stripCommonSuffix(word) {
  for (const suffix of COMMON_SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 6) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

export function areBossWordsRootSimilar(first, second) {
  if (first === second) return true;
  if (
    Math.abs(first.length - second.length) <= 4 &&
    (first.startsWith(second) || second.startsWith(first))
  ) {
    return true;
  }
  if (first.length >= 8 && second.length >= 8 && first.slice(0, 8) === second.slice(0, 8)) {
    return true;
  }
  return stripCommonSuffix(first) === stripCommonSuffix(second);
}

function hasRootSimilarity(words) {
  for (let first = 0; first < words.length; first += 1) {
    for (let second = first + 1; second < words.length; second += 1) {
      if (areBossWordsRootSimilar(words[first], words[second])) return true;
    }
  }
  return false;
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

function sequenceLooksArtificial(words) {
  for (let index = 1; index < words.length; index += 1) {
    if (words[index - 1].slice(0, 4) === words[index].slice(0, 4)) return true;
  }
  let sameInitialRun = 1;
  for (let index = 1; index < words.length; index += 1) {
    sameInitialRun = words[index][0] === words[index - 1][0]
      ? sameInitialRun + 1
      : 1;
    if (sameInitialRun > 3) return true;
  }
  const text = words.join("|");
  const ascending = [...words].sort().join("|");
  const descending = [...words].sort().reverse().join("|");
  return words.length > 2 && (text === ascending || text === descending);
}

export function validateBossEncounter(segments, profile) {
  const errors = [];
  if (!profile) return { valid: false, errors: ["missing boss profile"] };
  if (!Array.isArray(segments) || segments.length !== profile.segmentCount) {
    errors.push(`expected ${profile.segmentCount} segments`);
  }
  const safeSegments = Array.isArray(segments) ? segments : [];
  const wordsBySegment = safeSegments.map((segment) => (
    typeof segment === "string" ? segment.split(" ").filter(Boolean) : []
  ));
  if (wordsBySegment.some((words) => words.length !== profile.wordsPerSegment)) {
    errors.push(`expected ${profile.wordsPerSegment} words per segment`);
  }
  if (safeSegments.some((segment) => !segment)) errors.push("empty segment");
  const words = wordsBySegment.flat();
  if (words.length !== profile.totalWordCount) errors.push(`expected ${profile.totalWordCount} total words`);
  if (new Set(words).size !== words.length) errors.push("duplicate word");
  const malformed = words.filter((word) => !/^[a-z]+$/.test(word));
  if (malformed.length) errors.push(`malformed words: ${malformed.join(", ")}`);
  const banned = words.filter((word) => BOSS_BANNED_WORDS.has(word));
  if (banned.length) errors.push(`banned words: ${banned.join(", ")}`);
  const undersized = words.filter((word) => word.length < profile.minimumWordLength);
  if (undersized.length) errors.push(`undersized words: ${undersized.join(", ")}`);
  const metrics = getBossEncounterMetrics(safeSegments);
  if (metrics.averageSelectedWordLength + Number.EPSILON < profile.requiredAverageWordLength) {
    errors.push(`average ${metrics.averageSelectedWordLength.toFixed(2)} below ${profile.requiredAverageWordLength}`);
  }
  if (metrics.longestSelectedWord < profile.minimumLongestWord) {
    errors.push(`longest ${metrics.longestSelectedWord} below ${profile.minimumLongestWord}`);
  }
  if (hasRootSimilarity(words)) errors.push("root-similar words");
  if (sequenceLooksArtificial(words)) errors.push("repetitive or sorted-looking order");
  return { valid: errors.length === 0, errors, metrics };
}

function candidateFits(entry, selected) {
  return selected.every((existing) => !areBossWordsRootSimilar(entry.word, existing.word));
}

function selectWords(entries, profile, seed, strongest = false) {
  const eligible = entries.filter(({ word }) => (
    typeof word === "string" &&
    /^[a-z]+$/.test(word) &&
    word.length >= profile.minimumWordLength &&
    word.length <= 20 &&
    !BOSS_BANNED_WORDS.has(word)
  ));
  const shuffled = shuffleSeeded(eligible, seed);
  const selected = [];
  const targetCharacters = Math.ceil(
    profile.requiredAverageWordLength * profile.totalWordCount,
  );
  const longestTarget = Math.max(
    profile.minimumLongestWord,
    Math.ceil(profile.requiredAverageWordLength) + 1,
  );

  for (let slot = 0; slot < profile.totalWordCount; slot += 1) {
    const remainingSlots = profile.totalWordCount - slot;
    const currentCharacters = selected.reduce((sum, entry) => sum + entry.word.length, 0);
    const idealLength = slot === 0
      ? longestTarget
      : clamp(Math.ceil((targetCharacters - currentCharacters) / remainingSlots), profile.minimumWordLength, 20);
    const requiresLongest = slot === 0;
    const options = shuffled.filter((entry) => (
      !selected.some((existing) => existing.word === entry.word) &&
      (!requiresLongest || entry.word.length >= profile.minimumLongestWord) &&
      candidateFits(entry, selected)
    ));
    if (!options.length) return null;
    options.sort((first, second) => {
      if (strongest) return second.word.length - first.word.length;
      const firstDistance = Math.abs(first.word.length - idealLength);
      const secondDistance = Math.abs(second.word.length - idealLength);
      const firstTierDistance = Math.abs(first.tier - profile.bossIndex);
      const secondTierDistance = Math.abs(second.tier - profile.bossIndex);
      return firstDistance - secondDistance || firstTierDistance - secondTierDistance;
    });
    selected.push(options[0]);
  }
  return selected;
}

function buildSegments(selected, profile, seed) {
  const sorted = [...selected].sort((first, second) => (
    second.word.length - first.word.length || first.word.localeCompare(second.word)
  ));
  const segmentWords = Array.from({ length: profile.segmentCount }, () => []);
  for (const [index, entry] of sorted.entries()) {
    segmentWords[index % profile.segmentCount].push(entry.word);
  }
  return segmentWords.map((words, index) => (
    shuffleSeeded(words, mixSeed(seed, 0x9e3779b9 + index)).join(" ")
  ));
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
  const effectiveTimeLimitSec = clamp(
    idealTypingSeconds * 1.08 + transitionAllowanceSeconds,
    9,
    50,
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

function createEncounterResult(profile, segments, generationAttempt, fallbackUsed) {
  const validation = validateBossEncounter(segments, profile);
  if (!validation.valid) return null;
  const timing = calculateBossTiming(profile, segments);
  return {
    profile: { ...profile },
    segments,
    words: validation.metrics.words,
    generationAttempt,
    fallbackUsed,
    metrics: validation.metrics,
    timing,
  };
}

export function generateBossEncounter(source, level, attemptSeed) {
  const profile = getBossDifficultyProfile(level);
  if (!profile) return null;
  const normalized = normalizeBossVocabulary(source);
  const entries = normalized.length ? normalized : EMERGENCY_BOSS_WORDS;
  for (let generationAttempt = 1; generationAttempt <= MAX_BOSS_GENERATION_ATTEMPTS; generationAttempt += 1) {
    const seed = mixSeed(
      attemptSeed,
      Math.imul(level, 104729) ^ Math.imul(generationAttempt, 0x45d9f3b),
    );
    const selected = selectWords(entries, profile, seed);
    if (!selected) continue;
    const segments = buildSegments(selected, profile, seed);
    const encounter = createEncounterResult(profile, segments, generationAttempt, false);
    if (encounter) return encounter;
  }

  const fallbackEntries = [...entries, ...EMERGENCY_BOSS_WORDS]
    .filter((entry, index, all) => all.findIndex((item) => item.word === entry.word) === index);
  for (let fallbackAttempt = 1; fallbackAttempt <= MAX_BOSS_GENERATION_ATTEMPTS; fallbackAttempt += 1) {
    const seed = mixSeed(attemptSeed, 0xf411ba11 ^ Math.imul(level, fallbackAttempt));
    const selected = selectWords(fallbackEntries, profile, seed, fallbackAttempt === 1);
    if (!selected) continue;
    const encounter = createEncounterResult(
      profile,
      buildSegments(selected, profile, seed),
      MAX_BOSS_GENERATION_ATTEMPTS + fallbackAttempt,
      true,
    );
    if (encounter) return encounter;
  }
  throw new Error(`Unable to generate a valid level ${level} boss encounter`);
}

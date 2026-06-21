import {
  DAILY_CHALLENGE_VERSION,
  DAILY_TOTAL_WORDS,
  DAILY_WAVE_PROFILES,
} from "./dailyConfig.js";
import { isValidDailyDateKey } from "./dailyDate.js";
import { createSeededRandom, mixSeed, shuffleSeeded } from "./random.js";

const EDGES = ["top", "right", "bottom", "left"];

export function hashDailyLabel(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0 || 1;
}

export function getDailyChallengeSeed(dateKey, version = DAILY_CHALLENGE_VERSION) {
  if (!isValidDailyDateKey(dateKey)) return null;
  return hashDailyLabel(`wordstrike-daily-v${version}:${dateKey}`);
}

function domainSeed(seed, label) {
  return mixSeed(seed, hashDailyLabel(label));
}

function validWords(words) {
  return [...new Set((words || []).filter((word) => (
    typeof word === "string" && /^[a-z]+$/.test(word)
  )))];
}

export function createDailyVocabulary({ commonWords = [], campaignBank = {} } = {}) {
  const tiers = campaignBank.tiers || {};
  const tier = (number) => validWords(tiers[String(number)] || tiers[number]);
  return Object.freeze({
    common: validWords(commonWords),
    lowMid: validWords([...tier(1), ...tier(2), ...tier(3)]),
    mid: validWords([...tier(2), ...tier(3), ...tier(4)]),
    midHigh: validWords([...tier(3), ...tier(4), ...tier(5)]),
    difficult: validWords([...tier(4), ...tier(5)]),
  });
}

function weightedPick(candidates, targetLength, random) {
  const weights = candidates.map((word) => 1 / (1 + (word.length - targetLength) ** 2));
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < candidates.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return candidates[index];
  }
  return candidates.at(-1);
}

function sourceSchedule(profile, seed) {
  const schedule = Object.entries(profile.sourceCounts)
    .flatMap(([source, count]) => Array.from({ length: count }, () => source));
  return shuffleSeeded(schedule, domainSeed(seed, `wave-${profile.wave}-sources`));
}

function chooseWord(vocabulary, source, profile, targetLength, used, recent, random) {
  const allowed = (vocabulary[source] || []).filter((word) => (
    word.length >= profile.minWordLength &&
    word.length <= profile.maxWordLength &&
    !used.has(word) &&
    !recent.includes(word)
  ));
  const relaxed = (vocabulary[source] || []).filter((word) => (
    word.length >= profile.minWordLength &&
    word.length <= profile.maxWordLength &&
    !used.has(word)
  ));
  const global = Object.values(vocabulary).flat().filter((word) => (
    word.length >= profile.minWordLength &&
    word.length <= profile.maxWordLength &&
    !used.has(word)
  ));
  const candidates = allowed.length ? allowed : relaxed.length ? relaxed : global;
  return candidates.length
    ? weightedPick(candidates, targetLength, random)
    : null;
}

function sourceTargetLength(profile, source, random) {
  let target = profile.targetAverageWordLength;
  if (profile.wave === 2 && source === "difficult") target = 8;
  if (profile.wave === 3) {
    if (source === "difficult") target = 9;
    else target = 6;
  }
  const jitter = [-0.5, 0, 0, 0.5][Math.floor(random() * 4)];
  return Math.max(profile.minWordLength, Math.min(profile.maxWordLength, target + jitter));
}

export function generateDailyPlan({
  dateKey,
  challengeVersion = DAILY_CHALLENGE_VERSION,
  vocabulary,
} = {}) {
  const seed = getDailyChallengeSeed(dateKey, challengeVersion);
  if (!seed || !vocabulary) return null;
  const used = new Set();
  const recent = [];
  const selected = [];
  for (const profile of DAILY_WAVE_PROFILES) {
    const random = createSeededRandom(domainSeed(seed, `wave-${profile.wave}-words`));
    const lengthRandom = createSeededRandom(domainSeed(seed, `wave-${profile.wave}-lengths`));
    for (const source of sourceSchedule(profile, seed)) {
      const targetLength = sourceTargetLength(profile, source, lengthRandom);
      const word = chooseWord(
        vocabulary,
        source,
        profile,
        targetLength,
        used,
        recent,
        random,
      );
      if (!word) return null;
      used.add(word);
      recent.push(word);
      if (recent.length > 30) recent.shift();
      selected.push({ word, source, wave: profile.wave, profile });
    }
  }
  const edgeRandom = createSeededRandom(domainSeed(seed, "spawn-edges"));
  const positionRandom = createSeededRandom(domainSeed(seed, "spawn-positions"));
  const plan = selected.map((entry, index) => Object.freeze({
    index,
    wave: entry.wave,
    word: entry.word,
    source: entry.source,
    edge: EDGES[Math.floor(edgeRandom() * EDGES.length)],
    edgeRatio: Number((0.08 + positionRandom() * 0.84).toFixed(6)),
    profile: Object.freeze({
      spawnIntervalMs: entry.profile.spawnIntervalMs,
      wordSpeedPxPerSec: entry.profile.wordSpeedPxPerSec,
      maxSimultaneousWords: entry.profile.maxSimultaneousWords,
      minWordLength: entry.profile.minWordLength,
      maxWordLength: entry.profile.maxWordLength,
      targetAverageWordLength: entry.profile.targetAverageWordLength,
    }),
  }));
  return Object.freeze({
    dateKey,
    challengeVersion,
    seed,
    totalWords: DAILY_TOTAL_WORDS,
    entries: Object.freeze(plan),
  });
}

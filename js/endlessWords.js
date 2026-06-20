import { ENDLESS_CONFIG } from "./endlessConfig.js";
import { getEndlessDifficulty } from "./endlessDifficulty.js";
import { createSeededRandom, mixSeed } from "./random.js";

function labelHash(label) {
  let hash = 0x811c9dc5;
  for (const character of label) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function uniqueWords(words) {
  return [...new Set((words || []).filter(
    (word) => typeof word === "string" && /^[a-z]{2,14}$/.test(word),
  ))];
}

export function createEndlessVocabulary({ commonWords, campaignBank, bossBank } = {}) {
  const tiers = campaignBank?.tiers || {};
  const campaign = uniqueWords([
    ...(tiers["1"] || []),
    ...(tiers["2"] || []),
    ...(tiers["3"] || []),
  ]);
  const difficult = uniqueWords([
    ...(tiers["4"] || []),
    ...(tiers["5"] || []),
  ]);
  const boss = uniqueWords((bossBank?.words || []).map((entry) => entry.word));
  return Object.freeze({
    common: Object.freeze(uniqueWords(commonWords)),
    campaign: Object.freeze(campaign),
    difficult: Object.freeze(difficult),
    boss: Object.freeze(boss),
  });
}

function weightedSource(random, weights) {
  const roll = random();
  let cursor = 0;
  for (const source of ["common", "campaign", "difficult", "boss"]) {
    cursor += weights[source] || 0;
    if (roll < cursor) return source;
  }
  return "campaign";
}

function weightedCandidate(random, words, targetAverageLength) {
  let total = 0;
  const weights = words.map((word) => {
    const distance = Math.abs(word.length - targetAverageLength);
    const weight = 1 / (1 + distance * distance);
    total += weight;
    return weight;
  });
  let roll = random() * total;
  for (let index = 0; index < words.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return words[index];
  }
  return words.at(-1);
}

export function createEndlessWordGenerator(vocabulary, attemptSeed) {
  const random = createSeededRandom(mixSeed(attemptSeed, labelHash("endless-words")));
  const sourceRandom = createSeededRandom(mixSeed(attemptSeed, labelHash("endless-vocabulary")));
  const reliefRandom = createSeededRandom(mixSeed(attemptSeed, labelHash("endless-lengths")));
  const recentWords = [];
  let stage = 1;
  let generatedCount = 0;
  let stageUsedWords = new Set();

  const choose = (requestedStage) => {
    if (requestedStage !== stage) {
      stage = requestedStage;
      stageUsedWords = new Set();
    }
    const profile = getEndlessDifficulty(stage);
    const relief = profile.shortReliefChance > 0 && reliefRandom() < profile.shortReliefChance;
    const minimumLength = relief ? 3 : profile.minimumWordLength;
    const maximumLength = relief ? Math.min(5, profile.maximumWordLength) : profile.maximumWordLength;
    const preferredSource = weightedSource(sourceRandom, profile.vocabularyWeights);
    const sources = [
      preferredSource,
      "campaign",
      "common",
      "difficult",
      ...(stage >= 25 ? ["boss"] : []),
    ];
    let eligible = [];
    for (const source of [...new Set(sources)]) {
      eligible = (vocabulary[source] || []).filter((word) => (
        word.length >= minimumLength &&
        word.length <= maximumLength &&
        !stageUsedWords.has(word) &&
        !recentWords.includes(word)
      ));
      if (eligible.length) break;
    }
    if (!eligible.length) {
      eligible = Object.values(vocabulary).flat().filter((word) => (
        word.length >= minimumLength &&
        word.length <= maximumLength &&
        !stageUsedWords.has(word)
      ));
    }
    if (!eligible.length) {
      eligible = Object.values(vocabulary).flat().filter((word) => (
        word.length >= minimumLength && word.length <= maximumLength
      ));
    }
    if (!eligible.length) throw new Error(`No Endless words available for stage ${stage}`);
    const word = weightedCandidate(
      random,
      eligible,
      relief ? Math.min(4, profile.targetAverageLength) : profile.targetAverageLength,
    );
    stageUsedWords.add(word);
    recentWords.push(word);
    while (recentWords.length > ENDLESS_CONFIG.recentWordHistorySize) recentWords.shift();
    generatedCount += 1;
    return word;
  };

  return {
    next: choose,
    resetStage(nextStage) {
      stage = nextStage;
      stageUsedWords = new Set();
    },
    get generatedCount() {
      return generatedCount;
    },
    get recentWords() {
      return [...recentWords];
    },
    get stageUsedCount() {
      return stageUsedWords.size;
    },
  };
}

import { ENDLESS_CONFIG } from "./endlessConfig.js";

const LENGTH_PROFILES = Object.freeze([
  [3, 3, 6, 4.5],
  [6, 3, 7, 5],
  [10, 4, 8, 5.7],
  [15, 4, 9, 6.2],
  [20, 5, 10, 6.6],
  [25, 5, 12, 7],
  [30, 5, 12, 7.3],
  [Infinity, 6, 14, 7.8],
]);

export function getEndlessVocabularyWeights(stage) {
  if (stage <= 4) return Object.freeze({ common: 0.75, campaign: 0.25, difficult: 0, boss: 0 });
  if (stage <= 9) return Object.freeze({ common: 0.5, campaign: 0.5, difficult: 0, boss: 0 });
  if (stage <= 14) return Object.freeze({ common: 0.25, campaign: 0.6, difficult: 0.15, boss: 0 });
  if (stage <= 24) return Object.freeze({ common: 0.1, campaign: 0.6, difficult: 0.3, boss: 0 });
  return Object.freeze({ common: 0.1, campaign: 0.2, difficult: 0.55, boss: 0.15 });
}

export function getEndlessActiveWordCap(stage) {
  if (stage <= 2) return 3;
  if (stage <= 4) return 4;
  if (stage <= 7) return 5;
  if (stage <= 11) return 6;
  if (stage <= 17) return 7;
  if (stage <= 24) return 8;
  return ENDLESS_CONFIG.maxActiveWords;
}

export function getEndlessDifficulty(inputStage) {
  const stage = Number.isInteger(inputStage) && inputStage > 0 ? inputStage : 1;
  const movementProgress = Math.min((stage - 1) / 9, 1);
  const movementMultiplier = 0.7 + 0.3 * movementProgress;
  const profile = LENGTH_PROFILES.find(([maximumStage]) => stage <= maximumStage);
  return Object.freeze({
    stage,
    movementMultiplier,
    movementSpeed: ENDLESS_CONFIG.movementSpeedCapPxPerSec * movementMultiplier,
    spawnIntervalMs: stage <= 10
      ? Math.round(ENDLESS_CONFIG.initialSpawnIntervalMs * Math.pow(0.92, stage - 1))
      : ENDLESS_CONFIG.lateGameSpawnIntervalMs,
    activeWordCap: getEndlessActiveWordCap(stage),
    minimumWordLength: profile[1],
    maximumWordLength: profile[2],
    targetAverageLength: profile[3],
    shortReliefChance: stage >= 16 ? 0.12 : 0,
    vocabularyWeights: getEndlessVocabularyWeights(stage),
  });
}

export function getEndlessQuickFingersInterval(stage) {
  return Math.max(
    ENDLESS_CONFIG.quickFingersMinimumSpawnIntervalMs,
    Math.round(
      getEndlessDifficulty(stage).spawnIntervalMs *
      ENDLESS_CONFIG.quickFingersSpawnMultiplier,
    ),
  );
}

export function estimateRequiredWpm({
  targetAverageWordLength,
  spawnIntervalMs,
} = {}) {
  const length = Number.isFinite(targetAverageWordLength)
    ? Math.max(0, targetAverageWordLength)
    : 0;
  const interval = Number.isFinite(spawnIntervalMs)
    ? Math.max(1, spawnIntervalMs)
    : 1;
  return (length / (interval / 1000)) * 60 / 5;
}

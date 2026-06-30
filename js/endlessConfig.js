export const ENDLESS_CONFIG = Object.freeze({
  startingIntegrity: 3,
  stageBannerMs: 1250,
  collisionImmunityMs: 650,
  initialSpawnIntervalMs: 1700,
  lateGameSpawnIntervalMs: 803,
  maxActiveWords: 9,
  movementCapStage: 10,
  movementSpeedCapPxPerSec: 66,
  recentWordHistorySize: 40,
  rollingWpmWindowMs: 15000,
  rollingWpmMinimumSampleMs: 5000,
  survivalPointsPerSecond: 100,
});

export function getEndlessWordsPerStage(stage) {
  const safeStage = Number.isInteger(stage) && stage > 0 ? stage : 1;
  if (safeStage <= 5) return 10;
  if (safeStage <= 10) return 15;
  return 20;
}

export const STANDARD_ENDLESS_RUNTIME = Object.freeze({
  startStage: 1,
  maximumStages: null,
  recordEligible: true,
});

export function isStandardEndlessConfiguration(config = {}, developerMode = false) {
  return (
    developerMode !== true &&
    config.startStage === 1 &&
    config.maximumStages == null &&
    config.recordEligible === true
  );
}

import { ENDLESS_CONFIG } from "./endlessConfig.js";

function safeInteger(value) {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

export function getSurvivalComboBonus(combo) {
  const value = safeInteger(combo);
  if (value >= 50) return 0.06;
  if (value >= 25) return 0.04;
  if (value >= 10) return 0.02;
  return 0;
}

export function getPerfectStreakBonus(streak) {
  const value = safeInteger(streak);
  if (value >= 40) return 0.12;
  if (value >= 20) return 0.09;
  if (value >= 10) return 0.06;
  if (value >= 5) return 0.03;
  return 0;
}

export function getWordScoreMultiplier(combo, perfectStreak) {
  return Math.min(
    1.18,
    1 + getSurvivalComboBonus(combo) + getPerfectStreakBonus(perfectStreak),
  );
}

export function calculateEndlessWordPoints(stage, wordLength, combo, perfectStreak) {
  const base = 80 + 8 * safeInteger(stage) + 2 * safeInteger(wordLength);
  return Math.round(base * getWordScoreMultiplier(combo, perfectStreak));
}

export function calculateEndlessStageBonus(stage) {
  return 250 * safeInteger(stage);
}

export function calculateEndlessSurvivalPoints(activeDurationMs) {
  const duration = Math.max(0, Number.isFinite(activeDurationMs) ? activeDurationMs : 0);
  return Math.floor((duration / 1000) * ENDLESS_CONFIG.survivalPointsPerSecond);
}

export function calculateEndlessScore(activeDurationMs, wordPoints, stageBonusPoints) {
  return (
    calculateEndlessSurvivalPoints(activeDurationMs) +
    safeInteger(wordPoints) +
    safeInteger(stageBonusPoints)
  );
}

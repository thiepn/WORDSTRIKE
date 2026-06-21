function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function getDailyComboMultiplier(combo) {
  if (combo >= 40) return 1.15;
  if (combo >= 20) return 1.10;
  if (combo >= 10) return 1.05;
  return 1;
}

export function calculateDailyWordPoints(wordLength, wave, combo) {
  const base = 100 + 5 * Math.max(0, wordLength) + 25 * Math.max(1, wave);
  return Math.round(base * getDailyComboMultiplier(Math.max(0, combo)));
}

export function calculateDailySuccessBonuses({
  integrityRemaining,
  accuracy,
  activeDurationMs,
} = {}) {
  const completion = 10000;
  const integrity = Math.max(0, integrityRemaining) * 2000;
  const accuracyBonus = Math.round(2000 * clamp(Number(accuracy) || 0, 0, 100) / 100);
  const time = Math.round(
    clamp((180000 - Math.max(0, Number(activeDurationMs) || 0)) / 180000, 0, 1) * 5000,
  );
  return {
    completion,
    integrity,
    accuracy: accuracyBonus,
    time,
    total: completion + integrity + accuracyBonus + time,
  };
}

export function calculateDailyFinalScore({
  wordPoints = 0,
  success = false,
  integrityRemaining = 0,
  accuracy = 0,
  activeDurationMs = 0,
} = {}) {
  const bonuses = success
    ? calculateDailySuccessBonuses({ integrityRemaining, accuracy, activeDurationMs })
    : { completion: 0, integrity: 0, accuracy: 0, time: 0, total: 0 };
  return {
    wordPoints: Math.max(0, Math.round(wordPoints)),
    bonuses,
    total: Math.max(0, Math.round(wordPoints)) + bonuses.total,
  };
}

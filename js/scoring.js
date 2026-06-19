export function calculateWPM(correctCharacters, elapsedMs) {
  const characters = Number.isFinite(correctCharacters) ? Math.max(0, correctCharacters) : 0;
  const duration = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  if (duration <= 0) return 0;
  return (characters / 5) / (duration / 60000);
}

export function calculateAccuracy(correctKeystrokes, totalKeystrokes, missedCharacters = 0) {
  const correct = Number.isFinite(correctKeystrokes) ? Math.max(0, correctKeystrokes) : 0;
  const total = Number.isFinite(totalKeystrokes) ? Math.max(0, totalKeystrokes) : 0;
  const missed = Number.isFinite(missedCharacters) ? Math.max(0, missedCharacters) : 0;
  const denominator = total + missed;
  if (denominator === 0) return 100;
  return Math.max(0, Math.min((correct / denominator) * 100, 100));
}

export function getComboMultiplier(currentCombo) {
  const comboTier = Math.floor(currentCombo / 5);
  return Math.min(1 + comboTier * 0.1, 3);
}

export function calculateWordScore(wordLength, actualTimeSeconds, currentCombo) {
  const baseScore = wordLength * 15;
  const targetTime = wordLength * 0.6;
  const safeTime = Math.max(actualTimeSeconds, 0.05);
  const speedBonus = safeTime <= targetTime
    ? Math.round(baseScore * 0.5 * Math.min(targetTime / safeTime, 2))
    : 0;
  return Math.round((baseScore + speedBonus) * getComboMultiplier(currentCombo));
}

export function calculateGrade({ accuracy, failed = false }) {
  if (failed) return "Fail";
  const safeAccuracy = Number.isFinite(accuracy)
    ? Math.max(0, Math.min(100, accuracy))
    : 0;
  if (safeAccuracy >= 98) return "S";
  if (safeAccuracy >= 95) return "A";
  if (safeAccuracy >= 90) return "B";
  if (safeAccuracy >= 80) return "C";
  return "D";
}

const GRADE_RANK = { D: 1, C: 2, B: 3, A: 4, S: 5 };

export function isBetterGrade(nextGrade, currentGrade) {
  return (GRADE_RANK[nextGrade] || 0) > (GRADE_RANK[currentGrade] || 0);
}

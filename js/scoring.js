export function calculateWPM(correctCharacters, elapsedMs) {
  const characters = Number.isFinite(correctCharacters) ? Math.max(0, correctCharacters) : 0;
  const duration = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  if (duration <= 0) return 0;
  return (characters / 5) / (duration / 60000);
}

export function calculateAccuracy(correctKeystrokes, totalKeystrokes) {
  const correct = Number.isFinite(correctKeystrokes) ? Math.max(0, correctKeystrokes) : 0;
  const total = Number.isFinite(totalKeystrokes) ? Math.max(0, totalKeystrokes) : 0;
  if (total === 0) return 100;
  return Math.min((correct / total) * 100, 100);
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

export function calculateGrade({
  accuracy,
  actualWPM,
  targetWPM,
  livesRemaining,
  startingLives,
  maxComboAchieved,
  wordCount,
  failed = false,
}) {
  if (failed || livesRemaining <= 0) return "Fail";
  const levelScore = calculateLevelScore({
    accuracy,
    actualWPM,
    targetWPM,
    livesRemaining,
    startingLives,
    maxComboAchieved,
    wordCount,
  });
  if (levelScore >= 92) return "S";
  if (levelScore >= 80) return "A";
  if (levelScore >= 65) return "B";
  if (levelScore >= 45) return "C";
  return "D";
}

function finiteNonNegative(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function boundedRatio(numerator, denominator) {
  const safeNumerator = finiteNonNegative(numerator);
  const safeDenominator = finiteNonNegative(denominator);
  if (safeDenominator === 0) return 0;
  return Math.min(safeNumerator / safeDenominator, 1);
}

export function calculateLevelScore({
  accuracy,
  actualWPM,
  targetWPM,
  livesRemaining,
  startingLives,
  maxComboAchieved,
  wordCount,
}) {
  const safeAccuracy = Math.min(finiteNonNegative(accuracy), 100);
  const speedRatio = boundedRatio(actualWPM, targetWPM);
  const livesRatio = boundedRatio(livesRemaining, startingLives);
  const comboRatio = boundedRatio(maxComboAchieved, wordCount);
  return (
    safeAccuracy * 0.4 +
    speedRatio * 100 * 0.3 +
    livesRatio * 100 * 0.2 +
    comboRatio * 100 * 0.1
  );
}

const GRADE_RANK = { D: 1, C: 2, B: 3, A: 4, S: 5 };

export function isBetterGrade(nextGrade, currentGrade) {
  return (GRADE_RANK[nextGrade] || 0) > (GRADE_RANK[currentGrade] || 0);
}

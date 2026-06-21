export const LIFETIME_STATISTICS_VERSION = 1;

function count(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function nullableTimestamp(value) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function createDefaultLifetimeStatistics() {
  return {
    lifetimeVersion: LIFETIME_STATISTICS_VERSION,
    finalizedSessions: 0,
    successfulSessions: 0,
    failedSessions: 0,
    activePlaytimeMs: 0,
    wordsCompleted: 0,
    wordsMissed: 0,
    charactersCorrect: 0,
    charactersIncorrect: 0,
    charactersMissed: 0,
    totalKeystrokes: 0,
    accuracyNumerator: 0,
    accuracyDenominator: 0,
    wpmWeightedTotal: 0,
    wpmWeightedDurationMs: 0,
    firstSessionAt: null,
    lastSessionAt: null,
    historicalBackfillApplied: false,
  };
}

export function backfillLifetimeStatistics(totals = {}, recentSessions = []) {
  const correct = count(totals.correctCharacters);
  const incorrect = count(totals.incorrectCharacters);
  const missed = count(totals.missedCharacters);
  const ended = recentSessions
    .map((session) => nullableTimestamp(session?.endedAt))
    .filter((value) => value != null);
  return {
    ...createDefaultLifetimeStatistics(),
    finalizedSessions: count(totals.completedSessions),
    successfulSessions: Math.max(
      0,
      count(totals.completedSessions) - count(totals.failedSessions),
    ),
    failedSessions: count(totals.failedSessions),
    activePlaytimeMs: count(totals.activePlaytimeMs),
    wordsCompleted: count(totals.wordsCompleted),
    charactersCorrect: correct,
    charactersIncorrect: incorrect,
    charactersMissed: missed,
    totalKeystrokes: count(totals.charactersTyped),
    accuracyNumerator: correct,
    accuracyDenominator: correct + incorrect + missed,
    lastSessionAt: ended.length ? Math.max(...ended) : null,
    historicalBackfillApplied: true,
  };
}

export function sanitizeLifetimeStatistics(value, totals, recentSessions) {
  if (!value || typeof value !== "object" || value.lifetimeVersion !== 1) {
    return backfillLifetimeStatistics(totals, recentSessions);
  }
  const firstSessionAt = nullableTimestamp(value.firstSessionAt);
  const lastSessionAt = nullableTimestamp(value.lastSessionAt);
  return {
    lifetimeVersion: LIFETIME_STATISTICS_VERSION,
    finalizedSessions: count(value.finalizedSessions),
    successfulSessions: count(value.successfulSessions),
    failedSessions: count(value.failedSessions),
    activePlaytimeMs: count(value.activePlaytimeMs),
    wordsCompleted: count(value.wordsCompleted),
    wordsMissed: count(value.wordsMissed),
    charactersCorrect: count(value.charactersCorrect),
    charactersIncorrect: count(value.charactersIncorrect),
    charactersMissed: count(value.charactersMissed),
    totalKeystrokes: count(value.totalKeystrokes),
    accuracyNumerator: count(value.accuracyNumerator),
    accuracyDenominator: count(value.accuracyDenominator),
    wpmWeightedTotal: count(value.wpmWeightedTotal),
    wpmWeightedDurationMs: count(value.wpmWeightedDurationMs),
    firstSessionAt,
    lastSessionAt: firstSessionAt == null || lastSessionAt == null
      ? lastSessionAt
      : Math.max(firstSessionAt, lastSessionAt),
    historicalBackfillApplied: value.historicalBackfillApplied === true,
  };
}

export function applyResultToLifetimeStatistics(lifetime, result) {
  const next = sanitizeLifetimeStatistics(lifetime);
  const correct = count(result?.characters?.correct);
  const incorrect = count(result?.characters?.incorrect);
  const missed = count(result?.characters?.missed);
  const duration = count(result?.activeDurationMs);
  const endedAt = nullableTimestamp(result?.endedAt);
  const wpm = Number(result?.wpm);
  next.finalizedSessions += 1;
  if (result?.success === true) next.successfulSessions += 1;
  else next.failedSessions += 1;
  next.activePlaytimeMs += duration;
  next.wordsCompleted += count(result?.words?.completed);
  next.wordsMissed += count(result?.words?.missed);
  next.charactersCorrect += correct;
  next.charactersIncorrect += incorrect;
  next.charactersMissed += missed;
  next.totalKeystrokes += count(result?.characters?.totalKeystrokes);
  next.accuracyNumerator += correct;
  next.accuracyDenominator += correct + incorrect + missed;
  if (Number.isFinite(wpm) && wpm >= 0 && duration > 0) {
    next.wpmWeightedTotal += wpm * duration;
    next.wpmWeightedDurationMs += duration;
  }
  if (endedAt != null) {
    next.firstSessionAt = next.firstSessionAt == null
      ? endedAt
      : Math.min(next.firstSessionAt, endedAt);
    next.lastSessionAt = next.lastSessionAt == null
      ? endedAt
      : Math.max(next.lastSessionAt, endedAt);
  }
  return next;
}

export function getWeightedLifetimeAccuracy(lifetime) {
  const denominator = count(lifetime?.accuracyDenominator);
  return denominator > 0 ? count(lifetime?.accuracyNumerator) / denominator * 100 : null;
}

export function getWeightedLifetimeWpm(lifetime) {
  const duration = count(lifetime?.wpmWeightedDurationMs);
  return duration > 0 ? count(lifetime?.wpmWeightedTotal) / duration : null;
}

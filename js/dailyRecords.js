import { getPreviousUtcDateKey, isValidDailyDateKey } from "./dailyDate.js";

export const MAX_DAILY_RECORD_DAYS = 90;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compareHigher(next, previous) {
  return number(next) === number(previous) ? 0 : number(next) > number(previous) ? 1 : -1;
}

function compareLower(next, previous) {
  return number(next, Infinity) === number(previous, Infinity)
    ? 0
    : number(next, Infinity) < number(previous, Infinity) ? 1 : -1;
}

export function compareDailyResults(next, previous) {
  if (!previous) return 1;
  if (Boolean(next.success) !== Boolean(previous.success)) return next.success ? 1 : -1;
  const comparisons = next.success
    ? [
      compareHigher(next.score, previous.score),
      compareLower(next.activeDurationMs, previous.activeDurationMs),
      compareHigher(next.accuracy, previous.accuracy),
      compareHigher(next.wordsCompleted, previous.wordsCompleted),
      compareLower(next.endedAt, previous.endedAt),
    ]
    : [
      compareHigher(next.wordsResolved, previous.wordsResolved),
      compareHigher(next.wordsCompleted, previous.wordsCompleted),
      compareHigher(next.score, previous.score),
      compareHigher(next.accuracy, previous.accuracy),
      compareHigher(next.activeDurationMs, previous.activeDurationMs),
      compareLower(next.endedAt, previous.endedAt),
    ];
  return comparisons.find(Boolean) || 0;
}

export function compactDailyResult(result) {
  return {
    success: result.success === true,
    score: number(result.score),
    activeDurationMs: number(result.activeDurationMs),
    accuracy: number(result.accuracy),
    wordsCompleted: number(result.modeData?.wordsCompleted ?? result.words?.completed),
    wordsResolved: number(result.modeData?.wordsResolved ?? result.words?.total),
    integrityRemaining: number(result.modeData?.integrityRemaining),
    endedAt: number(result.endedAt),
    sessionId: typeof result.sessionId === "string" ? result.sessionId : null,
  };
}

export function createDefaultDailyRecords() {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastSuccessfulDateKey: null,
    distinctCompletedDays: 0,
    days: {},
  };
}

export function updateDailyRecords(records, result) {
  const dateKey = result.modeData?.dateKey;
  if (!isValidDailyDateKey(dateKey)) return records;
  const next = {
    ...createDefaultDailyRecords(),
    ...records,
    days: { ...(records?.days || {}) },
  };
  const previousDay = next.days[dateKey] || {
    attempts: 0,
    best: null,
    firstCompletedAt: null,
    lastAttemptAt: null,
  };
  const wasCompleted = previousDay.firstCompletedAt != null || previousDay.best?.success === true;
  const compact = compactDailyResult(result);
  const day = {
    attempts: Math.max(0, number(previousDay.attempts)) + 1,
    best: compareDailyResults(compact, previousDay.best) > 0 ? compact : previousDay.best,
    firstCompletedAt: previousDay.firstCompletedAt,
    lastAttemptAt: number(result.endedAt),
  };
  if (result.success && day.firstCompletedAt == null) day.firstCompletedAt = number(result.endedAt);
  if (result.success && !wasCompleted) {
    next.distinctCompletedDays = Math.max(0, number(next.distinctCompletedDays)) + 1;
  }
  next.days[dateKey] = day;

  if (result.success && (!next.lastSuccessfulDateKey || dateKey >= next.lastSuccessfulDateKey)) {
    if (dateKey !== next.lastSuccessfulDateKey) {
      next.currentStreak = getPreviousUtcDateKey(dateKey) === next.lastSuccessfulDateKey
        ? Math.max(0, number(next.currentStreak)) + 1
        : 1;
      next.lastSuccessfulDateKey = dateKey;
      next.bestStreak = Math.max(number(next.bestStreak), next.currentStreak);
    }
  }
  next.days = Object.fromEntries(
    Object.entries(next.days)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, MAX_DAILY_RECORD_DAYS),
  );
  return next;
}

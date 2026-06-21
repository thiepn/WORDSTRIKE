import { getAllSpeedTestConfigs, SPEED_TEST_TYPES } from "./speedTestConfig.js";
import { getWeightedLifetimeAccuracy, getWeightedLifetimeWpm } from "./lifetimeStatistics.js";
import { getUtcDateKey } from "./dailyDate.js";
import { SPEED_TEST_WORD_SET } from "./speedTestWords.js";

function number(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function activityMetric(mode, key) {
  return number(mode?.activity?.trackedSessions, 0) > 0
    ? number(mode?.activity?.[key], 0)
    : null;
}

function activityAccuracy(mode) {
  const denominator = activityMetric(mode, "accuracyDenominator");
  return denominator > 0
    ? activityMetric(mode, "accuracyNumerator") / denominator * 100
    : null;
}

function activityWpm(mode) {
  const duration = activityMetric(mode, "wpmWeightedDurationMs");
  return duration > 0
    ? activityMetric(mode, "wpmWeightedTotal") / duration
    : null;
}

export function getLifetimeStatistics(storage = {}) {
  const lifetime = storage.lifetime || {};
  return {
    finalizedSessions: number(lifetime.finalizedSessions, 0),
    successfulSessions: number(lifetime.successfulSessions, 0),
    failedSessions: number(lifetime.failedSessions, 0),
    activePlaytimeMs: number(lifetime.activePlaytimeMs, 0),
    wordsCompleted: number(lifetime.wordsCompleted, 0),
    wordsMissed: number(lifetime.wordsMissed, 0),
    charactersCorrect: number(lifetime.charactersCorrect, 0),
    charactersIncorrect: number(lifetime.charactersIncorrect, 0),
    charactersMissed: number(lifetime.charactersMissed, 0),
    totalKeystrokes: number(lifetime.totalKeystrokes, 0),
    accuracy: getWeightedLifetimeAccuracy(lifetime),
    weightedWpm: getWeightedLifetimeWpm(lifetime),
    firstSessionAt: number(lifetime.firstSessionAt),
    lastSessionAt: number(lifetime.lastSessionAt),
  };
}

function bestTypingWpm(storage) {
  const records = storage.modes?.["speed-test"]?.wordSetRecords?.[SPEED_TEST_WORD_SET.id] || {};
  const values = Object.values(records).map((record) => number(record?.bestWpm)).filter((value) => value != null);
  return values.length ? Math.max(...values) : null;
}

export function getCampaignStatistics(storage = {}, save = {}) {
  const levels = save.levels && typeof save.levels === "object" ? save.levels : {};
  const completed = Object.entries(levels)
    .filter(([key, result]) => {
      const level = Number(key);
      return Number.isInteger(level) && level >= 1 && level <= 100 &&
        result && ["S", "A", "B", "C", "D"].includes(result.grade);
    });
  const completedLevels = completed.map(([key]) => Number(key)).sort((a, b) => a - b);
  const grades = Object.fromEntries(["S", "A", "B", "C", "D"].map((grade) => [
    grade,
    completed.filter(([, result]) => result.grade === grade).length,
  ]));
  const mode = storage.modes?.campaign || {};
  return {
    highestUnlockedLevel: Math.min(100, Math.max(1, number(save.currentFurthestLevel, 1))),
    highestCompletedLevel: completedLevels.length ? completedLevels.at(-1) : null,
    levelsCompleted: completedLevels.length,
    completionPercentage: completedLevels.length,
    bossesCompleted: completedLevels.filter((level) => level % 10 === 0).length,
    grades,
    sessions: number(mode.completedSessions, 0),
    successfulRuns: Math.max(0, number(mode.completedSessions, 0) - number(mode.failedSessions, 0)),
    failedRuns: number(mode.failedSessions, 0),
    activePlaytimeMs: number(mode.activePlaytimeMs, 0),
    wordsCompleted: activityMetric(mode, "wordsCompleted"),
    weightedAccuracy: activityAccuracy(mode),
    weightedWpm: activityWpm(mode),
  };
}

export function getTypingTestStatistics(storage = {}) {
  const mode = storage.modes?.["speed-test"] || {};
  const records = mode.wordSetRecords?.[SPEED_TEST_WORD_SET.id] || {};
  const mapRecord = (config) => {
    const record = records[config.configId] || {};
    return {
      configId: config.configId,
      label: config.label,
      type: config.testType,
      bestWpm: number(record.bestWpm),
      accuracy: number(record.tieAccuracy ?? record.bestAccuracy),
      rawWpm: number(record.bestRawWpm),
      achievedAt: number(record.bestResultAt),
    };
  };
  const all = getAllSpeedTestConfigs().map(mapRecord);
  const usage = mode.wordSetConfigUsage?.[SPEED_TEST_WORD_SET.id] || {};
  const activity = mode.wordSetActivity?.[SPEED_TEST_WORD_SET.id] || {};
  const reliableUsage = Object.values(usage).some((value) => number(value, 0) > 0);
  const mostUsed = reliableUsage
    ? getAllSpeedTestConfigs().reduce((best, config) => (
      number(usage[config.configId], 0) > number(usage[best?.configId], -1) ? config : best
    ), null)
    : null;
  return {
    wordSet: SPEED_TEST_WORD_SET,
    timeRecords: all.filter((record) => record.type === SPEED_TEST_TYPES.TIME),
    wordRecords: all.filter((record) => record.type === SPEED_TEST_TYPES.WORDS),
    testsCompleted: number(activity.trackedSessions, 0),
    activePlaytimeMs: activity.trackedSessions > 0 ? number(activity.activePlaytimeMs, 0) : null,
    bestWpm: bestTypingWpm(storage),
    bestAccuracy: Object.values(records)
      .map((record) => number(record?.bestAccuracy))
      .filter((value) => value != null)
      .reduce((best, value) => best == null ? value : Math.max(best, value), null),
    charactersTyped: activity.trackedSessions > 0 ? number(activity.totalKeystrokes, 0) : null,
    wordsCompleted: activity.trackedSessions > 0 ? number(activity.wordsCompleted, 0) : null,
    mostUsedConfiguration: mostUsed?.label || null,
  };
}

export function getEndlessStatistics(storage = {}) {
  const mode = storage.modes?.endless || {};
  const records = mode.records || {};
  return {
    highestStage: number(records.bestStage?.stage ?? mode.highestStage),
    bestScore: number(records.highestScore?.score ?? mode.highestScore),
    longestSurvivalMs: number(records.longestSurvival?.survivalTimeMs),
    bestAccuracy: number(records.bestAccuracy?.value ?? mode.bestAccuracy),
    bestAverageWpm: number(records.bestAverageWpm?.value ?? mode.bestWpm),
    maximumCombo: number(records.highestCombo?.value),
    maximumPerfectStreak: number(records.highestPerfectStreak?.value),
    totalRuns: number(mode.completedSessions, 0),
    finalizedRuns: number(mode.completedSessions, 0),
    activePlaytimeMs: number(mode.activePlaytimeMs, 0),
    wordsCompleted: activityMetric(mode, "wordsCompleted"),
    coreBreaches: activityMetric(mode, "coreBreaches"),
  };
}

export function getDailyStatistics(storage = {}, utcDateKey = getUtcDateKey()) {
  const mode = storage.modes?.daily || {};
  const records = mode.records || {};
  const days = records.days || {};
  const today = days[utcDateKey] || {};
  const latestDates = Object.entries(days)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .map(([dateKey, day]) => ({
      dateKey,
      attempts: number(day.attempts, 0),
      completed: day.firstCompletedAt != null || day.best?.success === true,
      score: number(day.best?.score),
      bestTimeMs: day.best?.success ? number(day.best.activeDurationMs) : null,
    }));
  return {
    utcDateKey,
    currentStreak: number(records.currentStreak, 0),
    bestStreak: number(records.bestStreak, 0),
    todayAttempts: number(today.attempts, 0),
    todayBestScore: number(today.best?.score),
    todayBestTimeMs: today.best?.success ? number(today.best.activeDurationMs) : null,
    todayCompleted: today.firstCompletedAt != null || today.best?.success === true,
    totalAttempts: number(mode.completedSessions, 0),
    successfulCompletions: Math.max(
      0,
      number(mode.completedSessions, 0) - number(mode.failedSessions, 0),
    ),
    distinctDaysCompleted: number(records.distinctCompletedDays, 0),
    activePlaytimeMs: number(mode.activePlaytimeMs, 0),
    bestScore: number(mode.highestScore),
    latestDates,
  };
}

export function getRecentSessionStatistics(storage = {}, modeFilter = "all") {
  const allowed = new Set(["all", "campaign", "speed-test", "endless", "daily"]);
  const filter = allowed.has(modeFilter) ? modeFilter : "all";
  return [...(storage.recentSessions || [])]
    .filter((session) => filter === "all" || session.modeId === filter)
    .sort((a, b) => number(b.endedAt, 0) - number(a.endedAt, 0))
    .slice(0, 30)
    .map((session) => {
      let primaryMetric = null;
      if (session.modeId === "campaign") {
        primaryMetric = session.modeData?.level == null
          ? null
          : `LEVEL ${session.modeData.level}${session.grade ? ` · ${session.grade}` : ""}`;
      } else if (session.modeId === "speed-test") {
        const wordSetName = session.modeData?.wordSetId === SPEED_TEST_WORD_SET.id
          ? SPEED_TEST_WORD_SET.name
          : session.modeData?.wordSetName || "LEGACY TEST";
        primaryMetric = `${wordSetName} · ${session.modeData?.configId || "TEST"} · ${Math.round(number(session.wpm, 0))} WPM`;
      } else if (session.modeId === "endless") {
        primaryMetric = `STAGE ${number(session.modeData?.highestStage, 0)} · ${number(session.score, 0).toLocaleString("en-US")}`;
      } else if (session.modeId === "daily") {
        primaryMetric = `${session.success ? "COMPLETE" : "FAILED"} · ${number(session.score, 0).toLocaleString("en-US")}`;
      }
      return {
        sessionId: session.sessionId,
        modeId: session.modeId,
        endedAt: number(session.endedAt),
        success: session.success === true,
        primaryMetric,
        accuracy: number(session.accuracy),
        wpm: number(session.wpm),
        activeDurationMs: number(session.activeDurationMs),
      };
    });
}

export function getOverviewStatistics(storage = {}, save = {}) {
  const lifetime = getLifetimeStatistics(storage);
  const campaign = getCampaignStatistics(storage, save);
  const endless = getEndlessStatistics(storage);
  const daily = getDailyStatistics(storage);
  return {
    profile: storage.profile || null,
    lifetime,
    campaignProgress: campaign.levelsCompleted,
    bestTypingWpm: bestTypingWpm(storage),
    highestEndlessStage: endless.highestStage,
    dailyStreak: daily.currentStreak,
    recent: getRecentSessionStatistics(storage).slice(0, 5),
  };
}

export function getStatisticsSnapshot(storage = {}, save = {}, utcDateKey = getUtcDateKey()) {
  return {
    profile: storage.profile || null,
    lifetime: getLifetimeStatistics(storage),
    overview: getOverviewStatistics(storage, save),
    campaign: getCampaignStatistics(storage, save),
    typingTest: getTypingTestStatistics(storage),
    endless: getEndlessStatistics(storage),
    daily: getDailyStatistics(storage, utcDateKey),
    recent: getRecentSessionStatistics(storage),
  };
}

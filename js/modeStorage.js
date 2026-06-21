import { getAllModes, getModeDefinition } from "./modes.js";
import { SPEED_TEST_CONFIG_IDS } from "./speedTestConfig.js";
import {
  createDefaultDailyRecords,
  MAX_DAILY_RECORD_DAYS,
  updateDailyRecords,
} from "./dailyRecords.js";
import { getUtcDateKey, isValidDailyDateKey } from "./dailyDate.js";
import { DAILY_CHALLENGE_VERSION, DAILY_TOTAL_WORDS } from "./dailyConfig.js";
import { getDailyChallengeSeed } from "./dailyGenerator.js";
import {
  createDefaultPlayerProfile,
  getPublicPlayerProfile as selectPublicPlayerProfile,
  sanitizePlayerProfile,
  updateDisplayName,
  validateDisplayName,
} from "./playerProfile.js";
import {
  applyResultToLifetimeStatistics,
  createDefaultLifetimeStatistics,
  sanitizeLifetimeStatistics,
} from "./lifetimeStatistics.js";

export const MODE_DATA_STORAGE_KEY = "wordstrike_mode_data_v1";
export const MODE_DATA_SCHEMA_VERSION = 1;
export const MAX_RECENT_SESSIONS = 30;
const MAX_RECORDED_SESSION_IDS = 100;

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function nullableFinite(value) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function createSpeedTestRecord() {
  return {
    bestWpm: null,
    bestRawWpm: null,
    bestAccuracy: null,
    bestExactWords: null,
    bestResultAt: null,
    sessionId: null,
    tieAccuracy: null,
    tieRawWpm: null,
  };
}

function createEndlessRecords() {
  return {
    bestStage: null,
    highestScore: null,
    longestSurvival: null,
    mostWordsCompleted: null,
    highestCombo: null,
    highestPerfectStreak: null,
    bestAccuracy: null,
    bestAverageWpm: null,
  };
}

function createModeSummary(modeId) {
  const summary = {
    completedSessions: 0,
    failedSessions: 0,
    activePlaytimeMs: 0,
    bestWpm: null,
    bestAccuracy: null,
    highestScore: null,
    activity: {
      activityVersion: 1,
      trackedSessions: 0,
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
      coreBreaches: 0,
    },
  };
  if (modeId === "speed-test") {
    summary.records = Object.fromEntries(
      SPEED_TEST_CONFIG_IDS.map((configId) => [configId, createSpeedTestRecord()]),
    );
    summary.configUsage = Object.fromEntries(
      SPEED_TEST_CONFIG_IDS.map((configId) => [configId, 0]),
    );
  }
  if (modeId === "endless") {
    summary.highestStage = null;
    summary.records = createEndlessRecords();
  }
  if (modeId === "daily") summary.records = createDefaultDailyRecords();
  return summary;
}

export function createDefaultModeData() {
  return {
    schemaVersion: MODE_DATA_SCHEMA_VERSION,
    profile: null,
    lifetime: createDefaultLifetimeStatistics(),
    totals: {
      completedSessions: 0,
      failedSessions: 0,
      activePlaytimeMs: 0,
      charactersTyped: 0,
      correctCharacters: 0,
      incorrectCharacters: 0,
      missedCharacters: 0,
      wordsCompleted: 0,
    },
    modes: Object.fromEntries(
      getAllModes().map((mode) => [mode.id, createModeSummary(mode.id)]),
    ),
    recentSessions: [],
    recordedSessionIds: [],
  };
}

function sanitizeSpeedTestRecord(value) {
  return {
    bestWpm: nullableFinite(value?.bestWpm),
    bestRawWpm: nullableFinite(value?.bestRawWpm),
    bestAccuracy: nullableFinite(value?.bestAccuracy),
    bestExactWords: nullableFinite(value?.bestExactWords),
    bestResultAt: nullableFinite(value?.bestResultAt),
    sessionId: typeof value?.sessionId === "string" ? value.sessionId : null,
    tieAccuracy: nullableFinite(value?.tieAccuracy),
    tieRawWpm: nullableFinite(value?.tieRawWpm),
  };
}

function sanitizeRecordObject(value, fields) {
  if (!value || typeof value !== "object") return null;
  const record = {};
  for (const field of fields) {
    record[field] = field === "sessionId"
      ? (typeof value[field] === "string" ? value[field] : null)
      : nullableFinite(value[field]);
  }
  return record;
}

function sanitizeEndlessRecords(value) {
  return {
    bestStage: sanitizeRecordObject(value?.bestStage, [
      "stage", "score", "wordsCompleted", "accuracy", "achievedAt", "sessionId",
    ]),
    highestScore: sanitizeRecordObject(value?.highestScore, [
      "score", "stage", "wordsCompleted", "accuracy", "achievedAt", "sessionId",
    ]),
    longestSurvival: sanitizeRecordObject(value?.longestSurvival, [
      "survivalTimeMs", "stage", "achievedAt", "sessionId",
    ]),
    mostWordsCompleted: sanitizeRecordObject(value?.mostWordsCompleted, [
      "wordsCompleted", "stage", "achievedAt", "sessionId",
    ]),
    highestCombo: sanitizeRecordObject(value?.highestCombo, [
      "value", "stage", "achievedAt", "sessionId",
    ]),
    highestPerfectStreak: sanitizeRecordObject(value?.highestPerfectStreak, [
      "value", "stage", "achievedAt", "sessionId",
    ]),
    bestAccuracy: sanitizeRecordObject(value?.bestAccuracy, [
      "value", "stage", "achievedAt", "sessionId",
    ]),
    bestAverageWpm: sanitizeRecordObject(value?.bestAverageWpm, [
      "value", "stage", "achievedAt", "sessionId",
    ]),
  };
}

function sanitizeDailyBest(value) {
  if (!value || typeof value !== "object") return null;
  return {
    success: value.success === true,
    score: finiteNonNegative(value.score),
    activeDurationMs: finiteNonNegative(value.activeDurationMs),
    accuracy: Math.max(0, Math.min(100, finiteNonNegative(value.accuracy))),
    wordsCompleted: finiteNonNegative(value.wordsCompleted),
    wordsResolved: finiteNonNegative(value.wordsResolved),
    integrityRemaining: finiteNonNegative(value.integrityRemaining),
    endedAt: finiteNonNegative(value.endedAt),
    sessionId: typeof value.sessionId === "string" ? value.sessionId : null,
  };
}

function sanitizeDailyRecords(value) {
  const entries = Object.entries(value?.days || {})
    .filter(([dateKey]) => isValidDailyDateKey(dateKey))
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, MAX_DAILY_RECORD_DAYS)
    .map(([dateKey, day]) => [dateKey, {
      attempts: finiteNonNegative(day?.attempts),
      best: sanitizeDailyBest(day?.best),
      firstCompletedAt: nullableFinite(day?.firstCompletedAt),
      lastAttemptAt: nullableFinite(day?.lastAttemptAt),
    }]);
  return {
    currentStreak: finiteNonNegative(value?.currentStreak),
    bestStreak: finiteNonNegative(value?.bestStreak),
    distinctCompletedDays: value?.distinctCompletedDays == null
      ? entries.filter(([, day]) => day.firstCompletedAt != null || day.best?.success).length
      : finiteNonNegative(value.distinctCompletedDays),
    lastSuccessfulDateKey: isValidDailyDateKey(value?.lastSuccessfulDateKey)
      ? value.lastSuccessfulDateKey
      : null,
    days: Object.fromEntries(entries),
  };
}

function sanitizeModeActivity(value) {
  const defaults = createModeSummary("campaign").activity;
  if (!value || typeof value !== "object" || value.activityVersion !== 1) return defaults;
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
    key,
    key === "activityVersion" ? 1 : finiteNonNegative(value[key], fallback),
  ]));
}

function sanitizeModeSummary(value, modeId) {
  const defaults = createModeSummary(modeId);
  const summary = {
    ...defaults,
    completedSessions: finiteNonNegative(value?.completedSessions),
    failedSessions: finiteNonNegative(value?.failedSessions),
    activePlaytimeMs: finiteNonNegative(value?.activePlaytimeMs),
    bestWpm: nullableFinite(value?.bestWpm),
    bestAccuracy: nullableFinite(value?.bestAccuracy),
    highestScore: nullableFinite(value?.highestScore),
    activity: sanitizeModeActivity(value?.activity),
  };
  if (modeId === "speed-test") {
    summary.records = Object.fromEntries(SPEED_TEST_CONFIG_IDS.map((configId) => [
      configId,
      sanitizeSpeedTestRecord(value?.records?.[configId]),
    ]));
    summary.configUsage = Object.fromEntries(SPEED_TEST_CONFIG_IDS.map((configId) => [
      configId,
      finiteNonNegative(value?.configUsage?.[configId]),
    ]));
  }
  if (modeId === "endless") {
    summary.highestStage = nullableFinite(value?.highestStage);
    summary.records = sanitizeEndlessRecords(value?.records);
  }
  if (modeId === "daily") summary.records = sanitizeDailyRecords(value?.records);
  return summary;
}

function sanitizeRecentSummary(value) {
  if (!value || typeof value.sessionId !== "string" || !getModeDefinition(value.modeId)) {
    return null;
  }
  return {
    sessionId: value.sessionId,
    modeId: value.modeId,
    variantId: typeof value.variantId === "string" ? value.variantId : null,
    endedAt: finiteNonNegative(value.endedAt),
    success: value.success === true,
    score: value.score == null ? null : finiteNonNegative(value.score),
    grade: typeof value.grade === "string" ? value.grade : null,
    accuracy: Math.max(0, Math.min(100, finiteNonNegative(value.accuracy))),
    wpm: finiteNonNegative(value.wpm),
    activeDurationMs: finiteNonNegative(value.activeDurationMs),
    modeData: {
      level: Number.isInteger(Number(value.modeData?.level))
        ? Number(value.modeData.level)
        : null,
      configId: typeof value.modeData?.configId === "string"
        ? value.modeData.configId
        : null,
      metricVersion: finiteNonNegative(value.modeData?.metricVersion),
      rawWpm: nullableFinite(value.modeData?.rawWpm),
      correctTestCharacters: finiteNonNegative(value.modeData?.correctTestCharacters),
      rawTestCharacters: finiteNonNegative(value.modeData?.rawTestCharacters),
      correctSpaces: finiteNonNegative(value.modeData?.correctSpaces),
      validSpaces: finiteNonNegative(value.modeData?.validSpaces),
      backspaces: finiteNonNegative(value.modeData?.backspaces),
      wordDeletes: finiteNonNegative(value.modeData?.wordDeletes),
      completedWordCount: finiteNonNegative(value.modeData?.completedWordCount),
      highestStage: nullableFinite(value.modeData?.highestStage),
      wordsCompleted: finiteNonNegative(value.modeData?.wordsCompleted),
      survivalTimeMs: finiteNonNegative(value.modeData?.survivalTimeMs),
      dateKey: isValidDailyDateKey(value.modeData?.dateKey) ? value.modeData.dateKey : null,
      challengeVersion: finiteNonNegative(value.modeData?.challengeVersion),
      wordsResolved: finiteNonNegative(value.modeData?.wordsResolved),
      integrityRemaining: finiteNonNegative(value.modeData?.integrityRemaining),
    },
  };
}

function sanitizeModeData(value) {
  const defaults = createDefaultModeData();
  if (!value || typeof value !== "object") return defaults;
  const recentSessions = Array.isArray(value.recentSessions)
    ? value.recentSessions.map(sanitizeRecentSummary).filter(Boolean)
    : [];
  const recordedIds = Array.isArray(value.recordedSessionIds)
    ? value.recordedSessionIds.filter((id) => typeof id === "string")
    : recentSessions.map(({ sessionId }) => sessionId);
  const totals = {
    completedSessions: finiteNonNegative(value.totals?.completedSessions),
    failedSessions: finiteNonNegative(value.totals?.failedSessions),
    activePlaytimeMs: finiteNonNegative(value.totals?.activePlaytimeMs),
    charactersTyped: finiteNonNegative(value.totals?.charactersTyped),
    correctCharacters: finiteNonNegative(value.totals?.correctCharacters),
    incorrectCharacters: finiteNonNegative(value.totals?.incorrectCharacters),
    missedCharacters: finiteNonNegative(value.totals?.missedCharacters),
    wordsCompleted: finiteNonNegative(value.totals?.wordsCompleted),
  };
  return {
    schemaVersion: MODE_DATA_SCHEMA_VERSION,
    profile: sanitizePlayerProfile(value.profile),
    lifetime: sanitizeLifetimeStatistics(value.lifetime, totals, recentSessions),
    totals,
    modes: Object.fromEntries(getAllModes().map((mode) => [
      mode.id,
      sanitizeModeSummary(value.modes?.[mode.id], mode.id),
    ])),
    recentSessions: recentSessions.slice(0, MAX_RECENT_SESSIONS),
    recordedSessionIds: [...new Set(recordedIds)].slice(0, MAX_RECORDED_SESSION_IDS),
  };
}

function applyResultToModeActivity(mode, result) {
  const activity = mode.activity;
  const correct = finiteNonNegative(result.characters?.correct);
  const incorrect = finiteNonNegative(result.characters?.incorrect);
  const missed = finiteNonNegative(result.characters?.missed);
  const duration = finiteNonNegative(result.activeDurationMs);
  const wpm = nullableFinite(result.wpm);
  activity.trackedSessions += 1;
  activity.wordsCompleted += finiteNonNegative(result.words?.completed);
  activity.wordsMissed += finiteNonNegative(result.words?.missed);
  activity.charactersCorrect += correct;
  activity.charactersIncorrect += incorrect;
  activity.charactersMissed += missed;
  activity.totalKeystrokes += finiteNonNegative(result.characters?.totalKeystrokes);
  activity.accuracyNumerator += correct;
  activity.accuracyDenominator += correct + incorrect + missed;
  if (wpm != null && wpm >= 0 && duration > 0) {
    activity.wpmWeightedTotal += wpm * duration;
    activity.wpmWeightedDurationMs += duration;
  }
  if (result.modeId === "endless") {
    activity.coreBreaches += finiteNonNegative(result.modeData?.coreBreaches);
  }
}

export function loadModeData() {
  try {
    const raw = globalThis.localStorage?.getItem(MODE_DATA_STORAGE_KEY);
    return sanitizeModeData(raw ? JSON.parse(raw) : null);
  } catch {
    return createDefaultModeData();
  }
}

export function saveModeData(data) {
  const sanitized = sanitizeModeData(data);
  try {
    globalThis.localStorage?.setItem(
      MODE_DATA_STORAGE_KEY,
      JSON.stringify(sanitized),
    );
  } catch {
    return false;
  }
  return true;
}

function better(previous, next) {
  const value = nullableFinite(next);
  if (value == null) return previous;
  return previous == null ? value : Math.max(previous, value);
}

function shouldReplaceWpmRecord(record, result) {
  const wpm = nullableFinite(result.wpm);
  const accuracy = nullableFinite(result.accuracy);
  const rawWpm = nullableFinite(result.modeData?.rawWpm);
  const endedAt = nullableFinite(result.endedAt);
  if (wpm == null) return false;
  if (record.bestWpm == null || wpm > record.bestWpm) return true;
  if (wpm < record.bestWpm) return false;
  if ((accuracy ?? 0) > (record.tieAccuracy ?? 0)) return true;
  if ((accuracy ?? 0) < (record.tieAccuracy ?? 0)) return false;
  if ((rawWpm ?? 0) > (record.tieRawWpm ?? 0)) return true;
  if ((rawWpm ?? 0) < (record.tieRawWpm ?? 0)) return false;
  return record.bestResultAt == null || (endedAt != null && endedAt < record.bestResultAt);
}

function compareDescending(next, previous) {
  if (next > previous) return 1;
  if (next < previous) return -1;
  return 0;
}

export function isBetterEndlessStageRecord(next, previous) {
  if (!previous) return true;
  for (const field of ["stage", "score", "wordsCompleted", "accuracy"]) {
    const comparison = compareDescending(
      finiteNonNegative(next?.[field]),
      finiteNonNegative(previous?.[field]),
    );
    if (comparison) return comparison > 0;
  }
  return finiteNonNegative(next?.achievedAt, Infinity)
    < finiteNonNegative(previous?.achievedAt, Infinity);
}

export function isBetterEndlessScoreRecord(next, previous) {
  if (!previous) return true;
  for (const field of ["score", "stage", "accuracy"]) {
    const comparison = compareDescending(
      finiteNonNegative(next?.[field]),
      finiteNonNegative(previous?.[field]),
    );
    if (comparison) return comparison > 0;
  }
  return finiteNonNegative(next?.achievedAt, Infinity)
    < finiteNonNegative(previous?.achievedAt, Infinity);
}

function updateIndependentRecord(records, key, next, valueField) {
  const previous = records[key];
  const nextValue = finiteNonNegative(next[valueField]);
  const previousValue = finiteNonNegative(previous?.[valueField], -1);
  if (
    !previous ||
    nextValue > previousValue ||
    (
      nextValue === previousValue &&
      (
        finiteNonNegative(next.stage) > finiteNonNegative(previous.stage) ||
        (
          finiteNonNegative(next.stage) === finiteNonNegative(previous.stage) &&
          finiteNonNegative(next.achievedAt, Infinity)
            < finiteNonNegative(previous.achievedAt, Infinity)
        )
      )
    )
  ) {
    records[key] = next;
  }
}

function isEligibleDailyResult(result) {
  const dateKey = result?.modeData?.dateKey;
  return (
    result?.developerMode !== true &&
    result?.variantId === `v${DAILY_CHALLENGE_VERSION}` &&
    result?.modeData?.challengeVersion === DAILY_CHALLENGE_VERSION &&
    result?.modeData?.dateOverride !== true &&
    result?.modeData?.totalWords === DAILY_TOTAL_WORDS &&
    result?.modeData?.recordEligible === true &&
    dateKey === getUtcDateKey() &&
    result?.seed === getDailyChallengeSeed(dateKey)
  );
}

export function getSpeedTestRecord(configId) {
  if (!SPEED_TEST_CONFIG_IDS.includes(configId)) return null;
  return {
    ...loadModeData().modes["speed-test"].records[configId],
  };
}

export function getSpeedTestRecordFlags(result, previous = null) {
  const record = previous || getSpeedTestRecord(result?.modeData?.configId);
  if (!record) {
    return { newWpmRecord: false, newRawWpmRecord: false, newAccuracyRecord: false };
  }
  return {
    newWpmRecord: shouldReplaceWpmRecord(record, result),
    newRawWpmRecord: record.bestRawWpm == null || result.modeData.rawWpm > record.bestRawWpm,
    newAccuracyRecord: record.bestAccuracy == null || result.accuracy > record.bestAccuracy,
  };
}

export function recordCompletedSession(result) {
  if (
    !result ||
    result.schemaVersion !== 1 ||
    result.developerMode === true ||
    (
      result.modeId === "speed-test" &&
      !SPEED_TEST_CONFIG_IDS.includes(result.modeData?.configId)
    ) ||
    (
      result.modeId === "endless" &&
      result.modeData?.recordEligible !== true
    ) ||
    (
      result.modeId === "daily" &&
      !isEligibleDailyResult(result)
    ) ||
    result.state === "aborted" ||
    result.sessionState === "aborted" ||
    typeof result.sessionId !== "string" ||
    !getModeDefinition(result.modeId)
  ) {
    return false;
  }
  const data = loadModeData();
  if (data.recordedSessionIds.includes(result.sessionId)) return false;
  const failed = result.success !== true;
  data.totals.completedSessions += 1;
  if (failed) data.totals.failedSessions += 1;
  data.totals.activePlaytimeMs += finiteNonNegative(result.activeDurationMs);
  data.totals.charactersTyped += finiteNonNegative(result.characters?.totalKeystrokes);
  data.totals.correctCharacters += finiteNonNegative(result.characters?.correct);
  data.totals.incorrectCharacters += finiteNonNegative(result.characters?.incorrect);
  data.totals.missedCharacters += finiteNonNegative(result.characters?.missed);
  data.totals.wordsCompleted += finiteNonNegative(result.words?.completed);

  const mode = data.modes[result.modeId];
  mode.completedSessions += 1;
  if (failed) mode.failedSessions += 1;
  mode.activePlaytimeMs += finiteNonNegative(result.activeDurationMs);
  mode.bestWpm = better(mode.bestWpm, result.wpm);
  mode.bestAccuracy = better(mode.bestAccuracy, result.accuracy);
  mode.highestScore = better(mode.highestScore, result.score);
  applyResultToModeActivity(mode, result);
  data.lifetime = applyResultToLifetimeStatistics(data.lifetime, result);

  if (
    result.modeId === "speed-test" &&
    SPEED_TEST_CONFIG_IDS.includes(result.modeData?.configId)
  ) {
    mode.configUsage[result.modeData.configId] += 1;
    const record = mode.records[result.modeData.configId];
    const flags = getSpeedTestRecordFlags(result, record);
    if (flags.newWpmRecord) {
      record.bestWpm = result.wpm;
      record.bestResultAt = result.endedAt;
      record.sessionId = result.sessionId;
      record.tieAccuracy = result.accuracy;
      record.tieRawWpm = result.modeData.rawWpm;
    }
    if (flags.newRawWpmRecord) record.bestRawWpm = result.modeData.rawWpm;
    if (flags.newAccuracyRecord) record.bestAccuracy = result.accuracy;
    record.bestExactWords = better(record.bestExactWords, result.modeData.exactWords);
  }
  if (result.modeId === "endless") {
    const records = mode.records;
    const stage = finiteNonNegative(result.modeData?.highestStage);
    const achievedAt = finiteNonNegative(result.endedAt);
    const sessionId = result.sessionId;
    const base = {
      stage,
      achievedAt,
      sessionId,
    };
    const bestStage = {
      ...base,
      score: finiteNonNegative(result.score),
      wordsCompleted: finiteNonNegative(result.modeData?.wordsCompleted),
      accuracy: finiteNonNegative(result.accuracy),
    };
    if (isBetterEndlessStageRecord(bestStage, records.bestStage)) {
      records.bestStage = bestStage;
    }
    const highestScore = {
      ...bestStage,
    };
    if (isBetterEndlessScoreRecord(highestScore, records.highestScore)) {
      records.highestScore = highestScore;
    }
    updateIndependentRecord(records, "longestSurvival", {
      ...base,
      survivalTimeMs: finiteNonNegative(result.modeData?.survivalTimeMs),
    }, "survivalTimeMs");
    updateIndependentRecord(records, "mostWordsCompleted", {
      ...base,
      wordsCompleted: finiteNonNegative(result.modeData?.wordsCompleted),
    }, "wordsCompleted");
    updateIndependentRecord(records, "highestCombo", {
      ...base,
      value: finiteNonNegative(result.modeData?.maximumCombo),
    }, "value");
    updateIndependentRecord(records, "highestPerfectStreak", {
      ...base,
      value: finiteNonNegative(result.modeData?.maximumPerfectStreak),
    }, "value");
    updateIndependentRecord(records, "bestAccuracy", {
      ...base,
      value: finiteNonNegative(result.accuracy),
    }, "value");
    updateIndependentRecord(records, "bestAverageWpm", {
      ...base,
      value: finiteNonNegative(result.modeData?.averageWpm),
    }, "value");
    mode.highestStage = better(mode.highestStage, stage);
  }
  if (result.modeId === "daily") {
    mode.records = updateDailyRecords(mode.records, result);
  }

  const summary = sanitizeRecentSummary(result);
  data.recentSessions = [
    summary,
    ...data.recentSessions.filter(({ sessionId }) => sessionId !== result.sessionId),
  ].slice(0, MAX_RECENT_SESSIONS);
  data.recordedSessionIds = [
    result.sessionId,
    ...data.recordedSessionIds.filter((id) => id !== result.sessionId),
  ].slice(0, MAX_RECORDED_SESSION_IDS);
  return saveModeData(data);
}

export function getModeSummary(modeId) {
  if (!getModeDefinition(modeId)) return null;
  return { ...loadModeData().modes[modeId] };
}

export function ensureStoredPlayerProfile(options = {}) {
  const data = loadModeData();
  if (data.profile) return { ...data.profile };
  data.profile = createDefaultPlayerProfile(options);
  saveModeData(data);
  return { ...data.profile };
}

export function updateStoredDisplayName(displayName, now = Date.now()) {
  const data = loadModeData();
  const profile = data.profile || createDefaultPlayerProfile({ now });
  if (!validateDisplayName(displayName).valid) return { ...profile };
  const updated = updateDisplayName(profile, displayName, now);
  if (!updated) return { ...profile };
  data.profile = updated;
  saveModeData(data);
  return { ...updated };
}

export function getPublicPlayerProfile() {
  return selectPublicPlayerProfile(ensureStoredPlayerProfile());
}

export function getDailyRecord(dateKey) {
  if (!isValidDailyDateKey(dateKey)) return null;
  const records = loadModeData().modes.daily.records;
  const day = records.days[dateKey];
  return day ? {
    ...day,
    best: day.best ? { ...day.best } : null,
    currentStreak: records.currentStreak,
    bestStreak: records.bestStreak,
    lastSuccessfulDateKey: records.lastSuccessfulDateKey,
  } : {
    attempts: 0,
    best: null,
    firstCompletedAt: null,
    lastAttemptAt: null,
    currentStreak: records.currentStreak,
    bestStreak: records.bestStreak,
    lastSuccessfulDateKey: records.lastSuccessfulDateKey,
  };
}

export function getRecentSessions() {
  return loadModeData().recentSessions.map((summary) => ({
    ...summary,
    modeData: { ...summary.modeData },
  }));
}

export function resetModeData() {
  const defaults = createDefaultModeData();
  saveModeData(defaults);
  return defaults;
}

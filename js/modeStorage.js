import { getAllModes, getModeDefinition } from "./modes.js";

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

function createModeSummary() {
  return {
    completedSessions: 0,
    failedSessions: 0,
    activePlaytimeMs: 0,
    bestWpm: null,
    bestAccuracy: null,
    highestScore: null,
  };
}

export function createDefaultModeData() {
  return {
    schemaVersion: MODE_DATA_SCHEMA_VERSION,
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
      getAllModes().map((mode) => [mode.id, createModeSummary()]),
    ),
    recentSessions: [],
    recordedSessionIds: [],
  };
}

function sanitizeModeSummary(value) {
  const defaults = createModeSummary();
  return {
    ...defaults,
    completedSessions: finiteNonNegative(value?.completedSessions),
    failedSessions: finiteNonNegative(value?.failedSessions),
    activePlaytimeMs: finiteNonNegative(value?.activePlaytimeMs),
    bestWpm: nullableFinite(value?.bestWpm),
    bestAccuracy: nullableFinite(value?.bestAccuracy),
    highestScore: nullableFinite(value?.highestScore),
  };
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
    score: finiteNonNegative(value.score),
    grade: typeof value.grade === "string" ? value.grade : null,
    accuracy: Math.max(0, Math.min(100, finiteNonNegative(value.accuracy))),
    wpm: finiteNonNegative(value.wpm),
    activeDurationMs: finiteNonNegative(value.activeDurationMs),
    modeData: {
      level: Number.isInteger(Number(value.modeData?.level))
        ? Number(value.modeData.level)
        : null,
      modifierId: typeof value.modeData?.modifierId === "string"
        ? value.modeData.modifierId
        : null,
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
  return {
    schemaVersion: MODE_DATA_SCHEMA_VERSION,
    totals: {
      completedSessions: finiteNonNegative(value.totals?.completedSessions),
      failedSessions: finiteNonNegative(value.totals?.failedSessions),
      activePlaytimeMs: finiteNonNegative(value.totals?.activePlaytimeMs),
      charactersTyped: finiteNonNegative(value.totals?.charactersTyped),
      correctCharacters: finiteNonNegative(value.totals?.correctCharacters),
      incorrectCharacters: finiteNonNegative(value.totals?.incorrectCharacters),
      missedCharacters: finiteNonNegative(value.totals?.missedCharacters),
      wordsCompleted: finiteNonNegative(value.totals?.wordsCompleted),
    },
    modes: Object.fromEntries(getAllModes().map((mode) => [
      mode.id,
      sanitizeModeSummary(value.modes?.[mode.id]),
    ])),
    recentSessions: recentSessions.slice(0, MAX_RECENT_SESSIONS),
    recordedSessionIds: [...new Set(recordedIds)].slice(0, MAX_RECORDED_SESSION_IDS),
  };
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

export function recordCompletedSession(result) {
  if (
    !result ||
    result.schemaVersion !== 1 ||
    result.developerMode === true ||
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

export const CURRENT_GAME_VERSION = "1.0.0";
export const DAILY_BOARD_KEY = "daily-strike-v1";
export const ENDLESS_BOARD_KEY = "endless-v1";
export const SUPPORTED_BOARD_KEYS = Object.freeze([DAILY_BOARD_KEY, ENDLESS_BOARD_KEY]);
export const SUBMISSION_RATE_LIMIT_PER_HOUR = 30;

const ROOT_FIELDS = new Set(["boardKey", "sessionId", "clientVersion", "result"]);
const NORMAL_SOURCES = Object.freeze({
  [DAILY_BOARD_KEY]: new Set(["daily-ready", "retry"]),
  [ENDLESS_BOARD_KEY]: new Set(["mode-select", "retry", "restart"]),
});
const DAILY_FIELDS = new Set([
  "score", "accuracy", "durationMs", "wordsCompleted", "completed", "failureReason",
  "integrityRemaining", "challengeDate", "challengeVersion", "wordsResolved",
  "wordsSpawned", "totalWords", "dateOverride", "recordEligible", "developerMode",
  "sessionSource", "wordPoints", "completionBonus", "integrityBonus", "accuracyBonus",
  "timeBonus", "coreHits", "coreBreaches", "finalWave",
]);
const ENDLESS_FIELDS = new Set([
  "score", "stage", "accuracy", "durationMs", "wordsCompleted", "completed",
  "failureReason", "recordEligible", "developerMode", "sessionSource", "metricVersion",
  "finalStage", "stageProgress", "completedStages", "survivalPoints", "wordPoints",
  "stageBonusPoints", "coreHits", "coreBreaches", "startStage",
]);

const failure = (code) => Object.freeze({ valid: false, code });
const success = (value) => Object.freeze({ valid: true, value: Object.freeze(value) });
const ownKeysOnly = (value, allowed) => (
  value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).every((key) => allowed.has(key))
);
const integer = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => (
  Number.isSafeInteger(value) && value >= minimum && value <= maximum
);
const finite = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => (
  Number.isFinite(value) && value >= minimum && value <= maximum
);
const canonicalDate = (now = new Date()) => new Date(now).toISOString().slice(0, 10);

export function isValidSubmissionSessionId(value) {
  return typeof value === "string" && value.length <= 128 && (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ||
    /^session-[a-z0-9-]{8,120}$/i.test(value)
  );
}

export function getEndlessWordsPerStageForSubmission(stage) {
  if (stage <= 5) return 10;
  if (stage <= 10) return 15;
  return 20;
}

export function getEndlessWordsBeforeStage(stage) {
  let total = 0;
  for (let current = 1; current < stage; current += 1) {
    total += getEndlessWordsPerStageForSubmission(current);
  }
  return total;
}

function validateCommon(body) {
  if (!ownKeysOnly(body, ROOT_FIELDS) || Object.keys(body).length !== ROOT_FIELDS.size) {
    return failure("INVALID_REQUEST");
  }
  if (!SUPPORTED_BOARD_KEYS.includes(body.boardKey)) return failure("INVALID_BOARD");
  if (!isValidSubmissionSessionId(body.sessionId)) return failure("INVALID_SESSION_ID");
  if (body.clientVersion !== CURRENT_GAME_VERSION) return failure("UNSUPPORTED_CLIENT_VERSION");
  return null;
}

function validateEligibility(result, boardKey) {
  if (
    result.developerMode !== false || result.recordEligible !== true ||
    !NORMAL_SOURCES[boardKey].has(result.sessionSource)
  ) return failure("INELIGIBLE_RESULT");
  return null;
}

function validateDaily(body, now) {
  const result = body.result;
  if (!ownKeysOnly(result, DAILY_FIELDS) || Object.keys(result).length !== DAILY_FIELDS.size) {
    return failure("INVALID_RESULT");
  }
  const ineligible = validateEligibility(result, body.boardKey);
  if (ineligible) return ineligible;
  if (result.challengeDate !== canonicalDate(now) || result.challengeVersion !== 1) {
    return failure("CHALLENGE_MISMATCH");
  }
  if (
    result.totalWords !== 60 || result.dateOverride !== false ||
    !integer(result.score) || !finite(result.accuracy, 0, 100) ||
    !integer(result.durationMs, 1, 21600000) ||
    !integer(result.wordsCompleted, 0, 60) || !integer(result.wordsResolved, 0, 60) ||
    !integer(result.wordsSpawned, 0, 60) || result.wordsCompleted > result.wordsResolved ||
    result.wordsResolved > result.wordsSpawned ||
    !integer(result.integrityRemaining, 0, 3) ||
    !integer(result.wordPoints) || !integer(result.completionBonus) ||
    !integer(result.integrityBonus) || !integer(result.accuracyBonus) ||
    !integer(result.timeBonus) || !integer(result.coreHits, 0, 3) ||
    !integer(result.coreBreaches, result.coreHits, 60) || !integer(result.finalWave, 1, 3) ||
    result.coreHits !== 3 - result.integrityRemaining ||
    typeof result.completed !== "boolean" ||
    (result.completed && (result.failureReason !== null || result.wordsResolved !== 60 || result.integrityRemaining < 1)) ||
    (!result.completed && result.failureReason !== "core-destroyed")
  ) return failure("INVALID_RESULT");

  const completionBonus = result.completed ? 10000 : 0;
  const integrityBonus = result.completed ? result.integrityRemaining * 2000 : 0;
  const accuracyBonus = result.completed ? Math.round(2000 * result.accuracy / 100) : 0;
  const timeBonus = result.completed
    ? Math.round(Math.max(0, Math.min(1, (180000 - result.durationMs) / 180000)) * 5000)
    : 0;
  const computedScore = result.wordPoints + completionBonus + integrityBonus + accuracyBonus + timeBonus;
  if (
    result.completionBonus !== completionBonus || result.integrityBonus !== integrityBonus ||
    result.accuracyBonus !== accuracyBonus || result.timeBonus !== timeBonus ||
    result.score !== computedScore
  ) return failure("SCORE_MISMATCH");

  return success({
    boardKey: body.boardKey,
    sessionId: body.sessionId,
    clientVersion: body.clientVersion,
    score: result.score,
    stage: null,
    accuracy: result.accuracy,
    durationMs: result.durationMs,
    completed: result.completed,
    wordsCompleted: result.wordsCompleted,
    integrityRemaining: result.integrityRemaining,
    challengeDate: result.challengeDate,
    challengeVersion: result.challengeVersion,
    metrics: Object.freeze({
      wordsResolved: result.wordsResolved,
      wordsSpawned: result.wordsSpawned,
      wordPoints: result.wordPoints,
      completionBonus,
      integrityBonus,
      accuracyBonus,
      timeBonus,
      coreHits: result.coreHits,
      coreBreaches: result.coreBreaches,
      finalWave: result.finalWave,
    }),
  });
}

function validateEndless(body) {
  const result = body.result;
  if (!ownKeysOnly(result, ENDLESS_FIELDS) || Object.keys(result).length !== ENDLESS_FIELDS.size) {
    return failure("INVALID_RESULT");
  }
  const ineligible = validateEligibility(result, body.boardKey);
  if (ineligible) return ineligible;
  if (
    result.metricVersion !== 1 || result.startStage !== 1 || result.completed !== false ||
    result.failureReason !== "core-destroyed" ||
    !integer(result.score) || !integer(result.stage, 1, 10000) || result.finalStage !== result.stage ||
    !finite(result.accuracy, 0, 100) || !integer(result.durationMs, 1, 86400000) ||
    !integer(result.wordsCompleted, 0, 200000) ||
    !integer(result.stageProgress, 0, getEndlessWordsPerStageForSubmission(result.stage) - 1) ||
    result.completedStages !== result.stage - 1 ||
    result.wordsCompleted !== getEndlessWordsBeforeStage(result.stage) + result.stageProgress ||
    !integer(result.survivalPoints) || !integer(result.wordPoints) ||
    !integer(result.stageBonusPoints) || !integer(result.coreHits, 3, 3) ||
    !integer(result.coreBreaches, result.coreHits, 200000)
  ) return failure("INVALID_RESULT");

  const survivalPoints = Math.floor((result.durationMs / 1000) * 100);
  const stageBonusPoints = 250 * (result.stage - 1) * result.stage / 2;
  const computedScore = survivalPoints + result.wordPoints + stageBonusPoints;
  if (
    result.survivalPoints !== survivalPoints || result.stageBonusPoints !== stageBonusPoints ||
    result.score !== computedScore
  ) return failure("SCORE_MISMATCH");

  return success({
    boardKey: body.boardKey,
    sessionId: body.sessionId,
    clientVersion: body.clientVersion,
    score: result.score,
    stage: result.stage,
    accuracy: result.accuracy,
    durationMs: result.durationMs,
    completed: false,
    wordsCompleted: result.wordsCompleted,
    integrityRemaining: null,
    challengeDate: null,
    challengeVersion: null,
    metrics: Object.freeze({
      stageProgress: result.stageProgress,
      completedStages: result.completedStages,
      survivalPoints,
      wordPoints: result.wordPoints,
      stageBonusPoints,
      coreHits: result.coreHits,
      coreBreaches: result.coreBreaches,
    }),
  });
}

export function validateScoreSubmission(body, { now = new Date() } = {}) {
  const commonFailure = validateCommon(body);
  if (commonFailure) return commonFailure;
  return body.boardKey === DAILY_BOARD_KEY
    ? validateDaily(body, now)
    : validateEndless(body);
}

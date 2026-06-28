export const CURRENT_GAME_VERSION = "1.0.0";
export const DAILY_BOARD_KEY = "daily-strike-v1";
export const ENDLESS_BOARD_KEY = "endless-v1";
export const CAMPAIGN_BOARD_KEY = "campaign-highest-level-v1";
export const TYPING_60_BOARD_KEY = "typing-60s-english200-v1";
export const TYPING_15_BOARD_KEY = "typing-15s-english200-v1";
export const SUPPORTED_BOARD_KEYS = Object.freeze([
  CAMPAIGN_BOARD_KEY, TYPING_60_BOARD_KEY, TYPING_15_BOARD_KEY,
  ENDLESS_BOARD_KEY, DAILY_BOARD_KEY,
]);
export const SUBMISSION_RATE_LIMIT_PER_HOUR = 30;

const ROOT_FIELDS = new Set(["boardKey", "sessionId", "clientVersion", "result"]);
const NORMAL_SOURCES = Object.freeze({
  [DAILY_BOARD_KEY]: new Set(["daily-ready", "retry"]),
  [ENDLESS_BOARD_KEY]: new Set(["mode-select", "retry", "restart"]),
  [CAMPAIGN_BOARD_KEY]: new Set(["level-select", "retry", "next-level"]),
  [TYPING_60_BOARD_KEY]: new Set(["mode-select", "retry", "change-test"]),
  [TYPING_15_BOARD_KEY]: new Set(["mode-select", "retry", "change-test"]),
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
const CAMPAIGN_FIELDS = new Set([
  "level", "completed", "grade", "accuracy", "durationMs", "wordsCompleted",
  "wordsTotal", "variantId", "correctCharacters", "correctKeystrokes",
  "totalKeystrokes", "missedCharacters", "recordEligible", "developerMode",
  "sessionSource",
]);
const TYPING_FIELDS = new Set([
  "durationSeconds", "configId", "wordSetId", "wordSetVersion", "metricVersion",
  "wpm", "rawWpm", "accuracy", "durationMs", "correctTestCharacters",
  "rawTestCharacters", "correctKeystrokes", "incorrectKeystrokes",
  "missedCharacters", "wordsCompleted", "exactWords", "incorrectWords",
  "completed", "recordEligible", "developerMode", "sessionSource",
]);
const CAMPAIGN_GRADES = Object.freeze(["D", "C", "B", "A", "S"]);

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
    level: null,
    grade: null,
    wpm: null,
    rawWpm: null,
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
    level: null,
    grade: null,
    wpm: null,
    rawWpm: null,
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

function campaignGrade(accuracy) {
  if (accuracy >= 98) return "S";
  if (accuracy >= 95) return "A";
  if (accuracy >= 90) return "B";
  if (accuracy >= 80) return "C";
  return "D";
}

function closeEnough(actual, expected) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-9;
}

function validateCampaign(body) {
  const result = body.result;
  if (!ownKeysOnly(result, CAMPAIGN_FIELDS) || Object.keys(result).length !== CAMPAIGN_FIELDS.size) {
    return failure("INVALID_RESULT");
  }
  const ineligible = validateEligibility(result, body.boardKey);
  if (ineligible) return ineligible;
  const expectedVariant = result.level % 10 === 0 ? "boss" : "normal";
  if (
    result.completed !== true || !integer(result.level, 1, 100) ||
    result.variantId !== expectedVariant || !CAMPAIGN_GRADES.includes(result.grade) ||
    !finite(result.accuracy, 0, 100) || campaignGrade(result.accuracy) !== result.grade ||
    !integer(result.durationMs, 1, 21600000) ||
    !integer(result.wordsCompleted, 1, 1000) || !integer(result.wordsTotal, 1, 1000) ||
    result.wordsCompleted !== result.wordsTotal ||
    !integer(result.correctCharacters, 0, 100000) ||
    !integer(result.correctKeystrokes, 0, 100000) ||
    !integer(result.totalKeystrokes, result.correctKeystrokes, 200000) ||
    !integer(result.missedCharacters, 0, 100000)
  ) return failure("INVALID_RESULT");
  const denominator = result.totalKeystrokes + result.missedCharacters;
  const expectedAccuracy = denominator === 0
    ? 100
    : Math.min(100, result.correctKeystrokes / denominator * 100);
  if (!closeEnough(result.accuracy, expectedAccuracy)) return failure("SCORE_MISMATCH");
  return success({
    boardKey: body.boardKey,
    sessionId: body.sessionId,
    clientVersion: body.clientVersion,
    score: null,
    stage: null,
    level: result.level,
    grade: result.grade,
    wpm: null,
    rawWpm: null,
    accuracy: result.accuracy,
    durationMs: result.durationMs,
    completed: true,
    wordsCompleted: result.wordsCompleted,
    integrityRemaining: null,
    challengeDate: null,
    challengeVersion: null,
    metrics: Object.freeze({
      variantId: result.variantId,
      wordsTotal: result.wordsTotal,
      correctCharacters: result.correctCharacters,
      correctKeystrokes: result.correctKeystrokes,
      totalKeystrokes: result.totalKeystrokes,
      missedCharacters: result.missedCharacters,
    }),
  });
}

function validateTyping(body) {
  const result = body.result;
  if (!ownKeysOnly(result, TYPING_FIELDS) || Object.keys(result).length !== TYPING_FIELDS.size) {
    return failure("INVALID_RESULT");
  }
  const ineligible = validateEligibility(result, body.boardKey);
  if (ineligible) return ineligible;
  const expectedDuration = body.boardKey === TYPING_60_BOARD_KEY ? 60 : 15;
  if (result.durationSeconds !== expectedDuration || result.configId !== `time-${expectedDuration}`) {
    return failure("UNSUPPORTED_TEST_DURATION");
  }
  if (result.wordSetId !== "english-200" || result.wordSetVersion !== 1) {
    return failure("UNSUPPORTED_WORD_SET");
  }
  if (
    result.metricVersion !== 2 || result.completed !== true ||
    result.durationMs !== expectedDuration * 1000 ||
    !finite(result.wpm, 0, 1000) || !finite(result.rawWpm, 0, 2000) ||
    !finite(result.accuracy, 0, 100) ||
    !integer(result.correctTestCharacters, 0, 100000) ||
    !integer(result.rawTestCharacters, 1, 200000) ||
    result.correctTestCharacters > result.rawTestCharacters ||
    !integer(result.correctKeystrokes, 0, 100000) ||
    !integer(result.incorrectKeystrokes, 0, 100000) ||
    !integer(result.missedCharacters, 0, 100000) ||
    result.correctKeystrokes + result.incorrectKeystrokes !== result.rawTestCharacters ||
    !integer(result.wordsCompleted, 0, 10000) || !integer(result.exactWords, 0, 10000) ||
    !integer(result.incorrectWords, 0, 10000) ||
    result.exactWords + result.incorrectWords !== result.wordsCompleted
  ) return failure("INVALID_RESULT");
  const expectedWpm = (result.correctTestCharacters / 5) / (expectedDuration / 60);
  const expectedRawWpm = (result.rawTestCharacters / 5) / (expectedDuration / 60);
  const accuracyDenominator = result.correctKeystrokes + result.incorrectKeystrokes + result.missedCharacters;
  const expectedAccuracy = accuracyDenominator <= 0
    ? 100
    : result.correctKeystrokes / accuracyDenominator * 100;
  if (
    !closeEnough(result.wpm, expectedWpm) || !closeEnough(result.rawWpm, expectedRawWpm) ||
    !closeEnough(result.accuracy, expectedAccuracy)
  ) return failure("SCORE_MISMATCH");
  return success({
    boardKey: body.boardKey,
    sessionId: body.sessionId,
    clientVersion: body.clientVersion,
    score: null,
    stage: null,
    level: null,
    grade: null,
    wpm: result.wpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    durationMs: result.durationMs,
    completed: true,
    wordsCompleted: result.wordsCompleted,
    integrityRemaining: null,
    challengeDate: null,
    challengeVersion: null,
    metrics: Object.freeze({
      durationSeconds: expectedDuration,
      wordSetId: result.wordSetId,
      wordSetVersion: result.wordSetVersion,
      correctTestCharacters: result.correctTestCharacters,
      rawTestCharacters: result.rawTestCharacters,
      correctKeystrokes: result.correctKeystrokes,
      incorrectKeystrokes: result.incorrectKeystrokes,
      missedCharacters: result.missedCharacters,
      exactWords: result.exactWords,
      incorrectWords: result.incorrectWords,
    }),
  });
}

export function validateScoreSubmission(body, { now = new Date() } = {}) {
  const commonFailure = validateCommon(body);
  if (commonFailure) return commonFailure;
  if (body.boardKey === DAILY_BOARD_KEY) return validateDaily(body, now);
  if (body.boardKey === ENDLESS_BOARD_KEY) return validateEndless(body);
  if (body.boardKey === CAMPAIGN_BOARD_KEY) return validateCampaign(body);
  return validateTyping(body);
}

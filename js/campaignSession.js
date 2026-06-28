import { MODE_IDS } from "./modes.js";
import {
  beginSession,
  completeSession,
  getCurrentSession,
  getSessionTiming,
  markSessionResultPersisted,
  SESSION_STATES,
  setSessionState,
} from "./sessionManager.js";
import { buildSessionResult } from "./sessionResult.js";
import {
  getRecentSessions,
  MODE_DATA_SCHEMA_VERSION,
  recordCompletedSession,
} from "./modeStorage.js";

export const CAMPAIGN_VARIANTS = Object.freeze({
  NORMAL: "normal",
  BOSS: "boss",
});

export function beginCampaignSession({
  level,
  isBoss,
  seed,
  source,
  developerMode,
  difficultyData = {},
}) {
  return beginSession({
    modeId: MODE_IDS.CAMPAIGN,
    variantId: isBoss ? CAMPAIGN_VARIANTS.BOSS : CAMPAIGN_VARIANTS.NORMAL,
    source,
    developerMode,
    seed,
    config: {
      level,
      difficultyData,
    },
    runtimeData: { level },
  });
}

export function syncCampaignSession(game) {
  const session = getCurrentSession();
  if (!session || session.modeId !== MODE_IDS.CAMPAIGN || !game || game.ended) {
    return false;
  }
  const phaseState = game.mode === "boss"
    ? {
      INTRO: SESSION_STATES.BRIEFING,
      ACTIVE: SESSION_STATES.ACTIVE,
      TRANSITION: SESSION_STATES.TRANSITIONING,
    }[game.phase]
    : SESSION_STATES.ACTIVE;
  if (!phaseState || phaseState === session.state) return false;
  return setSessionState(phaseState);
}

export function buildCampaignResult(game, campaignResult, success) {
  const session = getCurrentSession();
  if (!session || session.modeId !== MODE_IDS.CAMPAIGN) return null;
  const isBoss = game.mode === "boss";
  const completedWords = Number.isFinite(game.completedWordCount)
    ? game.completedWordCount
    : success
      ? game.config.totalWordCount || game.config.wordCount || 0
      : 0;
  const missedWords = Number.isFinite(game.missedWordCount)
    ? game.missedWordCount
    : Math.max(0, (game.config.totalWordCount || game.config.wordCount || 0) - completedWords);
  const startedAt = session.startedAtEpochMs ?? session.createdAtEpochMs;
  const endedAt = Date.now();
  return buildSessionResult({
    sessionId: session.id,
    modeId: session.modeId,
    variantId: session.variantId,
    sessionSource: session.source,
    startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - session.createdAtEpochMs),
    activeDurationMs: game.elapsedMs,
    seed: session.seed,
    developerMode: session.developerMode,
    success,
    failureReason: success
      ? null
      : game.failureReason || (isBoss ? "timeout" : "core-breached"),
    score: campaignResult.score,
    grade: campaignResult.grade,
    accuracy: campaignResult.accuracy,
    wpm: campaignResult.wpm,
    characters: {
      correct: game.correctCharacters,
      incorrect: Math.max(0, game.totalKeystrokes - game.correctKeystrokes),
      missed: game.missedCharacters,
      totalKeystrokes: game.totalKeystrokes,
    },
    words: {
      completed: completedWords,
      missed: missedWords,
      total: game.config.totalWordCount || game.config.wordCount || completedWords + missedWords,
    },
    combo: {
      maximum: game.maxCombo,
      final: game.combo,
    },
    modeData: {
      level: game.levelNumber,
      recordEligible: game.persistResult === true,
      correctKeystrokes: game.correctKeystrokes,
      totalKeystrokes: game.totalKeystrokes,
      missedCharacters: game.missedCharacters,
      wordsTotal: game.config.totalWordCount || game.config.wordCount || completedWords + missedWords,
      bossLevel: isBoss ? game.levelNumber : null,
      bossSequencesCompleted: isBoss ? game.phrasesCompleted : null,
      bossSequenceCount: isBoss ? game.phrases?.length ?? game.config.segmentCount ?? 0 : null,
      livesRemaining: isBoss ? null : game.lives,
      attemptSeed: game.attemptSeed ?? session.seed,
    },
  });
}

export function finalizeCampaignSession(game, campaignResult, success) {
  const normalizedResult = buildCampaignResult(game, campaignResult, success);
  if (!normalizedResult) return null;
  const completed = completeSession(normalizedResult);
  if (!completed) return null;
  if (recordCompletedSession(normalizedResult)) {
    markSessionResultPersisted(normalizedResult.sessionId);
  }
  return normalizedResult;
}

export function getSessionDiagnosticText() {
  const session = getCurrentSession();
  const timing = getSessionTiming();
  return [
    `CURRENT MODE=${session?.modeId ?? "none"}`,
    `CURRENT VARIANT=${session?.variantId ?? "none"}`,
    `SESSION ID=${session?.id ?? "none"}`,
    `SESSION STATE=${session?.state ?? SESSION_STATES.IDLE}`,
    `SESSION SOURCE=${session?.source ?? "none"}`,
    `SESSION SEED=${session?.seed ?? "none"}`,
    `DEVELOPER SESSION=${session?.developerMode === true}`,
    `ACTIVE DURATION=${Math.round(timing.activeDurationMs)}ms`,
    `PAUSED DURATION=${Math.round(timing.pausedDurationMs)}ms`,
    `RESULT FINALIZED=${session?.resultFinalized === true}`,
    `RESULT PERSISTED=${session?.resultPersisted === true}`,
    `MODE STORAGE VERSION=${MODE_DATA_SCHEMA_VERSION}`,
    `RECENT SESSION COUNT=${getRecentSessions().length}`,
  ].join(" // ");
}

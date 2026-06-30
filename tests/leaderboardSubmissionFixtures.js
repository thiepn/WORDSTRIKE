export const SESSION_ID = "123e4567-e89b-42d3-a456-426614174000";

export function dailySubmission(overrides = {}) {
  return {
    boardKey: "daily-strike-v1",
    sessionId: SESSION_ID,
    clientVersion: "1.0.0",
    result: {
      score: 25000,
      accuracy: 95,
      durationMs: 90000,
      wordsCompleted: 59,
      completed: true,
      failureReason: null,
      integrityRemaining: 2,
      challengeDate: "2026-06-28",
      challengeVersion: 2,
      wordsResolved: 60,
      wordsSpawned: 60,
      totalWords: 60,
      dateOverride: false,
      recordEligible: true,
      developerMode: false,
      sessionSource: "daily-ready",
      wordPoints: 6600,
      completionBonus: 10000,
      integrityBonus: 4000,
      accuracyBonus: 1900,
      timeBonus: 2500,
      coreHits: 1,
      coreBreaches: 1,
      finalWave: 3,
      ...overrides,
    },
  };
}

export function endlessSubmission(overrides = {}) {
  return {
    boardKey: "endless-v1",
    sessionId: SESSION_ID,
    clientVersion: "1.0.0",
    result: {
      score: 49000,
      stage: 8,
      accuracy: 94.5,
      durationMs: 300000,
      wordsCompleted: 84,
      completed: false,
      failureReason: "core-destroyed",
      recordEligible: true,
      developerMode: false,
      sessionSource: "mode-select",
      metricVersion: 1,
      finalStage: 8,
      stageProgress: 4,
      completedStages: 7,
      survivalPoints: 30000,
      wordPoints: 12000,
      stageBonusPoints: 7000,
      coreHits: 3,
      coreBreaches: 4,
      startStage: 1,
      ...overrides,
    },
  };
}

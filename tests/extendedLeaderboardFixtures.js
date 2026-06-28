export const EXTENDED_SESSION_ID = "123e4567-e89b-42d3-a456-426614174100";

export function campaignSubmission(overrides = {}) {
  return {
    boardKey: "campaign-highest-level-v1",
    sessionId: EXTENDED_SESSION_ID,
    clientVersion: "1.0.0",
    result: {
      level: 12, completed: true, grade: "A", accuracy: 96,
      durationMs: 83000, wordsCompleted: 20, wordsTotal: 20,
      variantId: "normal", correctCharacters: 100,
      correctKeystrokes: 96, totalKeystrokes: 100, missedCharacters: 0,
      recordEligible: true, developerMode: false, sessionSource: "level-select",
      ...overrides,
    },
  };
}

export function typingSubmission(duration = 60, overrides = {}) {
  const sixty = duration === 60;
  const correctTestCharacters = sixty ? 400 : 100;
  const rawTestCharacters = sixty ? 450 : 110;
  const correctKeystrokes = sixty ? 420 : 105;
  const incorrectKeystrokes = rawTestCharacters - correctKeystrokes;
  return {
    boardKey: sixty ? "typing-60s-english200-v1" : "typing-15s-english200-v1",
    sessionId: EXTENDED_SESSION_ID,
    clientVersion: "1.0.0",
    result: {
      durationSeconds: duration,
      configId: `time-${duration}`,
      wordSetId: "english-200",
      wordSetVersion: 1,
      metricVersion: 2,
      wpm: (correctTestCharacters / 5) / (duration / 60),
      rawWpm: (rawTestCharacters / 5) / (duration / 60),
      accuracy: correctKeystrokes / rawTestCharacters * 100,
      durationMs: duration * 1000,
      correctTestCharacters,
      rawTestCharacters,
      correctKeystrokes,
      incorrectKeystrokes,
      missedCharacters: 0,
      wordsCompleted: sixty ? 85 : 22,
      exactWords: sixty ? 80 : 20,
      incorrectWords: sixty ? 5 : 2,
      completed: true,
      recordEligible: true,
      developerMode: false,
      sessionSource: "mode-select",
      ...overrides,
    },
  };
}

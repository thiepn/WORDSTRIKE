export const SESSION_RESULT_SCHEMA_VERSION = 1;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finite(value, fallback));
}

function nullableFinite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableString(value) {
  return typeof value === "string" && value.length ? value : null;
}

function serializableObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function buildSessionResult(input = {}) {
  if (
    typeof input.sessionId !== "string" ||
    !input.sessionId ||
    typeof input.modeId !== "string" ||
    !input.modeId
  ) {
    return null;
  }
  const correct = nonNegative(input.characters?.correct);
  const totalKeystrokes = nonNegative(input.characters?.totalKeystrokes);
  const incorrect = input.characters?.incorrect == null
    ? Math.max(0, totalKeystrokes - correct)
    : nonNegative(input.characters.incorrect);
  const startedAt = nonNegative(input.startedAt);
  const endedAt = Math.max(startedAt, nonNegative(input.endedAt, startedAt));
  const result = {
    schemaVersion: SESSION_RESULT_SCHEMA_VERSION,
    sessionId: input.sessionId,
    modeId: input.modeId,
    variantId: nullableString(input.variantId),
    startedAt,
    endedAt,
    durationMs: nonNegative(input.durationMs, endedAt - startedAt),
    activeDurationMs: nonNegative(input.activeDurationMs),
    seed: nullableFinite(input.seed),
    developerMode: input.developerMode === true,
    success: input.success === true,
    failureReason: nullableString(input.failureReason),
    score: input.score == null ? null : nonNegative(input.score),
    grade: nullableString(input.grade),
    accuracy: Math.max(0, Math.min(100, finite(input.accuracy))),
    wpm: nonNegative(input.wpm),
    characters: {
      correct,
      incorrect,
      missed: nonNegative(input.characters?.missed),
      totalKeystrokes,
    },
    words: {
      completed: nonNegative(input.words?.completed),
      missed: nonNegative(input.words?.missed),
      total: nonNegative(input.words?.total),
    },
    combo: {
      maximum: nonNegative(input.combo?.maximum),
      final: nonNegative(input.combo?.final),
    },
    modeData: serializableObject(input.modeData),
  };
  return deepFreeze(result);
}

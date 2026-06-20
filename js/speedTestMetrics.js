export function createSpeedTestMetrics() {
  return {
    printableKeystrokes: 0,
    correctKeystrokes: 0,
    incorrectKeystrokes: 0,
    backspaces: 0,
    rawTypedCharacters: 0,
    committedCorrectCharacters: 0,
    missedCharacters: 0,
    extraCharacters: 0,
    wordsCompleted: 0,
    exactWords: 0,
    incorrectWords: 0,
  };
}

export function countCorrectPositions(expected = "", typed = "") {
  let correct = 0;
  const limit = Math.min(expected.length, typed.length);
  for (let index = 0; index < limit; index += 1) {
    if (expected[index] === typed[index]) correct += 1;
  }
  return correct;
}

export function classifySpeedTestCharacter(expectedWord, typedIndex, character) {
  if (typedIndex >= expectedWord.length) return "extra";
  return expectedWord[typedIndex] === character ? "correct" : "incorrect";
}

export function calculateSpeedTestAccuracy(metrics, { display = false } = {}) {
  const denominator = (
    metrics.correctKeystrokes +
    metrics.incorrectKeystrokes +
    metrics.missedCharacters
  );
  if (denominator <= 0) return display ? 100 : 0;
  return Math.max(0, Math.min(
    100,
    (metrics.correctKeystrokes / denominator) * 100,
  ));
}

function calculateWpm(characterCount, activeDurationMs) {
  const characters = Number.isFinite(characterCount) ? Math.max(0, characterCount) : 0;
  const duration = Number.isFinite(activeDurationMs) ? Math.max(0, activeDurationMs) : 0;
  if (duration <= 0) return 0;
  return (characters / 5) / (duration / 60000);
}

export function calculateSpeedTestSnapshot(
  metrics,
  activeDurationMs,
  { currentWord = "", typedBuffer = "", includePartial = false } = {},
) {
  const partialCorrect = includePartial
    ? countCorrectPositions(currentWord, typedBuffer)
    : 0;
  return {
    accuracy: calculateSpeedTestAccuracy(metrics, { display: true }),
    rawWpm: calculateWpm(metrics.rawTypedCharacters, activeDurationMs),
    wpm: calculateWpm(
      metrics.committedCorrectCharacters + partialCorrect,
      activeDurationMs,
    ),
    partialCorrectCharacters: partialCorrect,
  };
}

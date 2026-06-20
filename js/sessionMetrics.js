import { calculateAccuracy, calculateWPM } from "./scoring.js";

export function calculateSessionAccuracy({
  correctKeystrokes,
  correctCharacters,
  totalKeystrokes,
  missedCharacters,
} = {}) {
  return calculateAccuracy(
    Number.isFinite(correctKeystrokes) ? correctKeystrokes : correctCharacters,
    totalKeystrokes,
    missedCharacters,
  );
}

export function calculateSessionWpm({
  characterCount,
  activeDurationMs,
} = {}) {
  return calculateWPM(characterCount, activeDurationMs);
}

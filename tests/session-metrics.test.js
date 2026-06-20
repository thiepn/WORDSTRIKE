import assert from "node:assert/strict";
import {
  calculateSessionAccuracy,
  calculateSessionWpm,
} from "../js/sessionMetrics.js";
import { calculateAccuracy, calculateWPM } from "../js/scoring.js";

const cases = [
  { correctKeystrokes: 10, totalKeystrokes: 10, missedCharacters: 0 },
  { correctKeystrokes: 2, totalKeystrokes: 2, missedCharacters: 3 },
  { correctKeystrokes: 0, totalKeystrokes: 0, missedCharacters: 0 },
];
for (const input of cases) {
  assert.equal(
    calculateSessionAccuracy(input),
    calculateAccuracy(
      input.correctKeystrokes,
      input.totalKeystrokes,
      input.missedCharacters,
    ),
  );
}
assert.equal(
  calculateSessionWpm({ characterCount: 25, activeDurationMs: 60000 }),
  calculateWPM(25, 60000),
);
assert.equal(calculateSessionWpm({ characterCount: 25, activeDurationMs: 0 }), 0);

console.log("Shared metric adapters preserve authoritative campaign accuracy and WPM behavior.");

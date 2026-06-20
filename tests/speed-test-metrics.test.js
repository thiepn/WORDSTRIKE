import assert from "node:assert/strict";
import {
  calculateSpeedTestAccuracy,
  calculateSpeedTestSnapshot,
  classifySpeedTestCharacter,
  countCorrectPositions,
  createSpeedTestMetrics,
} from "../js/speedTestMetrics.js";

assert.equal(classifySpeedTestCharacter("word", 0, "w"), "correct");
assert.equal(classifySpeedTestCharacter("word", 1, "x"), "incorrect");
assert.equal(classifySpeedTestCharacter("word", 4, "x"), "extra");
assert.equal(countCorrectPositions("word", "wprd"), 3);

const metrics = createSpeedTestMetrics();
Object.assign(metrics, {
  correctKeystrokes: 6,
  incorrectKeystrokes: 1,
  missedCharacters: 2,
  rawTypedCharacters: 12,
  committedCorrectCharacters: 5,
});
assert.equal(calculateSpeedTestAccuracy(metrics), 6 / 9 * 100);
assert.equal(calculateSpeedTestAccuracy(createSpeedTestMetrics(), { display: true }), 100);
assert.equal(calculateSpeedTestAccuracy(createSpeedTestMetrics()), 0);

const snapshot = calculateSpeedTestSnapshot(metrics, 60000, {
  currentWord: "word",
  typedBuffer: "woxx",
  includePartial: true,
});
assert.equal(snapshot.rawWpm, (12 / 5));
assert.equal(snapshot.partialCorrectCharacters, 2);
assert.equal(snapshot.wpm, (7 / 5));
assert.ok(Number.isFinite(snapshot.accuracy));
assert.deepEqual(
  calculateSpeedTestSnapshot(metrics, 0),
  {
    accuracy: 6 / 9 * 100,
    rawWpm: 0,
    wpm: 0,
    partialCorrectCharacters: 0,
  },
);

console.log("Typing Test accuracy, raw WPM, net WPM, partial-word, and zero-duration tests passed.");

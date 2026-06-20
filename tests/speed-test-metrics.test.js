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
  printableKeystrokes: 11,
  validSpaces: 1,
  correctSpaces: 1,
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
assert.equal(snapshot.correctTestCharacters, 8);
assert.equal(snapshot.rawTestCharacters, 12);
assert.equal(snapshot.wpm, (8 / 5));
assert.equal(snapshot.cpm, 8);
assert.equal(snapshot.rawCpm, 12);
assert.ok(Number.isFinite(snapshot.accuracy));
assert.deepEqual(
  calculateSpeedTestSnapshot(metrics, 0),
  {
    accuracy: 6 / 9 * 100,
    rawWpm: 0,
    wpm: 0,
    rawCpm: 0,
    cpm: 0,
    rawTestCharacters: 12,
    correctTestCharacters: 6,
    partialCorrectCharacters: 0,
  },
);

for (const [correctTestCharacters, durationMs, expectedWpm] of [
  [30, 15000, 24],
  [150, 30000, 60],
  [300, 60000, 60],
  [600, 120000, 60],
]) {
  const example = createSpeedTestMetrics();
  example.committedCorrectCharacters = correctTestCharacters;
  example.printableKeystrokes = correctTestCharacters;
  const measured = calculateSpeedTestSnapshot(example, durationMs);
  assert.equal(measured.wpm, expectedWpm);
  assert.equal(measured.rawWpm, expectedWpm);
}

console.log("Typing Test accuracy, raw WPM, net WPM, partial-word, and zero-duration tests passed.");

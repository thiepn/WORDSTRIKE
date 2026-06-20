import assert from "node:assert/strict";
import { buildSessionResult } from "../js/sessionResult.js";

const result = buildSessionResult({
  sessionId: "session-1",
  modeId: "campaign",
  variantId: "normal",
  startedAt: 100,
  endedAt: 50,
  durationMs: -20,
  activeDurationMs: -10,
  seed: "bad",
  success: true,
  score: Infinity,
  grade: "A",
  accuracy: 180,
  wpm: NaN,
  characters: {
    correct: 8,
    totalKeystrokes: 10,
    missed: -2,
  },
  words: { completed: 2, missed: 1, total: 3 },
  combo: { maximum: 4, final: 2 },
  modeData: {
    level: 12,
    modifierId: "quick-fingers",
  },
});

assert.ok(result);
assert.equal(result.endedAt, 100);
assert.equal(result.durationMs, 0);
assert.equal(result.activeDurationMs, 0);
assert.equal(result.seed, null);
assert.equal(result.score, 0);
assert.equal(result.accuracy, 100);
assert.equal(result.wpm, 0);
assert.deepEqual(result.characters, {
  correct: 8,
  incorrect: 2,
  missed: 0,
  totalKeystrokes: 10,
});
assert.equal(result.level, undefined);
assert.equal(result.modeData.level, 12);
assert.equal(JSON.parse(JSON.stringify(result)).sessionId, "session-1");
assert.equal(Object.isFrozen(result), true);
assert.equal(Object.isFrozen(result.modeData), true);
assert.throws(() => { result.score = 99; }, TypeError);
assert.equal(buildSessionResult({ modeId: "campaign" }), null);

console.log("Normalized result sanitization, campaign mode data, serialization, and immutability tests passed.");

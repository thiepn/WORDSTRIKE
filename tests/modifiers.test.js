import assert from "node:assert/strict";
import {
  applyForcedModifier,
  BLACKOUT_FADE_MS,
  BLACKOUT_HIDDEN_AT_MS,
  BLACKOUT_ID,
  BLACKOUT_VISIBLE_MS,
  CHAIN_ID,
  getEffectiveSpawnInterval,
  getBlackoutVisibility,
  getModifiersForLevel,
  getQuickFingersPhase,
  isForcedModifierRequested,
  MODIFIERS,
  NO_BACKSPACE_ID,
  QUICK_FINGERS_ID,
} from "../js/modifiers.js";
import { generateBossLevel, generateLevel } from "../js/levelGenerator.js";
import { calculateGrade } from "../js/scoring.js";

assert.deepEqual(getModifiersForLevel(1), []);
assert.deepEqual(getModifiersForLevel(19), []);
assert.deepEqual(getModifiersForLevel(20), []);
assert.deepEqual(getModifiersForLevel(22), [QUICK_FINGERS_ID]);
assert.deepEqual(getModifiersForLevel(27), [QUICK_FINGERS_ID]);
assert.deepEqual(getModifiersForLevel(32), [QUICK_FINGERS_ID]);
assert.deepEqual(getModifiersForLevel(37), [QUICK_FINGERS_ID]);
assert.deepEqual(getModifiersForLevel(30), []);
assert.deepEqual(getModifiersForLevel(40), []);
assert.deepEqual(getModifiersForLevel(42), [NO_BACKSPACE_ID]);
assert.deepEqual(getModifiersForLevel(47), [QUICK_FINGERS_ID]);
assert.deepEqual(getModifiersForLevel(52), [NO_BACKSPACE_ID]);
assert.deepEqual(getModifiersForLevel(57), [QUICK_FINGERS_ID]);
assert.deepEqual(getModifiersForLevel(60), []);
assert.deepEqual(getModifiersForLevel(62), [BLACKOUT_ID]);
assert.deepEqual(getModifiersForLevel(67), [QUICK_FINGERS_ID]);
assert.deepEqual(getModifiersForLevel(72), [NO_BACKSPACE_ID]);
assert.deepEqual(getModifiersForLevel(77), [BLACKOUT_ID]);
assert.deepEqual(getModifiersForLevel(80), []);
assert.deepEqual(getModifiersForLevel(82), [CHAIN_ID]);
assert.deepEqual(getModifiersForLevel(87), [NO_BACKSPACE_ID]);
assert.deepEqual(getModifiersForLevel(92), [BLACKOUT_ID]);
assert.deepEqual(getModifiersForLevel(97), [QUICK_FINGERS_ID]);
assert.deepEqual(getModifiersForLevel(100), []);
assert.deepEqual(getModifiersForLevel(22), getModifiersForLevel(22));

const assigned = [];
for (let level = 20; level <= 100; level += 1) {
  if (level % 10 !== 0 && getModifiersForLevel(level).length) assigned.push(level);
}
assert.equal(assigned.length, 16);
assert.ok(assigned.every((level) => level % 5 === 2));
assert.ok(assigned.every((level) => getModifiersForLevel(level).length === 1));
assert.ok(
  assigned.every((level) => getModifiersForLevel(level).every(
    (id) => Object.values(MODIFIERS).some(
      (modifier) => modifier.id === id && modifier.implemented,
    ),
  )),
);
assert.ok(Object.values(MODIFIERS).every((modifier) => modifier.implemented));

const phases = [
  [0, "waiting", false, 6000, 0],
  [5999, "waiting", false, 1, 0],
  [6000, "burst", true, 4000, 1],
  [9999, "burst", true, 1, 1],
  [10000, "cooldown", false, 8000, 1],
  [17999, "cooldown", false, 1, 1],
  [18000, "burst", true, 4000, 2],
  [21999, "burst", true, 1, 2],
  [22000, "cooldown", false, 8000, 2],
];
for (const [elapsed, phase, active, remainingMs, burstCount] of phases) {
  assert.deepEqual(getQuickFingersPhase(elapsed), {
    phase,
    active,
    remainingMs,
    burstCount,
  });
}

assert.equal(getEffectiveSpawnInterval(1000, false), 1000);
assert.equal(getEffectiveSpawnInterval(1000, true), 500);
assert.equal(getEffectiveSpawnInterval(250, true), 150);
assert.equal(BLACKOUT_VISIBLE_MS, 1600);
assert.equal(BLACKOUT_FADE_MS, 400);
assert.equal(BLACKOUT_HIDDEN_AT_MS, 2000);
assert.deepEqual(getBlackoutVisibility(0), {
  phase: "visible", textOpacity: 1, hidden: false,
});
assert.deepEqual(getBlackoutVisibility(1599), {
  phase: "visible", textOpacity: 1, hidden: false,
});
assert.deepEqual(getBlackoutVisibility(1600), {
  phase: "fading", textOpacity: 1, hidden: false,
});
assert.deepEqual(getBlackoutVisibility(1800), {
  phase: "fading", textOpacity: 0.5, hidden: false,
});
assert.equal(getBlackoutVisibility(1999).phase, "fading");
assert.ok(getBlackoutVisibility(1999).textOpacity < 0.01);
assert.deepEqual(getBlackoutVisibility(2000), {
  phase: "hidden", textOpacity: 0, hidden: true,
});
assert.deepEqual(getBlackoutVisibility(5000), {
  phase: "hidden", textOpacity: 0, hidden: true,
});
assert.equal(getBlackoutVisibility(NaN).phase, "visible");
assert.equal(getBlackoutVisibility(-100).phase, "visible");

const base = generateLevel(22);
const originalInterval = base.spawnIntervalMs;
assert.deepEqual(base.modifiers, [QUICK_FINGERS_ID]);
assert.equal(getEffectiveSpawnInterval(base.spawnIntervalMs, true), base.spawnIntervalMs * 0.5);
assert.equal(base.spawnIntervalMs, originalInterval);
assert.deepEqual(generateLevel(20).modifiers, []);
assert.equal(generateBossLevel(20).modifiers, undefined);

assert.deepEqual(applyForcedModifier(21, [], QUICK_FINGERS_ID), [QUICK_FINGERS_ID]);
assert.deepEqual(applyForcedModifier(21, [], NO_BACKSPACE_ID), [NO_BACKSPACE_ID]);
assert.deepEqual(applyForcedModifier(21, [], BLACKOUT_ID), [BLACKOUT_ID]);
assert.deepEqual(applyForcedModifier(21, [], CHAIN_ID), [CHAIN_ID]);
assert.deepEqual(
  applyForcedModifier(47, [QUICK_FINGERS_ID], NO_BACKSPACE_ID),
  [NO_BACKSPACE_ID],
);
assert.deepEqual(applyForcedModifier(20, [], QUICK_FINGERS_ID), []);
assert.deepEqual(applyForcedModifier(20, [], NO_BACKSPACE_ID), []);
assert.deepEqual(getModifiersForLevel(21), []);
assert.equal(isForcedModifierRequested("?dev=1&modifier=no-backspace"), NO_BACKSPACE_ID);
assert.equal(isForcedModifierRequested("?dev=1&modifier=quick-fingers"), QUICK_FINGERS_ID);
assert.equal(isForcedModifierRequested("?dev=1&modifier=blackout"), BLACKOUT_ID);
assert.equal(isForcedModifierRequested("?dev=1&modifier=chain"), CHAIN_ID);

const gradeInputs = [
  { accuracy: 86.1 },
  { accuracy: 86.1, modifier: QUICK_FINGERS_ID, burstCount: 99, actualWPM: 200 },
  { accuracy: 86.1, modifier: BLACKOUT_ID, hiddenWordsCompleted: 99 },
  { accuracy: 86.1, modifier: CHAIN_ID, chainMaintained: true },
  { accuracy: 86.1, score: 999999, combo: 100, livesRemaining: 1 },
];
assert.ok(gradeInputs.every((input) => calculateGrade(input) === "C"));

console.log("Modifier assignment, timing, interval, force, isolation, and grade tests passed.");

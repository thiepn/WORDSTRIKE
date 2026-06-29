import assert from "node:assert/strict";
import { clearSession } from "../js/sessionManager.js";
import { getSpeedTestConfig } from "../js/speedTestConfig.js";
import { createSpeedTestRuntime, handleSpeedTestInput } from "../js/speedTest.js";

const originalPerformance = globalThis.performance;
Object.defineProperty(globalThis, "performance", {
  configurable: true,
  value: { now: () => 5000 },
});
const pool = ["apple", "river", "stone", "green", "house"];
const keyEvent = (key, timeStamp) => ({ key, timeStamp, preventDefault() {} });

for (const [duration, timestamp] of [[15, 0], [60, 9e15], [15, -100], [60, undefined]]) {
  clearSession();
  const state = createSpeedTestRuntime({
    config: getSpeedTestConfig(`time-${duration}`),
    wordPool: pool,
    attemptSeed: duration,
  });
  state.words[0] = "apple";
  assert.equal(handleSpeedTestInput(state, keyEvent("a", timestamp)), true);
  assert.equal(state.phase, "ACTIVE");
  assert.equal(state.ended, false);
  assert.equal(state.typedBuffer, "a");
  assert.equal(state.activeStartedAtMs, 5000);
  assert.equal(state.deadlineMs, 5000 + duration * 1000);
}

Object.defineProperty(globalThis, "performance", { configurable: true, value: originalPerformance });
console.log("Typing Test timing ignores incompatible keyboard-event timestamps and uses one monotonic clock.");

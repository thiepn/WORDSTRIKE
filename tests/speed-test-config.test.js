import assert from "node:assert/strict";
import {
  DEFAULT_SPEED_TEST_CONFIG_ID,
  getAllSpeedTestConfigs,
  getSpeedTestConfig,
  isValidSpeedTestConfigId,
  moveSpeedTestConfigSelection,
  normalizeSpeedTestConfigId,
  parseDeveloperSpeedTestConfig,
} from "../js/speedTestConfig.js";

assert.equal(DEFAULT_SPEED_TEST_CONFIG_ID, "time-60");
assert.deepEqual(
  getAllSpeedTestConfigs().map(({ configId }) => configId),
  [
    "time-15", "time-30", "time-60", "time-120",
    "words-25", "words-50", "words-100",
  ],
);
assert.equal(getSpeedTestConfig("time-60").durationSeconds, 60);
assert.equal(getSpeedTestConfig("words-50").wordCount, 50);
assert.equal(isValidSpeedTestConfigId("words-100"), true);
assert.equal(isValidSpeedTestConfigId("bad"), false);
assert.equal(getSpeedTestConfig("bad"), null);
assert.equal(normalizeSpeedTestConfigId("bad"), "time-60");
assert.equal(parseDeveloperSpeedTestConfig("?test=words-25"), "words-25");
assert.equal(parseDeveloperSpeedTestConfig("?test=bad"), "time-60");
assert.equal(moveSpeedTestConfigSelection("time-60", "ArrowUp"), "time-30");
assert.equal(moveSpeedTestConfigSelection("time-120", "ArrowDown"), "time-15");
assert.equal(moveSpeedTestConfigSelection("time-60", "ArrowRight"), "words-50");
assert.equal(moveSpeedTestConfigSelection("words-50", "Tab"), "time-60");

console.log("Typing Test configuration validation, defaults, query parsing, and inline navigation tests passed.");

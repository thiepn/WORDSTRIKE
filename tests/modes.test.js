import assert from "node:assert/strict";
import {
  getAllModes,
  getEnabledModes,
  getModeDefinition,
  isModeEnabled,
  isValidModeId,
  MODE_IDS,
} from "../js/modes.js";

assert.equal(getModeDefinition(MODE_IDS.CAMPAIGN).enabled, true);
assert.equal(getModeDefinition(MODE_IDS.SPEED_TEST).enabled, true);
assert.equal(getModeDefinition(MODE_IDS.SPEED_TEST).supportsPause, true);
assert.equal(getModeDefinition(MODE_IDS.ENDLESS).enabled, true);
assert.equal(getModeDefinition(MODE_IDS.DAILY).enabled, false);
assert.equal(getModeDefinition(MODE_IDS.PRACTICE).enabled, false);
assert.deepEqual(
  getEnabledModes().map(({ id }) => id),
  [MODE_IDS.CAMPAIGN, MODE_IDS.SPEED_TEST, MODE_IDS.ENDLESS],
);
assert.equal(isModeEnabled(MODE_IDS.CAMPAIGN), true);
assert.equal(isModeEnabled(MODE_IDS.ENDLESS), true);
assert.equal(isValidModeId("unknown"), false);
assert.equal(getModeDefinition("unknown"), null);

const modes = getAllModes();
assert.equal(modes.length, 5);
assert.equal(Object.isFrozen(modes[0]), true);
assert.throws(() => { modes[0].enabled = false; }, TypeError);
assert.equal(getModeDefinition(MODE_IDS.CAMPAIGN).enabled, true);

console.log("Mode registry availability, disabled entries, safe lookup, and immutability tests passed.");

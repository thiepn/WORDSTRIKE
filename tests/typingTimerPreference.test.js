import assert from "node:assert/strict";
import { createDefaultSave, loadSave, updateSpeedTestTimerPosition } from "../js/storage.js";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
const defaults = createDefaultSave();
assert.equal(defaults.settings.speedTestTimerPosition, "center");
assert.equal(updateSpeedTestTimerPosition(defaults, "top"), "top");
assert.equal(loadSave().settings.speedTestTimerPosition, "top");
assert.equal(updateSpeedTestTimerPosition(defaults, "invalid"), "center");
assert.equal(loadSave().settings.speedTestTimerPosition, "center");

console.log("Typing timer position defaults to Center, validates values, and persists locally.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getSpeedTestConfig } from "../js/speedTestConfig.js";
import { getSpeedTestWordBodyAnchor } from "../js/speedTestLayout.js";

const timerButtons = [];
const app = {
  html: "",
  set innerHTML(value) {
    this.html = value;
    timerButtons.length = 0;
    for (const match of value.matchAll(/data-speed-timer-position="([^"]+)"/g)) {
      timerButtons.push({ dataset: { speedTimerPosition: match[1] } });
    }
  },
  querySelector() { return null; },
  querySelectorAll(selector) { return selector === "[data-speed-timer-position]" ? timerButtons : []; },
};
globalThis.document = { querySelector: (selector) => selector === "#app" ? app : null };
const { renderSpeedTestRun } = await import("../js/ui.js");
const base = {
  config: getSpeedTestConfig("time-60"),
  phase: "PREPARING",
  words: ["word"],
  currentWordIndex: 0,
  typedBuffer: "",
};
const selected = [];
renderSpeedTestRun(base, false, { setTimerPosition: (value) => selected.push(value) });
assert.match(app.html, /speed-test-center-timer/);
assert.match(app.html, /data-speed-timer-position="center"[^>]*aria-pressed="true"/);
timerButtons.find((button) => button.dataset.speedTimerPosition === "top").onclick();
assert.equal(selected.at(-1), "top");
renderSpeedTestRun({ ...base, timerPosition: "top" }, false, {});
assert.doesNotMatch(app.html, /speed-test-center-timer/);
assert.match(app.html, /speed-test-hud[\s\S]*id="speed-test-primary"/);

const active = {
  ...base,
  phase: "ACTIVE",
  timerPosition: "center",
  currentWordIndex: 0,
  currentLineIndex: 0,
  verticalTranslation: 0,
  activeStartedAtMs: 1000,
  deadlineMs: 61000,
  typedBuffer: "wo",
};
renderSpeedTestRun(active, false, {});
active.timerPosition = "top";
renderSpeedTestRun(active, false, {});
assert.deepEqual({
  phase: active.phase,
  currentWordIndex: active.currentWordIndex,
  currentLineIndex: active.currentLineIndex,
  verticalTranslation: active.verticalTranslation,
  activeStartedAtMs: active.activeStartedAtMs,
  deadlineMs: active.deadlineMs,
  typedBuffer: active.typedBuffer,
}, {
  phase: "ACTIVE",
  currentWordIndex: 0,
  currentLineIndex: 0,
  verticalTranslation: 0,
  activeStartedAtMs: 1000,
  deadlineMs: 61000,
  typedBuffer: "wo",
});

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
assert.match(css, /\.speed-config-control\s*\{[^}]*font-size:\s*18px/s);
assert.match(css, /\.speed-test-center-timer strong\s*\{[^}]*font-size:\s*clamp\(42px/s);
assert.match(css, /font-variant-numeric:\s*tabular-nums/);
assert.match(css, /\.speed-test-word-region\s*\{[^}]*position:\s*absolute;[^}]*top:\s*50%;[^}]*transform:\s*translateY\(-50%\)/s);
assert.match(css, /\.speed-test-center-timer\s*\{[^}]*position:\s*absolute/s);

for (const stageHeight of [900, 620, 500, 260, 220]) {
  const centerAnchor = getSpeedTestWordBodyAnchor({ stageHeight, timerPosition: "center" });
  const topAnchor = getSpeedTestWordBodyAnchor({ stageHeight, timerPosition: "top" });
  assert.equal(centerAnchor, stageHeight / 2);
  assert.equal(topAnchor, centerAnchor);
}

console.log("Typing timer position changes preserve the fixed word-body anchor across desktop, phone, landscape, and constrained layouts.");

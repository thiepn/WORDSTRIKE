import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getSpeedTestConfig } from "../js/speedTestConfig.js";

class Button {
  constructor(action = null, config = null) {
    this.dataset = {};
    if (action) this.dataset.action = action;
    if (config) this.dataset.speedConfig = config;
  }
  focus() {}
}

const app = {
  html: "",
  buttons: [],
  set innerHTML(value) {
    this.html = value;
    this.buttons = [
      ...[...value.matchAll(/data-action="([^"]+)"/g)].map(
        (match) => new Button(match[1]),
      ),
      ...[...value.matchAll(/data-speed-config="([^"]+)"/g)].map(
        (match) => new Button(null, match[1]),
      ),
    ];
  },
  querySelector(selector) {
    const action = selector.match(/data-action="([^"]+)"/)?.[1];
    if (action) return this.buttons.find((button) => button.dataset.action === action) || null;
    const config = selector.match(/data-speed-config="([^"]+)"/)?.[1];
    if (config) return this.buttons.find((button) => button.dataset.speedConfig === config) || null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === "[data-speed-config]") {
      return this.buttons.filter((button) => button.dataset.speedConfig);
    }
    if (selector === ".speed-results-panel .arcade-button") {
      return this.buttons.filter((button) => button.dataset.action);
    }
    return [];
  },
};
globalThis.document = {
  querySelector(selector) {
    if (selector === "#app") return app;
    return null;
  },
};

const {
  renderSpeedTestResults,
  renderSpeedTestRun,
  renderSpeedTestSetup,
} = await import("../js/ui.js");

renderSpeedTestSetup(getSpeedTestConfig("time-60"), {
  select() {},
  start() {},
});
assert.match(app.html, /CHOOSE A TEST/);
assert.match(app.html, /15 SECONDS/);
assert.match(app.html, /120 SECONDS/);
assert.match(app.html, /25 WORDS/);
assert.match(app.html, /100 WORDS/);
assert.match(app.html, /START 60 SECONDS/);

renderSpeedTestRun({
  config: getSpeedTestConfig("time-15"),
  words: ["word", "apple"],
  currentWordIndex: 0,
  typedBuffer: "",
}, false);
assert.match(app.html, /speed-test-word-current/);
assert.match(app.html, /aria-current="true"/);
assert.match(app.html, /START TYPING/);
assert.doesNotMatch(app.html, /LIVES|COMBO|MODIFIER/);

const calls = [];
renderSpeedTestResults({
  variantId: "time",
  wpm: 60.5,
  accuracy: 95.2,
  activeDurationMs: 15000,
  score: null,
  grade: null,
  characters: { correct: 70, incorrect: 3, missed: 2 },
  words: { completed: 15 },
  modeData: {
    durationSeconds: 15,
    targetWordCount: null,
    rawWpm: 65.4,
    extraCharacters: 1,
    backspaces: 2,
    exactWords: 14,
    incorrectWords: 1,
  },
}, {
  newWpmRecord: true,
  newAccuracyRecord: true,
}, 0, {
  retry: () => calls.push("retry"),
  change: () => calls.push("change"),
  modes: () => calls.push("modes"),
  title: () => calls.push("title"),
  select() {},
});
assert.match(app.html, /TEST COMPLETE/);
assert.match(app.html, /60\.5/);
assert.match(app.html, /65\.4/);
assert.match(app.html, /NEW WPM RECORD/);
assert.match(app.html, /NEW ACCURACY RECORD/);
assert.match(app.html, /RETRY SAME TEST/);
assert.doesNotMatch(app.html, /GRADE|LIVES|BOSS|CAMPAIGN SCORE/);
app.querySelector('[data-action="retry"]').onclick();
assert.equal(calls.at(-1), "retry");

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
assert.match(css, /\.speed-test-word-current::before/);
assert.match(css, /\.speed-test-char-incorrect[^}]*text-decoration/s);
assert.match(css, /\.speed-test-word-viewport[^}]*overflow:\s*hidden/s);
assert.match(css, /\.speed-test-word-flow[^}]*font-variant-ligatures:\s*none/s);
const mainSource = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
assert.match(mainSource, /speedTestResultsReadyAt/);
assert.match(mainSource, /isResultsInputBlocked\(/);
assert.match(mainSource, /Screens\.SPEED_TEST_SETUP/);
assert.match(mainSource, /Screens\.SPEED_TEST_RUN/);
assert.match(mainSource, /Screens\.SPEED_TEST_RESULTS/);

console.log("Typing Test setup, stable run layout, accessible feedback, and mode-specific Results tests passed.");

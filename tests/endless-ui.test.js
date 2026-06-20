import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = {
  html: "",
  set innerHTML(value) { this.html = value; },
  querySelector() { return { onclick: null }; },
  querySelectorAll() { return []; },
};
globalThis.document = {
  querySelector(selector) {
    if (selector === "#app") return app;
    return null;
  },
};

const { renderEndlessReady, renderEndlessResults } = await import("../js/ui.js");
renderEndlessReady({ start() {} });
assert.match(app.html, /ENDLESS MODE/);
assert.match(app.html, /3 CORE INTEGRITY/);
assert.match(app.html, /20 WORDS PER STAGE/);
assert.match(app.html, /PRESS ENTER TO BEGIN/);

renderEndlessResults({
  score: 12345,
  accuracy: 94.5,
  wpm: 52.2,
  modeData: {
    highestStage: 8,
    survivalTimeMs: 300000,
    wordsCompleted: 140,
    stageProgress: 4,
    peakWpm: 70,
    finalRollingWpm: 58,
    maximumCombo: 42,
    maximumPerfectStreak: 15,
    coreHits: 3,
    coreBreaches: 4,
    survivalPoints: 30000,
    wordPoints: 12000,
    stageBonusPoints: 7000,
    attemptSeed: 123,
  },
}, 0, { retry() {}, modes() {}, title() {} });
assert.match(app.html, /RUN OVER/);
assert.match(app.html, /Highest stage.*8/s);
assert.match(app.html, /Score.*12[.,]345/s);
assert.match(app.html, /Survival time.*300\.0s/s);
assert.doesNotMatch(app.html, /GRADE|BOSS|RAW WPM/);

const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
assert.match(main, /route === "endless-ready"/);
assert.match(main, /Screens\.ENDLESS_READY/);
assert.match(main, /Screens\.ENDLESS_RESULTS/);
assert.equal(main.split('addEventListener("keydown"').length - 1, 1);

console.log("Endless ready, minimal Results, navigation, and listener integration tests passed.");

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

const { renderDailyReady, renderDailyResults, renderDailyShell } = await import("../js/ui.js");
renderDailyReady({
  dateKey: "2026-06-21",
  record: { currentStreak: 2, bestStreak: 5, best: { score: 12345 } },
}, { start() {} });
assert.match(app.html, /DAILY STRIKE/);
assert.match(app.html, /2026-06-21/);
assert.match(app.html, /3 WAVES/);
assert.match(app.html, /60 WORDS/);
assert.match(app.html, /12[.,]345/);
assert.match(app.html, /2 DAY STREAK/);

renderDailyShell({
  wave: 1,
  resolvedWordCount: 0,
  score: 0,
  combo: 0,
  integrity: 3,
}, false);
assert.match(app.html, /WAVE.*1.*\/ 3/s);
assert.match(app.html, /0 \/ 60/);
assert.match(app.html, /daily-wave-banner/);

renderDailyResults({
  success: true,
  score: 25000,
  activeDurationMs: 90000,
  accuracy: 95,
  wpm: 55,
  combo: { maximum: 30 },
  modeData: {
    dateKey: "2026-06-21",
    wordsCompleted: 60,
    wordsResolved: 60,
    integrityRemaining: 2,
    wordPoints: 6600,
    completionBonus: 10000,
    integrityBonus: 4000,
    accuracyBonus: 1900,
    timeBonus: 2500,
  },
}, { newBest: true }, 0, { retry() {}, modes() {}, title() {} });
assert.match(app.html, /CHALLENGE CLEARED/);
assert.match(app.html, /NEW DAILY BEST/);
assert.match(app.html, /RETRY SAME CHALLENGE/);
assert.match(app.html, /Integrity.*2 \/ 3/s);

const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
assert.match(main, /route === "daily-ready"/);
assert.match(main, /Screens\.DAILY_READY/);
assert.match(main, /Screens\.DAILY_RESULTS/);
assert.match(main, /startDaily\("retry", appState\.dailyResult\.modeData\.dateKey\)/);
assert.match(main, /showDailyPauseOverlay/);
assert.equal(main.split('addEventListener("keydown"').length - 1, 1);

console.log("Daily ready, compact HUD, Results, retry identity, pause, and navigation tests passed.");

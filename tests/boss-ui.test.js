import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildBossWordPools, generateBossEncounter } from "../js/bossGenerator.js";

const app = {
  innerHTML: "",
  querySelector() {
    return {
      onclick: null,
      addEventListener() {},
    };
  },
  querySelectorAll() { return []; },
};
globalThis.document = {
  querySelector(selector) {
    if (selector === "#app") return app;
    return null;
  },
};

const { renderBossShell, renderResults } = await import("../js/ui.js");
const typing = JSON.parse(await readFile(
  new URL("../data/typingTestWords.json", import.meta.url),
  "utf8",
));
const long = JSON.parse(await readFile(
  new URL("../data/bossCommonLongWords.json", import.meta.url),
  "utf8",
));
const bank = { pools: buildBossWordPools({ typingWords: typing.words, longWords: long.words }) };
const encounter = generateBossEncounter(bank, 100, 12345);
const config = {
  ...encounter.profile,
  attemptSeed: 12345,
  vocabularySource: "dedicated",
  timeLimitSec: encounter.timing.effectiveTimeLimitSec,
  generationAttempt: encounter.generationAttempt,
  fallbackUsed: encounter.fallbackUsed,
  tierPatterns: encounter.tierPatterns,
  tierCounts: encounter.tierCounts,
  wordSources: encounter.wordSources,
  ...encounter.metrics,
  ...encounter.timing,
};

renderBossShell(100, config, false, { attemptSeed: 12345, encounter });
assert.match(app.innerHTML, /BOSS 10 \/ 10/);
assert.match(app.innerHTML, /SEQUENCE 1 \/ 3/);
assert.match(app.innerHTML, /WORDS <span[^>]*>0 \/ 36/);
assert.match(app.innerHTML, /MIXED-LENGTH WORD SEQUENCE/);
assert.match(app.innerHTML, /COMPLETE EVERY SEQUENCE BEFORE TIME EXPIRES/);
assert.match(app.innerHTML, /DIFFICULTY: EXTREME/);
for (const segment of encounter.segments) {
  assert.equal(app.innerHTML.includes(segment), false, "ordinary UI must not preview segments");
}

const level10Encounter = generateBossEncounter(bank, 10, 12345);
renderBossShell(10, {
  ...level10Encounter.profile,
  timeLimitSec: level10Encounter.timing.effectiveTimeLimitSec,
  ...level10Encounter.metrics,
  ...level10Encounter.timing,
}, false, { attemptSeed: 12345, encounter: level10Encounter });
assert.match(app.innerHTML, /SEQUENCE 1 \/ 1/);
assert.doesNotMatch(app.innerHTML, /SEQUENCE 0|undefined/);
renderResults({
  grade: "A",
  wpm: 40,
  accuracy: 98,
  maxCombo: 4,
  score: 1000,
  levelNumber: 10,
  isBoss: true,
  timeRemaining: 1,
  phrasesCompleted: 1,
  phraseCount: 1,
}, 0, {
  retry() {},
  next() {},
  levels() {},
});
assert.doesNotMatch(app.innerHTML, /boss-phrase-count|SEQUENCE 1 \/ 1/);

renderBossShell(100, config, true, { attemptSeed: 12345, encounter });
for (const requiredDiagnostic of [
  "level=100",
  "seed=12345",
  "profile=3x12",
  "words=36",
  "tierPatterns=",
  "wordSources=",
  "short=",
  "medium=",
  "long=",
  "veryLong=",
  "targetCharacters=362",
  "selectedMin=",
  "selectedAvg=",
  "selectedLongest=",
  "characters=",
  "targetRange=",
  "targetWPM=100",
  "ideal=",
  "transitions=0.70s",
  "effective=",
  "attempt=",
  "fallback=false",
  "segments=",
  "lengths=",
]) {
  assert.ok(app.innerHTML.includes(requiredDiagnostic), requiredDiagnostic);
}
for (const segment of encounter.segments) {
  assert.ok(app.innerHTML.includes(segment), "developer UI should expose full segments");
}

console.log("Boss briefing, compact HUD, hidden future sequences, and diagnostics tests passed.");

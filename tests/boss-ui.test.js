import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateBossEncounter } from "../js/bossGenerator.js";

const app = { innerHTML: "" };
globalThis.document = {
  querySelector(selector) {
    if (selector === "#app") return app;
    return null;
  },
};

const { renderBossShell } = await import("../js/ui.js");
const bank = JSON.parse(
  await readFile(new URL("../data/bossWords.json", import.meta.url), "utf8"),
);
const encounter = generateBossEncounter(bank, 100, 12345);
const config = {
  ...encounter.profile,
  attemptSeed: 12345,
  vocabularySource: "dedicated",
  timeLimitSec: encounter.timing.effectiveTimeLimitSec,
  generationAttempt: encounter.generationAttempt,
  fallbackUsed: encounter.fallbackUsed,
  ...encounter.metrics,
  ...encounter.timing,
};

renderBossShell(100, config, false, { attemptSeed: 12345, encounter });
assert.match(app.innerHTML, /BOSS 10 \/ 10/);
assert.match(app.innerHTML, /SEQUENCE 1 \/ 3/);
assert.match(app.innerHTML, /WORDS <span[^>]*>0 \/ 24/);
assert.match(app.innerHTML, /ADVANCED VOCABULARY/);
assert.match(app.innerHTML, /COMPLETE EVERY SEQUENCE BEFORE TIME EXPIRES/);
assert.match(app.innerHTML, /DIFFICULTY: EXTREME/);
for (const segment of encounter.segments) {
  assert.equal(app.innerHTML.includes(segment), false, "ordinary UI must not preview segments");
}

renderBossShell(100, config, true, { attemptSeed: 12345, encounter });
for (const requiredDiagnostic of [
  "level=100",
  "seed=12345",
  "profile=3x8,min11,avg14.2,long18",
  "words=24",
  "selectedMin=",
  "selectedAvg=",
  "selectedLongest=",
  "characters=",
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

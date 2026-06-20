import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCampaignResult, beginCampaignSession } from "../js/campaignSession.js";
import {
  createEndlessRuntime,
  registerEndlessWordCompletion,
} from "../js/endlessMode.js";
import { generateLevel } from "../js/levelGenerator.js";
import { handleGameplayKey } from "../js/input.js";
import { loadModeData, MODE_DATA_STORAGE_KEY } from "../js/modeStorage.js";
import { clearSession } from "../js/sessionManager.js";
import { clearAttemptRuntime } from "../js/state.js";

const formerLevels = [22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 77, 82, 87, 92, 97];
for (const level of formerLevels) {
  const config = generateLevel(level);
  assert.equal("modifiers" in config, false);
  assert.ok(config.wordCount > 0);
}

const word = {
  id: 1,
  text: "cat",
  typedIndex: 0,
  x: 10,
  y: 0,
  startedAt: null,
  coreArrivalProcessed: false,
};
const game = {
  phase: "ACTIVE",
  ended: false,
  config: {},
  words: [word],
  targetingState: {
    mode: "idle",
    prefix: "",
    candidateIds: [],
    activeTargetId: null,
    startedAtActiveMs: null,
  },
  activeTargetId: null,
  coreX: 0,
  coreY: 0,
  elapsedMs: 100,
  score: 0,
  combo: 0,
  maxCombo: 0,
  correctKeystrokes: 0,
  correctCharacters: 0,
  totalKeystrokes: 0,
  completedWordCount: 0,
};
handleGameplayKey(
  { key: "c", preventDefault() {} },
  game,
  { strictMode: false, particles: false },
);
handleGameplayKey(
  { key: "x", preventDefault() {} },
  game,
  { strictMode: false, particles: false },
);
assert.equal(game.ended, false);
assert.equal(word.typedIndex, 1);
assert.equal(word.coreArrivalProcessed, false);

const vocabulary = {
  common: ["cat", "dog", "sun"],
  campaign: ["animal", "garden", "window"],
  difficult: ["adventure", "direction"],
  boss: ["relationship"],
};
for (const stage of [5, 15, 20, 25]) {
  const endless = createEndlessRuntime({ seed: 1, vocabulary, startStage: stage });
  assert.equal(endless.stage, stage);
  assert.equal("activeModifier" in endless, false);
  assert.equal("modifierSchedule" in endless.config, false);
  assert.equal("forcedModifier" in endless.config, false);
  assert.equal(endless.bannerText, "");
}
const transition = createEndlessRuntime({ seed: 2, vocabulary, startStage: 5 });
for (let index = 0; index < 20; index += 1) {
  registerEndlessWordCompletion(transition, { text: "cat" });
}
assert.equal(transition.stage, 6);
assert.equal(transition.bannerText, "STAGE 6");

const stale = {
  mode: "normal",
  words: [],
  wordQueue: [],
  modifierRuntime: {},
  blackoutStats: {},
  chainRuntime: {},
  forcedModifier: "blackout",
};
clearAttemptRuntime(stale);
assert.equal("modifierRuntime" in stale, false);
assert.equal("blackoutStats" in stale, false);
assert.equal("chainRuntime" in stale, false);
assert.equal("forcedModifier" in stale, false);

const values = new Map([[
  MODE_DATA_STORAGE_KEY,
  JSON.stringify({
    schemaVersion: 1,
    recentSessions: [{
      sessionId: "legacy",
      modeId: "campaign",
      modeData: {
        level: 22,
        modifierId: "quick-fingers",
        modifiersSurvived: 3,
        activeModifier: "blackout",
      },
    }],
  }),
]]);
globalThis.localStorage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, value); },
};
assert.equal(loadModeData().recentSessions[0].modeData.level, 22);

clearSession();
beginCampaignSession({
  level: 22,
  isBoss: false,
  seed: 1,
  source: "test",
  developerMode: false,
});
const campaignGame = {
  mode: "normal",
  levelNumber: 22,
  ended: true,
  elapsedMs: 1000,
  correctCharacters: 3,
  correctKeystrokes: 3,
  totalKeystrokes: 3,
  missedCharacters: 0,
  completedWordCount: 1,
  missedWordCount: 0,
  maxCombo: 1,
  combo: 1,
  score: 10,
  lives: 3,
  attemptSeed: 1,
  config: { wordCount: 1 },
};
const result = buildCampaignResult(
  campaignGame,
  { grade: "A", wpm: 40, accuracy: 100, score: 10 },
  true,
);
assert.equal("modifierId" in result.modeData, false);

const [mainSource, css] = await Promise.all([
  readFile(new URL("../js/main.js", import.meta.url), "utf8"),
  readFile(new URL("../style.css", import.meta.url), "utf8"),
]);
assert.doesNotMatch(mainSource, /applyForcedModifier|isForcedModifierRequested/);
assert.doesNotMatch(css, /modifier-hud|modifier-briefing|word-blackout|chain-break/);

console.log("Campaign, Endless, developer-query, result, cleanup, and legacy modifier removal passed.");

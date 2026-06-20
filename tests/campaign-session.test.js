import assert from "node:assert/strict";
import {
  beginCampaignSession,
  finalizeCampaignSession,
  syncCampaignSession,
} from "../js/campaignSession.js";
import { MODE_DATA_STORAGE_KEY } from "../js/modeStorage.js";
import {
  abortSession,
  clearSession,
  getCurrentSession,
  pauseSession,
  resumeSession,
  SESSION_STATES,
} from "../js/sessionManager.js";

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, value); },
};

function normalGame() {
  return {
    mode: "normal",
    levelNumber: 22,
    phase: "ACTIVE",
    ended: false,
    elapsedMs: 5000,
    correctCharacters: 20,
    correctKeystrokes: 20,
    totalKeystrokes: 22,
    missedCharacters: 3,
    completedWordCount: 4,
    missedWordCount: 1,
    maxCombo: 4,
    combo: 2,
    score: 500,
    lives: 2,
    attemptSeed: 12345,
    config: { wordCount: 5 },
  };
}

clearSession();
beginCampaignSession({
  level: 22,
  isBoss: false,
  seed: 12345,
  source: "level-select",
  developerMode: false,
});
const game = normalGame();
assert.equal(syncCampaignSession(game), true);
assert.equal(getCurrentSession().state, SESSION_STATES.ACTIVE);
assert.equal(pauseSession(), true);
assert.equal(getCurrentSession().state, SESSION_STATES.PAUSED);
assert.equal(resumeSession(), true);
assert.equal(getCurrentSession().state, SESSION_STATES.ACTIVE);

game.ended = true;
const campaignResult = {
  grade: "A",
  wpm: 48,
  accuracy: 95,
  score: 500,
};
const normalized = finalizeCampaignSession(game, campaignResult, true);
assert.equal(normalized.modeId, "campaign");
assert.equal(normalized.variantId, "normal");
assert.equal(normalized.modeData.level, 22);
assert.equal("modifierId" in normalized.modeData, false);
assert.equal(normalized.activeDurationMs, game.elapsedMs);
assert.equal(finalizeCampaignSession(game, campaignResult, true), null);
assert.equal(JSON.parse(values.get(MODE_DATA_STORAGE_KEY)).totals.completedSessions, 1);

beginCampaignSession({
  level: 30,
  isBoss: true,
  seed: 77,
  source: "next-level",
  developerMode: true,
});
const boss = {
  ...normalGame(),
  mode: "boss",
  levelNumber: 30,
  phase: "INTRO",
  config: { totalWordCount: 8 },
  phrasesCompleted: 0,
};
assert.equal(syncCampaignSession(boss), true);
assert.equal(getCurrentSession().state, SESSION_STATES.BRIEFING);
boss.phase = "ACTIVE";
assert.equal(syncCampaignSession(boss), true);
boss.phase = "TRANSITION";
assert.equal(syncCampaignSession(boss), true);
assert.equal(getCurrentSession().state, SESSION_STATES.TRANSITIONING);
boss.phase = "ACTIVE";
assert.equal(syncCampaignSession(boss), true);
boss.ended = true;
finalizeCampaignSession(boss, { ...campaignResult, grade: "Fail" }, false);
assert.equal(JSON.parse(values.get(MODE_DATA_STORAGE_KEY)).totals.completedSessions, 1);

beginCampaignSession({
  level: 1,
  isBoss: false,
  source: "retry",
  developerMode: false,
});
assert.equal(abortSession("level-select").state, SESSION_STATES.ABORTED);

console.log("Campaign normal/boss lifecycle mapping, normalized completion, duplicate guard, and developer exclusion tests passed.");

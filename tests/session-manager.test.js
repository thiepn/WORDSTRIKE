import assert from "node:assert/strict";
import { MODE_IDS } from "../js/modes.js";
import {
  abortSession,
  beginSession,
  clearSession,
  completeSession,
  getCurrentSession,
  getSessionTiming,
  hasActiveSession,
  markSessionActive,
  pauseSession,
  resumeSession,
  SESSION_STATES,
  setSessionState,
} from "../js/sessionManager.js";

clearSession();
const first = beginSession({
  modeId: MODE_IDS.CAMPAIGN,
  variantId: "normal",
  source: "level-select",
  seed: 123,
}, { monotonicMs: 0, epochMs: 1000 });
assert.ok(first.id);
assert.equal(first.state, SESSION_STATES.PREPARING);
assert.equal(hasActiveSession(), true);
assert.equal(beginSession({ modeId: MODE_IDS.CAMPAIGN }), null);
assert.equal(beginSession({ modeId: MODE_IDS.ENDLESS }), null);
assert.equal(completeSession({ score: 1 }), null);
assert.equal(setSessionState(SESSION_STATES.TRANSITIONING, { monotonicMs: 5 }), false);
assert.equal(setSessionState(SESSION_STATES.BRIEFING, { monotonicMs: 10 }), true);
assert.equal(markSessionActive({ monotonicMs: 20, epochMs: 1020 }), true);
assert.equal(pauseSession({ monotonicMs: 120 }), true);
assert.deepEqual(getSessionTiming({ monotonicMs: 170 }), {
  activeDurationMs: 100,
  pausedDurationMs: 50,
});
assert.equal(resumeSession({ monotonicMs: 220 }), true);
assert.equal(getCurrentSession().state, SESSION_STATES.ACTIVE);
assert.deepEqual(getSessionTiming({ monotonicMs: 320 }), {
  activeDurationMs: 200,
  pausedDurationMs: 100,
});

const completed = completeSession({ score: 10 }, {
  monotonicMs: 320,
  epochMs: 1320,
});
assert.equal(completed.state, SESSION_STATES.COMPLETED);
assert.equal(completed.resultFinalized, true);
assert.equal(completeSession({ score: 20 }), null);
assert.equal(abortSession("late-abort"), null);
assert.equal(hasActiveSession(), false);

const retry = beginSession({
  modeId: MODE_IDS.CAMPAIGN,
  variantId: "normal",
  source: "retry",
}, { monotonicMs: 400, epochMs: 1400 });
assert.notEqual(retry.id, first.id);
assert.equal(abortSession("retry", { monotonicMs: 450, epochMs: 1450 }).state, SESSION_STATES.ABORTED);
assert.equal(completeSession({}), null);
clearSession();
assert.equal(getCurrentSession(), null);
assert.equal(hasActiveSession(), false);

console.log("Single-session lifecycle, transition, timing, finalization, abort, and retry identity tests passed.");

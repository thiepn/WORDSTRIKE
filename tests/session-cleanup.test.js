import assert from "node:assert/strict";
import { MODE_IDS } from "../js/modes.js";
import { cleanupCurrentSession } from "../js/sessionCleanup.js";
import {
  beginSession,
  getCurrentSession,
  hasActiveSession,
} from "../js/sessionManager.js";

const calls = [];
beginSession({
  modeId: MODE_IDS.CAMPAIGN,
  variantId: "normal",
  source: "level-select",
});
cleanupCurrentSession({
  reason: "main-menu",
  stopGameplay: () => calls.push("stop"),
  hidePause: () => calls.push("pause"),
  clearRuntime: () => calls.push("runtime"),
});
assert.deepEqual(calls, ["stop", "pause", "runtime"]);
assert.equal(hasActiveSession(), false);
assert.equal(getCurrentSession(), null);

console.log("Shared cleanup coordinates gameplay teardown, abort, and session clearing.");

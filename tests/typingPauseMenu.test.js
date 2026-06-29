import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SPEED_TEST_PAUSE_ACTIONS } from "../js/ui.js";

assert.deepEqual(SPEED_TEST_PAUSE_ACTIONS.map(([label, action]) => [label, action]), [
  ["RESUME", "resume"],
  ["RESTART TEST", "restart"],
  ["MODE SELECT", "modes"],
  ["MAIN MENU", "title"],
]);

const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
const cleanup = await readFile(new URL("../js/sessionCleanup.js", import.meta.url), "utf8");
assert.match(main, /showSpeedTestPauseOverlay[\s\S]*restart:\s*\(\) => resetSpeedTestAttempt\("pause-restart"\)[\s\S]*modes:\s*openModeSelect/);
assert.match(main, /function openModeSelect\(\)[\s\S]*cleanupCampaignAttempt\("mode-select"\)[\s\S]*Screens\.MODE_SELECT/);
assert.match(main, /function discardActiveAttempt\(\)[\s\S]*unmountGameplayInput\(\)[\s\S]*clearSpeedTestRuntime\(\)/);
assert.match(cleanup, /clearSessionState/);
assert.doesNotMatch(main, /quit-test/);

console.log("Typing pause order and safe Mode Select cleanup routing passed.");

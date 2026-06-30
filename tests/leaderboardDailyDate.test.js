import assert from "node:assert/strict";
import { DAILY_CHALLENGE_VERSION } from "../js/dailyConfig.js";
import { getUtcDateKey, isValidDailyDateKey } from "../js/dailyDate.js";
import { getDailyChallengeSeed } from "../js/dailyGenerator.js";

const instant = new Date("2026-06-27T23:59:59.999Z");
const dateKey = getUtcDateKey(instant);
assert.equal(DAILY_CHALLENGE_VERSION, 1);
assert.equal(dateKey, "2026-06-27");
assert.equal(isValidDailyDateKey(dateKey), true);
assert.equal(getDailyChallengeSeed(dateKey), getDailyChallengeSeed(dateKey, DAILY_CHALLENGE_VERSION));

console.log("Leaderboard Daily date reuses the canonical UTC challenge identity and version.");

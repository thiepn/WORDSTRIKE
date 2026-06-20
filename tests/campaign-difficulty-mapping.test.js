import assert from "node:assert/strict";
import {
  CAMPAIGN_DIFFICULTY_ANCHORS,
  getCampaignDifficultyLevel,
} from "../js/campaignDifficulty.js";

for (const { level, legacyLevel } of CAMPAIGN_DIFFICULTY_ANCHORS) {
  assert.equal(getCampaignDifficultyLevel(level), legacyLevel);
}

assert.equal(getCampaignDifficultyLevel(2), 2.5);
assert.equal(getCampaignDifficultyLevel(7), 15);
assert.equal(getCampaignDifficultyLevel(10), 26.5);
assert.equal(getCampaignDifficultyLevel(17.5), 37.5);
assert.equal(getCampaignDifficultyLevel(35), 54);
assert.equal(getCampaignDifficultyLevel(95), 96.44444444444444);

assert.equal(getCampaignDifficultyLevel(-20), 1);
assert.equal(getCampaignDifficultyLevel(0), 1);
assert.equal(getCampaignDifficultyLevel(100), 100);
assert.equal(getCampaignDifficultyLevel(1000), 100);
assert.equal(getCampaignDifficultyLevel(NaN), 1);
assert.equal(getCampaignDifficultyLevel("bad"), 1);
assert.equal(getCampaignDifficultyLevel("11"), 30);

let previous = getCampaignDifficultyLevel(1);
for (let level = 1.01; level <= 99; level += 0.01) {
  const current = getCampaignDifficultyLevel(level);
  assert.ok(current >= previous, `mapping regressed at ${level}`);
  previous = current;
}

console.log("Campaign anchor, interpolation, clamping, and monotonicity tests passed.");

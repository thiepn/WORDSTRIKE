import assert from "node:assert/strict";
import {
  consumeLeaderboardReturnState,
  LEADERBOARD_RETURN_STORAGE_KEY,
  saveLeaderboardReturnState,
  validateLeaderboardReturnState,
} from "../js/leaderboardReturnState.js";

const values = new Map();
const storage = {
  setItem(key, value) { values.set(key, value); },
  getItem(key) { return values.get(key) ?? null; },
  removeItem(key) { values.delete(key); },
};
assert.equal(saveLeaderboardReturnState({ screen: "leaderboards", selectedCategory: "typing", typingDuration: 15 }, storage), true);
assert.deepEqual(JSON.parse(values.get(LEADERBOARD_RETURN_STORAGE_KEY)), { screen: "leaderboards", selectedCategory: "typing", typingDuration: 15 });
assert.deepEqual(consumeLeaderboardReturnState(storage), { screen: "leaderboards", selectedCategory: "typing", typingDuration: 15 });
assert.equal(consumeLeaderboardReturnState(storage), null);
assert.equal(validateLeaderboardReturnState({ screen: "leaderboards", selectedCategory: "typing", typingDuration: 30 }), null);
assert.equal(validateLeaderboardReturnState({ screen: "https://evil.example", selectedCategory: "campaign" }), null);
assert.equal(saveLeaderboardReturnState({ screen: "leaderboards", selectedCategory: "campaign", accessToken: "secret" }, storage), false);

console.log("OAuth return state is enum-only, session-scoped, one-shot, and rejects URLs, tokens, and invalid durations.");

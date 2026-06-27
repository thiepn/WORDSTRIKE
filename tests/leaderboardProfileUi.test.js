import assert from "node:assert/strict";
import { createDefaultModeData } from "../js/modeStorage.js";
import { getStatisticsSnapshot } from "../js/statistics.js";

const app = {
  html: "",
  set innerHTML(value) { this.html = value; },
  querySelectorAll() { return []; },
  querySelector() { return null; },
};
globalThis.document = { querySelector: (selector) => selector === "#app" ? app : null };
const { renderProfileStatistics } = await import("../js/statisticsUi.js");
const storage = createDefaultModeData();
storage.profile = {
  playerId: "ws_leaderboard-ui",
  displayName: "Player",
  createdAt: 1000,
  updatedAt: 1000,
  profileVersion: 1,
};
const snapshot = getStatisticsSnapshot(storage, { currentFurthestLevel: 1, levels: {} }, "2026-06-27");
const authState = {
  status: "signed-in",
  user: { email: "private@example.com", user_metadata: { full_name: "Private Google Name" } },
  session: { access_token: "private-access-token", refresh_token: "private-refresh-token" },
};
const render = (leaderboardProfileState) => renderProfileStatistics({
  snapshot, storage, activeTab: 6, authState, leaderboardProfileState,
}, {});

render({ status: "loading" });
assert.match(app.html, /Google account connected/);
assert.match(app.html, /Loading public profile/);

render({ status: "needs-username", draft: "" });
assert.match(app.html, /Choose a public leaderboard username/);
assert.match(app.html, /minlength="3"/);
assert.match(app.html, /maxlength="20"/);
assert.match(app.html, /autocomplete="username"/);
assert.match(app.html, /spellcheck="false"/);
assert.match(app.html, /leaderboard-username-check/);
assert.match(app.html, /leaderboard-username-claim/);
assert.match(app.html, /auth-sign-out/);

render({
  status: "needs-username",
  draft: "Available_Name",
  availability: { username: "Available_Name", available: true },
});
assert.match(app.html, /Username is available/);
render({
  status: "needs-username",
  draft: "Taken_Name",
  availability: { username: "Taken_Name", available: false },
});
assert.match(app.html, /Username is already taken/);

render({
  status: "ready",
  profile: { username: "WordStriker27", usernameChangedAt: null, canChangeAt: null },
  notice: "Username created successfully.",
});
assert.match(app.html, /PUBLIC USERNAME/);
assert.match(app.html, /WordStriker27/);
assert.match(app.html, /Username created successfully/);
assert.match(app.html, /leaderboard-username-start-change/);

render({
  status: "ready",
  profile: { username: "WordStriker27", usernameChangedAt: null, canChangeAt: null },
  editing: true,
  draft: "NewWordStriker",
});
assert.match(app.html, /NewWordStriker/);
assert.match(app.html, /leaderboard-username-save-change/);
assert.match(app.html, /leaderboard-username-cancel-change/);

render({
  status: "ready",
  profile: {
    username: "CooldownName",
    usernameChangedAt: "2099-01-01T00:00:00.000Z",
    canChangeAt: "2099-01-31T00:00:00.000Z",
  },
});
assert.match(app.html, /You can change your username again on/);
assert.match(app.html, /leaderboard-username-start-change" disabled/);

render({
  status: "ready",
  profile: { username: "<img src=x onerror=alert(1)>", usernameChangedAt: null, canChangeAt: null },
});
assert.doesNotMatch(app.html, /<img src=x/);
assert.match(app.html, /&lt;img src=x/);
assert.doesNotMatch(app.html, /private@example\.com|Private Google Name|private-access-token|private-refresh-token/);

console.log("Leaderboard Profile loading, claim, availability, ready, change, cooldown, and escaping UI passed.");

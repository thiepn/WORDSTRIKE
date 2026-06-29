import assert from "node:assert/strict";
import { renderSettingsAccountManagement } from "../js/statisticsUi.js";
import { resolveAppClickAction } from "../js/appClickRouting.js";
import { Screens } from "../js/state.js";

const signedOut = renderSettingsAccountManagement({
  localProfile: { displayName: "PLAYER" },
  authState: { status: "signed-out" },
  leaderboardProfileState: { status: "idle" },
});
assert.match(signedOut, /ACCOUNT &amp; LEADERBOARDS/);
assert.match(signedOut, /LOCAL DISPLAY NAME/);
assert.match(signedOut, /CONTINUE WITH GOOGLE/);
assert.match(signedOut, /settings-edit-name/);

const signedIn = renderSettingsAccountManagement({
  localProfile: { displayName: "PLAYER" },
  editing: true,
  draft: "NEW NAME",
  authState: { status: "signed-in", user: { id: "user-1" } },
  leaderboardProfileState: { status: "ready", profile: { username: "Player_1", canChangeAt: null } },
});
assert.match(signedIn, /profile-name-input/);
assert.match(signedIn, /PUBLIC USERNAME/);
assert.match(signedIn, /CHANGE USERNAME/);
assert.match(signedIn, /SIGN OUT/);

const root = { contains: () => true };
const screen = { className: "settings-screen", parent: null };
const button = {
  disabled: false,
  dataset: { action: "auth-google-sign-in" },
  parent: screen,
  getAttribute: () => null,
  closest(selector) {
    if (selector === "[data-action]") return this;
    if (selector === ".settings-screen") return screen;
    return null;
  },
};
assert.equal(resolveAppClickAction({ target: button, button: 0 }, { root, screen: Screens.SETTINGS }), "auth-google-sign-in");

console.log("Settings exposes shared local-profile, Google-auth, and public-username management controls.");

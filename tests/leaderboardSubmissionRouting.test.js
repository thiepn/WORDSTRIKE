import assert from "node:assert/strict";
import { resolveAppClickAction } from "../js/appClickRouting.js";
import { Screens } from "../js/state.js";

const screen = { className: "daily-results-screen", parent: null };
const root = { contains: (node) => node === screen || node === button };
screen.parent = root;
const button = {
  dataset: { action: "submit-global-score" }, disabled: false,
  getAttribute: () => null,
  closest(selector) {
    if (selector === "[data-action]") return this;
    if (selector === ".daily-results-screen") return screen;
    return null;
  },
};
const event = { button: 0, target: button };
assert.equal(resolveAppClickAction(event, { root, screen: Screens.DAILY_RESULTS, now: 2, readyAt: 1 }), "submit-global-score");
button.dataset.action = "view-daily-leaderboard";
assert.equal(resolveAppClickAction(event, { root, screen: Screens.DAILY_RESULTS, now: 2, readyAt: 1 }), "view-daily-leaderboard");
button.disabled = true;
assert.equal(resolveAppClickAction(event, { root, screen: Screens.DAILY_RESULTS, now: 2, readyAt: 1 }), null);
button.disabled = false;
button.dataset.action = "view-endless-leaderboard";
screen.className = "endless-results-screen";
button.closest = function (selector) {
  if (selector === "[data-action]") return this;
  if (selector === ".endless-results-screen") return screen;
  return null;
};
assert.equal(resolveAppClickAction(event, { root, screen: Screens.ENDLESS_RESULTS, now: 2, readyAt: 1 }), "view-endless-leaderboard");
button.dataset.action = "view-campaign-leaderboard";
screen.className = "results-screen";
button.closest = function (selector) {
  if (selector === "[data-action]") return this;
  if (selector === ".results-screen") return screen;
  return null;
};
assert.equal(resolveAppClickAction(event, { root, screen: Screens.RESULTS, now: 2, readyAt: 1 }), "view-campaign-leaderboard");
button.dataset.action = "view-typing-15-leaderboard";
screen.className = "speed-results-screen";
button.closest = function (selector) {
  if (selector === "[data-action]") return this;
  if (selector === ".speed-results-screen") return screen;
  return null;
};
assert.equal(resolveAppClickAction(event, { root, screen: Screens.SPEED_TEST_RESULTS, now: 2, readyAt: 1 }), "view-typing-15-leaderboard");

console.log("Delegated result routing recognizes submission, retry, profile, and contextual leaderboard actions without new listeners.");

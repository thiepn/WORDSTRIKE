import assert from "node:assert/strict";
import { createDefaultModeData } from "../js/modeStorage.js";
import { getStatisticsSnapshot } from "../js/statistics.js";
import { Screens } from "../js/state.js";
import { attachAppClickListener, resolveAppClickAction } from "../js/appClickRouting.js";

class MouseEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles === true;
    this.button = options.button ?? 0;
  }
  preventDefault() {}
}
globalThis.MouseEvent = MouseEvent;

class Element {
  constructor({ root, parent = null, action = null, className = "" } = {}) {
    this.root = root || this;
    this.parent = parent;
    this.dataset = action ? { action } : {};
    this.className = className;
    this.disabled = false;
    this.hidden = false;
    this.attributes = {};
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  closest(selector) {
    let node = this;
    while (node) {
      if (selector === "[data-action]" && node.dataset?.action) return node;
      if (selector === "[hidden]" && node.hidden) return node;
      if (selector === '[aria-hidden="true"]' && node.attributes?.["aria-hidden"] === "true") return node;
      if (selector.startsWith(".") && node.className.split(" ").includes(selector.slice(1))) return node;
      node = node.parent;
    }
    return null;
  }
  dispatchEvent(event) {
    event.target = this;
    if (event.bubbles) this.root.listeners.get(event.type)?.forEach((listener) => listener(event));
  }
  focus() {}
  select() {}
}

class Root extends Element {
  constructor() {
    super();
    this.root = this;
    this.listeners = new Map();
    this.buttons = [];
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }
  set innerHTML(value) {
    this.html = value;
    const screen = new Element({ root: this, parent: this, className: "profile-stats-screen" });
    const account = new Element({ root: this, parent: screen, className: "global-account" });
    this.buttons = [...value.matchAll(/<button([^>]*)data-action="([^"]+)"([^>]*)>/g)].map((match) => {
      const button = new Element({ root: this, parent: account, action: match[2], className: "arcade-button" });
      const attributes = `${match[1]} ${match[3]}`;
      button.disabled = /\bdisabled\b/.test(attributes);
      if (/aria-disabled="true"/.test(attributes)) button.attributes["aria-disabled"] = "true";
      return button;
    });
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
}

const root = new Root();
globalThis.document = { querySelector: (selector) => selector === "#app" ? root : null };
const { renderProfileStatistics } = await import("../js/statisticsUi.js");
const storage = createDefaultModeData();
storage.profile = { playerId: "ws_route", displayName: "Player", createdAt: 1, updatedAt: 1, profileVersion: 1 };
const snapshot = getStatisticsSnapshot(storage, { currentFurthestLevel: 1, levels: {} }, "2026-06-27");
const authState = { status: "signed-in", user: { id: "user-1" } };
const render = (leaderboardProfileState) => renderProfileStatistics({
  snapshot, storage, activeTab: 6, authState, leaderboardProfileState,
}, {});
const calls = [];
const listener = (event) => {
  const action = resolveAppClickAction(event, { root, screen: Screens.PROFILE_STATS });
  if (action) calls.push(action);
};
assert.equal(attachAppClickListener(root, listener), true);
assert.equal(attachAppClickListener(root, listener), false);

render({ status: "needs-username", draft: "Valid_Name" });
for (const action of ["leaderboard-username-check", "leaderboard-username-claim"]) {
  root.buttons.find((button) => button.dataset.action === action)
    .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}
render({ status: "ready", profile: { username: "Valid_Name", canChangeAt: null } });
root.buttons.find((button) => button.dataset.action === "leaderboard-username-start-change")
  .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
render({
  status: "ready",
  profile: { username: "Valid_Name", canChangeAt: null },
  editing: true,
  draft: "New_Name",
});
for (const action of ["leaderboard-username-save-change", "leaderboard-username-cancel-change"]) {
  root.buttons.find((button) => button.dataset.action === action)
    .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}
assert.deepEqual(calls, [
  "leaderboard-username-check",
  "leaderboard-username-claim",
  "leaderboard-username-start-change",
  "leaderboard-username-save-change",
  "leaderboard-username-cancel-change",
]);
assert.equal(root.listeners.get("click").length, 1);

render({ status: "checking", draft: "Valid_Name" });
root.buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
render({ status: "needs-username", draft: "Valid_Name" });
root.buttons[0].hidden = true;
root.buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
assert.equal(calls.length, 5);

console.log("Leaderboard username actions use one stable bubbling click route and reject disabled or hidden controls.");

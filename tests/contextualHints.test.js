import assert from "node:assert/strict";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
const children = [];
const screen = { append(element) { children.push(element); } };
globalThis.document = {
  querySelector: () => screen,
  createElement: () => ({ className: "", textContent: "", remove() { this.removed = true; } }),
};
let timeoutCallback = null;
globalThis.setTimeout = (callback) => { timeoutCallback = callback; return 1; };
globalThis.clearTimeout = () => {};

const {
  dismissContextualHint,
  getActiveContextualHint,
  showContextualHint,
} = await import("../js/contextualHints.js");
const { isHintSeen } = await import("../js/onboardingStorage.js");

assert.equal(showContextualHint("campaign-target", "TYPE THE HIGHLIGHTED WORD", { timeoutMs: 1000 }), true);
assert.equal(getActiveContextualHint().id, "campaign-target");
assert.equal(showContextualHint("campaign-danger", "PROTECT THE CORE", { timeoutMs: 0 }), true);
assert.equal(children[0].removed, true, "only one hint may remain visible");
assert.equal(getActiveContextualHint().id, "campaign-danger");
dismissContextualHint();
assert.equal(getActiveContextualHint(), null);
assert.equal(isHintSeen("campaign-danger"), true);
assert.equal(showContextualHint("campaign-danger", "AGAIN"), false);
assert.equal(typeof timeoutCallback, "function");

console.log("Contextual hints are single-instance, non-blocking, locally persisted, dismissible, and safe across cleanup.");

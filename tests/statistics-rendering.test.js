import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDefaultModeData } from "../js/modeStorage.js";
import { getStatisticsSnapshot } from "../js/statistics.js";

class Node {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.onclick = null;
  }
  focus() {}
  select() {}
}

const app = {
  html: "",
  nodes: [],
  set innerHTML(value) {
    this.html = value;
    this.nodes = [
      ...[...value.matchAll(/data-stats-tab="(\d+)"/g)].map((match) => new Node({ statsTab: match[1] })),
      ...[...value.matchAll(/data-recent-filter="([^"]+)"/g)].map((match) => new Node({ recentFilter: match[1] })),
      ...[...value.matchAll(/data-stats-action="([^"]+)"/g)].map((match) => new Node({ statsAction: match[1] })),
    ];
  },
  querySelectorAll(selector) {
    if (selector === "[data-stats-tab]") return this.nodes.filter((node) => node.dataset.statsTab);
    if (selector === "[data-recent-filter]") return this.nodes.filter((node) => node.dataset.recentFilter);
    return [];
  },
  querySelector(selector) {
    const action = selector.match(/data-stats-action="([^"]+)"/)?.[1];
    if (action) return this.nodes.find((node) => node.dataset.statsAction === action) || null;
    if (selector === "#profile-name-input") return new Node();
    return null;
  },
};
globalThis.document = {
  querySelector(selector) {
    return selector === "#app" ? app : null;
  },
};

const { renderProfileStatistics, STATISTICS_TABS } = await import("../js/statisticsUi.js");
const storage = createDefaultModeData();
storage.profile = {
  playerId: `ws_${"a".repeat(80)}`,
  displayName: "Player",
  createdAt: 1000,
  updatedAt: 1000,
  profileVersion: 1,
};
const snapshot = getStatisticsSnapshot(storage, {
  currentFurthestLevel: 1,
  levels: {},
}, "2026-06-21");

renderProfileStatistics({ snapshot, storage, activeTab: 0 }, {});
assert.equal((app.html.match(/data-stats-tab=/g) || []).length, 7);
for (const tab of STATISTICS_TABS) assert.match(app.html, new RegExp(tab));
assert.match(app.html, /PLAY A MODE TO BUILD YOUR STATISTICS/);
assert.match(app.html, /data-active-tab="OVERVIEW"/);
assert.doesNotMatch(app.html, /NO CAMPAIGN LEVELS COMPLETED/);
assert.doesNotMatch(app.html, /NaN|undefined|Invalid Date/);

renderProfileStatistics({ snapshot, storage, activeTab: 1 }, {});
assert.match(app.html, /NO CAMPAIGN LEVELS COMPLETED/);
assert.match(app.html, /data-active-tab="CAMPAIGN"/);

renderProfileStatistics({ snapshot, storage, activeTab: 2 }, {});
assert.match(app.html, /NO TYPING TEST RECORDS/);
assert.match(app.html, /ENGLISH 200/);
assert.doesNotMatch(app.html, /ENGLISH 199/);

renderProfileStatistics({ snapshot, storage, activeTab: 3 }, {});
assert.match(app.html, /NO ENDLESS RUNS YET/);
assert.doesNotMatch(app.html, /MODIFIER/i);

renderProfileStatistics({ snapshot, storage, activeTab: 4 }, {});
assert.match(app.html, /NO DAILY STRIKE ATTEMPTS YET/);

renderProfileStatistics({ snapshot, storage, activeTab: 5 }, {});
assert.match(app.html, /NO RECENT SESSIONS/);
assert.equal((app.html.match(/data-recent-filter=/g) || []).length, 5);

renderProfileStatistics({
  snapshot,
  storage,
  activeTab: 6,
  editing: true,
  draft: "Player",
  copyMessage: "COPY UNAVAILABLE",
}, {});
assert.match(app.html, /EDIT NAME|SAVE/);
assert.match(app.html, /COPY PLAYER ID/);
assert.match(app.html, /STORED LOCALLY ON THIS DEVICE/);
assert.match(app.html, /not uploaded anywhere/i);
assert.doesNotMatch(app.html, /NaN|undefined|Invalid Date/);

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
assert.match(css, /\.profile-stats-screen[^}]*overflow-y:\s*auto/s);
assert.match(css, /\.profile-tabs[^}]*overflow-x:\s*auto/s);
assert.match(css, /\.profile-details code[^}]*overflow-wrap:\s*anywhere/s);
assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.profile-metric-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/s);
assert.match(css, /--text-muted:\s*#[0-9a-f]+/i);
assert.match(css, /\.profile-metric-grid\s*\{[^}]*background:\s*transparent/s);
assert.match(css, /\.profile-stats-screen\s*\{[^}]*--profile-text-secondary:\s*#d2dbe2/s);
assert.match(css, /\.profile-stats-screen\s*\{[^}]*--profile-text-muted:\s*#bac6cf/s);

console.log("Statistics tabs, active-only panels, empty states, profile controls, safe values, and responsive CSS tests passed.");

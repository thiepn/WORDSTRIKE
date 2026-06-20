import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getAllModes } from "../js/modes.js";

class Card {
  constructor(id, index, button) {
    this.dataset = { modeId: id, modeIndex: String(index) };
    this.button = button;
  }
  matches(selector) { return selector === "button" && this.button; }
  focus() {}
}

const app = {
  html: "",
  cards: [],
  set innerHTML(value) {
    this.html = value;
    this.cards = [...value.matchAll(/<(button|article)[^>]*data-mode-id="([^"]+)"[^>]*data-mode-index="(\d+)"/g)]
      .map((match) => new Card(match[2], Number(match[3]), match[1] === "button"));
  },
  querySelectorAll(selector) {
    return selector === "[data-mode-index]" ? this.cards : [];
  },
  querySelector(selector) {
    if (selector === ".mode-card.available.selected") {
      return this.cards.find((card) => card.button) || null;
    }
    return null;
  },
};
globalThis.document = {
  querySelector(selector) {
    if (selector === "#app") return app;
    return null;
  },
};

const { renderModeSelect } = await import("../js/ui.js");
const selected = [];
const activated = [];
renderModeSelect(getAllModes(), 0, {
  select: (index) => selected.push(index),
  activate: (id) => activated.push(id),
});
assert.match(app.html, /MODE SELECT/);
assert.match(app.html, /CAMPAIGN/i);
assert.equal((app.html.match(/COMING SOON/g) || []).length, 4);
assert.equal(app.cards.filter((card) => card.button).length, 1);
app.cards[3].onmouseenter();
assert.equal(selected.at(-1), 3);
assert.equal(app.cards[3].onclick, undefined);
app.cards[0].onclick();
assert.equal(activated.at(-1), "campaign");

const mainSource = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
assert.match(mainSource, /Screens\.MODE_SELECT/);
assert.match(mainSource, /if \(event\.key === "Escape"\) \{\s*openTitle\(\)/s);
assert.match(mainSource, /back: openModeSelect/);
assert.match(mainSource, /renderDevSessionDiagnostics/);
assert.equal(mainSource.split('addEventListener("keydown"').length - 1, 1);

console.log("Mode Select cards, disabled behavior, mouse synchronization, and navigation wiring tests passed.");

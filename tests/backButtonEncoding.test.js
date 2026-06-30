import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sources = await Promise.all([
  "ui.js", "leaderboardUi.js", "statisticsUi.js", "onboardingView.js",
].map((file) => readFile(new URL(`../js/${file}`, import.meta.url), "utf8")));
const backLines = sources.join("\n").split(/\r?\n/).filter((line) => /BACK|go back/i.test(line));

assert.ok(backLines.length >= 8);
for (const line of backLines) {
  assert.doesNotMatch(line, /Ã¢|ï¿½|â–¡|â†/);
}
assert.ok(backLines.some((line) => />BACK<\/button>/.test(line)));
assert.ok(backLines.some((line) => /aria-label="Go back"/.test(line)));

console.log("All Back controls use safe ASCII labels with accessible names and no corrupted arrow glyphs.");

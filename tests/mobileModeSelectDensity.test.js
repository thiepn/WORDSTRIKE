import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const ui = await readFile(new URL("../js/ui.js", import.meta.url), "utf8");
const desktop = css.slice(0, css.indexOf("@media (max-width: 760px)"));
const mobile = css.slice(css.indexOf("@media (max-width: 760px)"), css.indexOf("@media (hover: none)"));

assert.match(desktop, /\.mode-card\s*\{[^}]*min-height:\s*168px/s);
assert.match(mobile, /\.mode-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
assert.match(mobile, /\.mode-card\s*\{[^}]*min-height:\s*104px[^}]*padding:\s*12px 10px/s);
assert.match(mobile, /\.mode-panel\s*\{[^}]*padding:\s*14px/s);
assert.match(ui, /class="mode-card[\s\S]*<strong>\$\{mode\.name\}<\/strong>[\s\S]*<span>\$\{mode\.shortLabel\}<\/span>[\s\S]*<small>/);
assert.match(ui, /data-mode-index/);

console.log("Mode Select keeps desktop sizing while mobile uses compact touch-friendly cards with unchanged content and selection hooks.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ONBOARDING_TUTORIALS } from "../js/onboardingContent.js";

const ui = await readFile(new URL("../js/ui.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const renderStart = ui.indexOf("export function renderSpeedTestRun");
const renderEnd = ui.indexOf("export function measureSpeedTestLayout", renderStart);
const renderSource = ui.slice(renderStart, renderEnd);

assert.match(renderSource, /speed-test-topbar-primary/);
assert.match(renderSource, /speed-test-topbar-secondary/);
assert.match(renderSource, /speed-test-upper-overlay/);
assert.match(renderSource, /speed-test-upper-overlay-content/);
assert.match(renderSource, /speed-test-prompt-actions/);
assert.match(renderSource, /START TYPING TO BEGIN/);
assert.match(renderSource, /<button[^>]*data-gameplay-action="restart"[^>]*>RESTART/);
assert.match(renderSource, /<button[^>]*data-gameplay-action="pause"[^>]*>PAUSE/);
assert.doesNotMatch(renderSource, /speed-test-hint/);
assert.match(ui, /status\.hidden = state\.activeStartedAtMs != null/);
assert.match(css, /\.speed-test-topbar-primary[\s\S]*\.speed-test-topbar-secondary/);
assert.match(css, /\.speed-test-upper-overlay[\s\S]*grid-template-rows/);
assert.match(css, /\.gameplay-control-button[\s\S]*min-height:\s*44px/);

const typingControls = ONBOARDING_TUTORIALS.typing.steps
  .flatMap((step) => step.controls || [])
  .map((control) => control.key);
assert.deepEqual(typingControls, ["TYPE", "SPACE", "BACKSPACE", "TAB", "ESC"]);

console.log("Typing Test has separate top-control, prompt, and word-stream regions with visible Restart/Pause controls.");

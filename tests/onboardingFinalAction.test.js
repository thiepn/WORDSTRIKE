import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ONBOARDING_TUTORIALS } from "../js/onboardingContent.js";
import { createOnboardingController } from "../js/onboarding.js";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
};

const finalStep = ONBOARDING_TUTORIALS.general.steps.at(-1);
assert.equal(finalStep.primaryLabel, "START");
assert.equal(finalStep.secondaryLabel, undefined);
assert.match(finalStep.helper, /main menu/i);

const controlKeys = ONBOARDING_TUTORIALS.general.steps
  .flatMap((step) => step.controls || [])
  .map((control) => control.key);
assert.deepEqual(controlKeys, ["ARROW KEYS", "ENTER", "ESC"]);

let completed = false;
const controller = createOnboardingController();
controller.open("general", { source: "automatic", onComplete: () => { completed = true; } });
controller.last();
controller.choose("primary");
assert.equal(controller.getState(), null);
assert.equal(completed, true);

const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
assert.match(main, /openAutomaticTutorial\("general", \(\) => renderCurrentScreen\(\)\)/);
assert.doesNotMatch(main, /openAutomaticTutorial\("general"[\s\S]{0,300}(?:openLevelSelect|openModeSelect|startLevel)/);

console.log("General onboarding finishes with START on the title screen and includes concise keyboard navigation guidance.");

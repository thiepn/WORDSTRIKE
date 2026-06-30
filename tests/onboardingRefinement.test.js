import assert from "node:assert/strict";
import { ONBOARDING_TUTORIALS, ONBOARDING_VERSIONS } from "../js/onboardingContent.js";
import { onboardingMarkup } from "../js/onboardingView.js";

const general = ONBOARDING_TUTORIALS.general;
assert.equal(ONBOARDING_VERSIONS.general, 2);
assert.equal(general.steps.length, 4);
assert.doesNotMatch(general.steps[1].body, /Type the word shown/i);
assert.equal(general.steps[2].title, "NAVIGATE YOUR WAY");
assert.doesNotMatch(general.steps.map(({ body }) => body).join(" "), /Campaign|Typing Test|Endless|Daily Strike/);

const state = (tutorial, currentStep, signedIn = false) => ({
  tutorialId: tutorial.id,
  title: tutorial.title,
  steps: tutorial.steps,
  currentStep,
  signedIn,
});
const first = onboardingMarkup(state(general, 0));
assert.doesNotMatch(first, /data-onboarding-action="previous"/);
assert.ok(first.indexOf("onboarding-copy") < first.indexOf("onboarding-visual"));
assert.match(first, /onboarding-action-dock/);
const later = onboardingMarkup(state(general, 1));
assert.match(later, /data-onboarding-action="previous"[^>]*>BACK/);
const signedOutFinal = onboardingMarkup(state(general, 3));
assert.match(signedOutFinal, /SIGN IN WITH GOOGLE/);
const signedInFinal = onboardingMarkup(state(general, 3, true));
assert.doesNotMatch(signedInFinal, /SIGN IN WITH GOOGLE/);
const single = onboardingMarkup(state(ONBOARDING_TUTORIALS.leaderboards, 0));
assert.doesNotMatch(single, /data-onboarding-action="previous"/);

console.log("General onboarding v2 is concise, content-first, sign-in-aware, and omits useless Back controls.");

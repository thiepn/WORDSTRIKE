import { getOnboardingTutorial } from "./onboardingContent.js";
import { isTutorialSeen, markTutorialSeen } from "./onboardingStorage.js";

const freezeState = (tutorial, currentStep, source, primaryLabel = null) => Object.freeze({
  tutorialId: tutorial.id,
  version: tutorial.version,
  title: tutorial.title,
  steps: tutorial.steps,
  currentStep,
  source,
  primaryLabel,
});

export function createOnboardingController() {
  let state = null;
  let completionCallback = null;
  const listeners = new Set();
  const publish = () => { for (const listener of listeners) listener(state); return state; };

  const finish = (choice, markSeen) => {
    const closing = state;
    if (!closing) return null;
    if (markSeen && closing.source === "automatic") markTutorialSeen(closing.tutorialId);
    const callback = completionCallback;
    state = null;
    completionCallback = null;
    publish();
    callback?.(choice, closing);
    return closing;
  };

  return Object.freeze({
    getState: () => state,
    shouldOpenAutomatically: (id) => Boolean(getOnboardingTutorial(id)) && !isTutorialSeen(id),
    open(id, { source = "help", onComplete = null, primaryLabel = null } = {}) {
      const tutorial = getOnboardingTutorial(id);
      if (!tutorial || state) return false;
      completionCallback = typeof onComplete === "function" ? onComplete : null;
      state = freezeState(tutorial, 0, source, primaryLabel);
      publish();
      return true;
    },
    next() {
      if (!state) return null;
      if (state.currentStep >= state.steps.length - 1) return finish("primary", true);
      state = freezeState(getOnboardingTutorial(state.tutorialId), state.currentStep + 1, state.source, state.primaryLabel);
      return publish();
    },
    previous() {
      if (!state) return null;
      state = freezeState(getOnboardingTutorial(state.tutorialId), Math.max(0, state.currentStep - 1), state.source, state.primaryLabel);
      return publish();
    },
    first() {
      if (!state) return null;
      state = freezeState(getOnboardingTutorial(state.tutorialId), 0, state.source, state.primaryLabel);
      return publish();
    },
    last() {
      if (!state) return null;
      state = freezeState(getOnboardingTutorial(state.tutorialId), state.steps.length - 1, state.source, state.primaryLabel);
      return publish();
    },
    choose(choice) { return finish(choice, true); },
    skip() { return finish("skip", true); },
    close() { return finish("close", false); },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  });
}

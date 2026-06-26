import { Screens } from "./state.js";

const RESULT_ACTIONS = Object.freeze({
  [Screens.ENDLESS_RESULTS]: Object.freeze({
    selector: ".endless-results-screen",
    actions: Object.freeze(["retry", "modes", "title"]),
  }),
  [Screens.DAILY_RESULTS]: Object.freeze({
    selector: ".daily-results-screen",
    actions: Object.freeze(["retry", "modes", "title"]),
  }),
});

const listenerRoots = new WeakSet();

export function resolveResultClickAction(event, {
  root,
  screen,
  readyAt = 0,
  now = 0,
} = {}) {
  if (!root || !event || (event.button != null && event.button !== 0) || now < readyAt) {
    return null;
  }
  const config = RESULT_ACTIONS[screen];
  const actionElement = event.target?.closest?.("[data-action]");
  if (!config || !actionElement || !root.contains?.(actionElement)) return null;
  if (
    actionElement.disabled === true ||
    actionElement.getAttribute?.("aria-disabled") === "true" ||
    actionElement.closest?.("[hidden]") ||
    actionElement.closest?.('[aria-hidden="true"]')
  ) {
    return null;
  }
  const screenElement = actionElement.closest?.(config.selector);
  if (!screenElement || !root.contains?.(screenElement)) return null;
  const action = actionElement.dataset?.action;
  return config.actions.includes(action) ? action : null;
}

export function attachAppClickListener(root, listener) {
  if (!root?.addEventListener || listenerRoots.has(root)) return false;
  root.addEventListener("click", listener);
  listenerRoots.add(root);
  return true;
}

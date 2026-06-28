import { Screens } from "./state.js";

const RESULT_ACTIONS = Object.freeze({
  [Screens.TITLE]: Object.freeze({
    selector: ".menu-screen",
    actions: Object.freeze(["open-leaderboards"]),
    guardReadyAt: false,
  }),
  [Screens.LEADERBOARDS]: Object.freeze({
    selector: ".leaderboards-screen",
    actions: Object.freeze([
      "leaderboard-select-daily",
      "leaderboard-select-endless",
      "leaderboard-refresh",
      "leaderboard-main-menu",
    ]),
    guardReadyAt: false,
  }),
  [Screens.ENDLESS_RESULTS]: Object.freeze({
    selector: ".endless-results-screen",
    actions: Object.freeze([
      "retry", "modes", "title", "submit-global-score", "retry-global-score",
      "view-endless-leaderboard", "open-global-profile",
    ]),
  }),
  [Screens.DAILY_RESULTS]: Object.freeze({
    selector: ".daily-results-screen",
    actions: Object.freeze([
      "retry", "modes", "title", "submit-global-score", "retry-global-score",
      "view-daily-leaderboard", "open-global-profile",
    ]),
  }),
  [Screens.PROFILE_STATS]: Object.freeze({
    selector: ".global-account",
    actions: Object.freeze([
      "auth-google-sign-in",
      "auth-sign-out",
      "leaderboard-username-check",
      "leaderboard-username-claim",
      "leaderboard-username-start-change",
      "leaderboard-username-save-change",
      "leaderboard-username-cancel-change",
    ]),
    guardReadyAt: false,
  }),
});

const listenerRoots = new WeakSet();

export function resolveAppClickAction(event, {
  root,
  screen,
  readyAt = 0,
  now = 0,
} = {}) {
  if (!root || !event || (event.button != null && event.button !== 0)) {
    return null;
  }
  const config = RESULT_ACTIONS[screen];
  if (!config || (config.guardReadyAt !== false && now < readyAt)) return null;
  const actionElement = event.target?.closest?.("[data-action]");
  if (!actionElement || !root.contains?.(actionElement)) return null;
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

export const resolveResultClickAction = resolveAppClickAction;

export function attachAppClickListener(root, listener) {
  if (!root?.addEventListener || listenerRoots.has(root)) return false;
  root.addEventListener("click", listener);
  listenerRoots.add(root);
  return true;
}

import { isHintSeen, markHintSeen } from "./onboardingStorage.js";

let active = null;

export function dismissContextualHint({ persist = true } = {}) {
  if (!active) return false;
  globalThis.clearTimeout?.(active.timer);
  active.element?.remove?.();
  if (persist) markHintSeen(active.id);
  active = null;
  return true;
}

export function showContextualHint(id, text, {
  placement = "bottom",
  timeoutMs = 3500,
  force = false,
} = {}) {
  if (!force && isHintSeen(id)) return false;
  dismissContextualHint({ persist: false });
  const screen = globalThis.document?.querySelector?.(".screen");
  if (!screen?.append) return false;
  const element = globalThis.document.createElement("div");
  element.className = `contextual-hint contextual-hint-${placement}`;
  element.textContent = text;
  screen.append(element);
  const timer = timeoutMs > 0 ? globalThis.setTimeout?.(() => dismissContextualHint(), timeoutMs) : null;
  active = { id, element, timer };
  return true;
}

export function getActiveContextualHint() {
  return active ? Object.freeze({ id: active.id, text: active.element?.textContent || "" }) : null;
}

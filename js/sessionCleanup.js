import {
  abortSession,
  clearSession,
  hasActiveSession,
} from "./sessionManager.js";

export function cleanupCurrentSession({
  reason = "aborted",
  stopGameplay,
  clearRuntime,
  hidePause,
  clearSessionState = true,
} = {}) {
  stopGameplay?.();
  hidePause?.();
  clearRuntime?.();
  if (hasActiveSession()) abortSession(reason);
  if (clearSessionState) clearSession();
  return true;
}

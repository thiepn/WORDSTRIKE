import { buildSubmissionPayload } from "./leaderboardSubmissionService.js";

export const PENDING_RESULT_STORAGE_KEY = "wordstrike.pending-result-submission.v1";
export const PENDING_RESULT_MAX_AGE_MS = 30 * 60 * 1000;
const MODES = new Set(["campaign", "typing", "endless", "daily"]);

function validIntent(value, now) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.schemaVersion !== 1 || value.source !== "result-google-sign-in") return null;
  if (!MODES.has(value.mode) || !value.immutablePayload || typeof value.immutablePayload !== "object") return null;
  if (value.boardKey !== value.immutablePayload.boardKey || value.sessionId !== value.immutablePayload.sessionId) return null;
  if (!Number.isFinite(value.createdAt) || !Number.isFinite(value.expiresAt)) return null;
  if (value.expiresAt <= now || value.expiresAt - value.createdAt > PENDING_RESULT_MAX_AGE_MS) return null;
  if (value.returnDestination !== "leaderboard") return null;
  return Object.freeze({
    schemaVersion: 1,
    boardKey: value.boardKey,
    sessionId: value.sessionId,
    mode: value.mode,
    immutablePayload: value.immutablePayload,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    source: "result-google-sign-in",
    returnDestination: "leaderboard",
  });
}

export function savePendingResultSubmission(mode, result, {
  storage = globalThis.localStorage,
  now = Date.now(),
} = {}) {
  const immutablePayload = buildSubmissionPayload(mode, result);
  if (!immutablePayload || !storage?.setItem) return null;
  const intent = {
    schemaVersion: 1,
    boardKey: immutablePayload.boardKey,
    sessionId: immutablePayload.sessionId,
    mode,
    immutablePayload,
    createdAt: now,
    expiresAt: now + PENDING_RESULT_MAX_AGE_MS,
    source: "result-google-sign-in",
    returnDestination: "leaderboard",
  };
  try {
    storage.setItem(PENDING_RESULT_STORAGE_KEY, JSON.stringify(intent));
    return validIntent(intent, now);
  } catch {
    return null;
  }
}

export function loadPendingResultSubmission({
  storage = globalThis.localStorage,
  now = Date.now(),
} = {}) {
  if (!storage?.getItem) return null;
  try {
    const raw = storage.getItem(PENDING_RESULT_STORAGE_KEY);
    if (!raw) return null;
    const intent = validIntent(JSON.parse(raw), now);
    if (intent) return intent;
  } catch { /* Remove malformed state below. */ }
  clearPendingResultSubmission(storage);
  return null;
}

export function clearPendingResultSubmission(storage = globalThis.localStorage) {
  try { storage?.removeItem?.(PENDING_RESULT_STORAGE_KEY); return true; } catch { return false; }
}

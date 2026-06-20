import { isModeEnabled, isValidModeId } from "./modes.js";

export const SESSION_SCHEMA_VERSION = 1;

export const SESSION_STATES = Object.freeze({
  IDLE: "idle",
  PREPARING: "preparing",
  BRIEFING: "briefing",
  ACTIVE: "active",
  PAUSED: "paused",
  TRANSITIONING: "transitioning",
  RESULTS: "results",
  ABORTED: "aborted",
  COMPLETED: "completed",
});

const TERMINAL_STATES = new Set([
  SESSION_STATES.ABORTED,
  SESSION_STATES.COMPLETED,
]);

const TRANSITIONS = Object.freeze({
  [SESSION_STATES.PREPARING]: new Set([
    SESSION_STATES.BRIEFING,
    SESSION_STATES.ACTIVE,
    SESSION_STATES.PAUSED,
    SESSION_STATES.ABORTED,
  ]),
  [SESSION_STATES.BRIEFING]: new Set([
    SESSION_STATES.ACTIVE,
    SESSION_STATES.PAUSED,
    SESSION_STATES.ABORTED,
  ]),
  [SESSION_STATES.ACTIVE]: new Set([
    SESSION_STATES.PAUSED,
    SESSION_STATES.TRANSITIONING,
    SESSION_STATES.RESULTS,
    SESSION_STATES.COMPLETED,
    SESSION_STATES.ABORTED,
  ]),
  [SESSION_STATES.PAUSED]: new Set([
    SESSION_STATES.PREPARING,
    SESSION_STATES.BRIEFING,
    SESSION_STATES.ACTIVE,
    SESSION_STATES.TRANSITIONING,
    SESSION_STATES.ABORTED,
  ]),
  [SESSION_STATES.TRANSITIONING]: new Set([
    SESSION_STATES.ACTIVE,
    SESSION_STATES.PAUSED,
    SESSION_STATES.COMPLETED,
    SESSION_STATES.ABORTED,
  ]),
  [SESSION_STATES.RESULTS]: new Set([
    SESSION_STATES.COMPLETED,
    SESSION_STATES.ABORTED,
  ]),
});

let currentSession = null;
let fallbackIdCounter = 0;

const monotonicNow = () => globalThis.performance?.now?.() ?? Date.now();
const epochNow = () => Date.now();

function finiteNonNegative(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function cloneSerializable(value, fallback = {}) {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function createSessionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  fallbackIdCounter += 1;
  return [
    "session",
    Date.now().toString(36),
    fallbackIdCounter.toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

function isTerminal(session = currentSession) {
  return !session || TERMINAL_STATES.has(session.state);
}

function snapshot(session = currentSession) {
  return session ? cloneSerializable(session, null) : null;
}

function closeRunningTimer(session, nowMonotonicMs) {
  if (session.state === SESSION_STATES.ACTIVE && session.activeStartedAtMonotonicMs != null) {
    session.accumulatedActiveMs += Math.max(
      0,
      nowMonotonicMs - session.activeStartedAtMonotonicMs,
    );
    session.activeStartedAtMonotonicMs = null;
  }
  if (session.state === SESSION_STATES.PAUSED && session.pauseStartedAtMonotonicMs != null) {
    session.accumulatedPausedMs += Math.max(
      0,
      nowMonotonicMs - session.pauseStartedAtMonotonicMs,
    );
    session.pauseStartedAtMonotonicMs = null;
  }
}

function enterState(session, nextState, nowMonotonicMs, nowEpochMs) {
  if (nextState === SESSION_STATES.ACTIVE) {
    session.activeStartedAtMonotonicMs = nowMonotonicMs;
    if (session.startedAtEpochMs == null) session.startedAtEpochMs = nowEpochMs;
  }
  if (nextState === SESSION_STATES.PAUSED) {
    session.pauseStartedAtMonotonicMs = nowMonotonicMs;
  }
  if (TERMINAL_STATES.has(nextState)) {
    session.endedAtEpochMs = nowEpochMs;
  }
  session.state = nextState;
}

export function beginSession(config = {}, timing = {}) {
  if (
    !isValidModeId(config.modeId) ||
    !isModeEnabled(config.modeId) ||
    (currentSession && !isTerminal(currentSession))
  ) {
    return null;
  }
  const nowMonotonicMs = finiteNonNegative(timing.monotonicMs, monotonicNow());
  const nowEpochMs = finiteNonNegative(timing.epochMs, epochNow());
  currentSession = {
    id: createSessionId(),
    schemaVersion: SESSION_SCHEMA_VERSION,
    modeId: config.modeId,
    variantId: typeof config.variantId === "string" ? config.variantId : null,
    source: typeof config.source === "string" ? config.source : null,
    developerMode: config.developerMode === true,
    seed: Number.isFinite(config.seed) ? config.seed : null,
    state: SESSION_STATES.PREPARING,
    createdAtEpochMs: nowEpochMs,
    startedAtEpochMs: null,
    endedAtEpochMs: null,
    createdAtMonotonicMs: nowMonotonicMs,
    activeStartedAtMonotonicMs: null,
    accumulatedActiveMs: 0,
    accumulatedPausedMs: 0,
    pauseStartedAtMonotonicMs: null,
    resumeState: null,
    config: cloneSerializable(config.config),
    runtimeData: cloneSerializable(config.runtimeData),
    abortReason: null,
    result: null,
    resultFinalized: false,
    resultPersisted: false,
  };
  return snapshot();
}

export function setSessionState(nextState, timing = {}) {
  if (
    !currentSession ||
    isTerminal(currentSession) ||
    !Object.values(SESSION_STATES).includes(nextState) ||
    nextState === currentSession.state ||
    !TRANSITIONS[currentSession.state]?.has(nextState)
  ) {
    return false;
  }
  const nowMonotonicMs = finiteNonNegative(timing.monotonicMs, monotonicNow());
  const nowEpochMs = finiteNonNegative(timing.epochMs, epochNow());
  closeRunningTimer(currentSession, nowMonotonicMs);
  enterState(currentSession, nextState, nowMonotonicMs, nowEpochMs);
  return true;
}

export function markSessionActive(timing = {}) {
  return setSessionState(SESSION_STATES.ACTIVE, timing);
}

export function pauseSession(timing = {}) {
  if (
    !currentSession ||
    ![
      SESSION_STATES.ACTIVE,
      SESSION_STATES.PREPARING,
      SESSION_STATES.BRIEFING,
      SESSION_STATES.TRANSITIONING,
    ].includes(currentSession.state)
  ) {
    return false;
  }
  currentSession.resumeState = currentSession.state;
  return setSessionState(SESSION_STATES.PAUSED, timing);
}

export function resumeSession(timing = {}) {
  if (!currentSession || currentSession.state !== SESSION_STATES.PAUSED) return false;
  const nextState = currentSession.resumeState || SESSION_STATES.ACTIVE;
  const resumed = setSessionState(nextState, timing);
  if (resumed) currentSession.resumeState = null;
  return resumed;
}

export function completeSession(resultData, timing = {}) {
  if (
    !currentSession ||
    isTerminal(currentSession) ||
    currentSession.resultFinalized ||
    !TRANSITIONS[currentSession.state]?.has(SESSION_STATES.COMPLETED)
  ) {
    return null;
  }
  const nowMonotonicMs = finiteNonNegative(timing.monotonicMs, monotonicNow());
  const nowEpochMs = finiteNonNegative(timing.epochMs, epochNow());
  closeRunningTimer(currentSession, nowMonotonicMs);
  currentSession.result = cloneSerializable(resultData, null);
  currentSession.resultFinalized = true;
  enterState(
    currentSession,
    SESSION_STATES.COMPLETED,
    nowMonotonicMs,
    nowEpochMs,
  );
  return snapshot();
}

export function abortSession(reason = "aborted", timing = {}) {
  if (!currentSession || isTerminal(currentSession) || currentSession.resultFinalized) {
    return null;
  }
  const nowMonotonicMs = finiteNonNegative(timing.monotonicMs, monotonicNow());
  const nowEpochMs = finiteNonNegative(timing.epochMs, epochNow());
  closeRunningTimer(currentSession, nowMonotonicMs);
  currentSession.abortReason = typeof reason === "string" ? reason : "aborted";
  enterState(currentSession, SESSION_STATES.ABORTED, nowMonotonicMs, nowEpochMs);
  return snapshot();
}

export function markSessionResultPersisted(sessionId) {
  if (
    !currentSession ||
    currentSession.id !== sessionId ||
    !currentSession.resultFinalized ||
    currentSession.resultPersisted
  ) {
    return false;
  }
  currentSession.resultPersisted = true;
  return true;
}

export function getSessionTiming(timing = {}) {
  if (!currentSession) {
    return { activeDurationMs: 0, pausedDurationMs: 0 };
  }
  const nowMonotonicMs = finiteNonNegative(timing.monotonicMs, monotonicNow());
  const activeCurrent = (
    currentSession.state === SESSION_STATES.ACTIVE &&
    currentSession.activeStartedAtMonotonicMs != null
  )
    ? Math.max(0, nowMonotonicMs - currentSession.activeStartedAtMonotonicMs)
    : 0;
  const pausedCurrent = (
    currentSession.state === SESSION_STATES.PAUSED &&
    currentSession.pauseStartedAtMonotonicMs != null
  )
    ? Math.max(0, nowMonotonicMs - currentSession.pauseStartedAtMonotonicMs)
    : 0;
  return {
    activeDurationMs: currentSession.accumulatedActiveMs + activeCurrent,
    pausedDurationMs: currentSession.accumulatedPausedMs + pausedCurrent,
  };
}

export function getCurrentSession() {
  return snapshot();
}

export function hasActiveSession() {
  return Boolean(currentSession && !isTerminal(currentSession));
}

export function clearSession() {
  currentSession = null;
  return true;
}

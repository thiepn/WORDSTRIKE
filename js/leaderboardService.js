import { getSupabaseClient } from "./supabaseClient.js";
import { getUtcDateKey } from "./dailyDate.js";

export const LEADERBOARD_BOARDS = Object.freeze({
  DAILY: "daily-strike-v1",
  ENDLESS: "endless-v1",
});

const VALID_BOARDS = Object.freeze(Object.values(LEADERBOARD_BOARDS));
const CACHE_TTL_MS = 30000;

const safeEntry = (entry) => Object.freeze({
  rank: Math.max(1, Number(entry?.rank) || 1),
  username: String(entry?.username || ""),
  stage: entry?.stage == null ? null : Math.max(0, Number(entry.stage) || 0),
  score: Math.max(0, Number(entry?.score) || 0),
  accuracy: Math.max(0, Math.min(100, Number(entry?.accuracy) || 0)),
  durationMs: entry?.durationMs == null ? null : Math.max(0, Number(entry.durationMs) || 0),
  completed: entry?.completed === true,
  submittedAt: String(entry?.submittedAt || ""),
});

const safeViewer = (viewer) => viewer?.entry ? Object.freeze({
  rank: Math.max(1, Number(viewer.rank) || 1),
  entry: safeEntry({ ...viewer.entry, rank: viewer.rank }),
}) : null;

const makeState = ({
  status = "idle",
  selectedBoard = LEADERBOARD_BOARDS.DAILY,
  board = null,
  entries = [],
  viewer = null,
  error = null,
  lastUpdatedAt = null,
} = {}) => Object.freeze({
  status,
  selectedBoard: VALID_BOARDS.includes(selectedBoard) ? selectedBoard : LEADERBOARD_BOARDS.DAILY,
  board: board ? Object.freeze({
    boardKey: String(board.boardKey || selectedBoard),
    displayName: String(board.displayName || ""),
    rulesVersion: Math.max(1, Number(board.rulesVersion) || 1),
    challengeDate: board.challengeDate ?? null,
  }) : null,
  entries: Object.freeze((Array.isArray(entries) ? entries : []).slice(0, 100).map(safeEntry)),
  viewer: safeViewer(viewer),
  error: error ? Object.freeze({ message: "Unable to load global rankings." }) : null,
  lastUpdatedAt: Number.isFinite(Number(lastUpdatedAt)) ? Number(lastUpdatedAt) : null,
});

async function functionErrorPayload(error) {
  try {
    if (typeof error?.context?.json === "function") return await error.context.json();
  } catch {
    // Use the safe generic error below.
  }
  return null;
}

export function createLeaderboardService({
  getClient = getSupabaseClient,
  getDateKey = getUtcDateKey,
  now = () => Date.now(),
  isOnline = () => globalThis.navigator?.onLine !== false,
} = {}) {
  let state = makeState();
  let requestSequence = 0;
  const listeners = new Set();
  const cache = new Map();
  const inFlight = new Map();

  const publish = (next) => {
    state = makeState(next);
    for (const listener of listeners) listener(state);
    return state;
  };

  const requestKey = (boardKey) => boardKey === LEADERBOARD_BOARDS.DAILY
    ? `${boardKey}:${getDateKey()}`
    : boardKey;

  const load = (boardKey, { force = false } = {}) => {
    if (!VALID_BOARDS.includes(boardKey)) return Promise.resolve(state);
    const key = requestKey(boardKey);
    if (inFlight.has(key)) return inFlight.get(key);
    const cached = cache.get(key);
    if (!force && cached && now() - cached.cachedAt < CACHE_TTL_MS) {
      return Promise.resolve(publish({ ...cached.state, selectedBoard: boardKey }));
    }
    const client = getClient();
    if (!isOnline() || !client?.functions?.invoke) {
      return Promise.resolve(publish({ status: "offline", selectedBoard: boardKey }));
    }

    const requestId = ++requestSequence;
    const refreshing = state.selectedBoard === boardKey && state.entries.length > 0;
    publish({
      ...state,
      status: refreshing ? "refreshing" : "loading",
      selectedBoard: boardKey,
      error: null,
    });
    const body = boardKey === LEADERBOARD_BOARDS.DAILY
      ? { boardKey, challengeDate: getDateKey() }
      : { boardKey };
    const promise = (async () => {
      try {
        const { data, error } = await client.functions.invoke("get-leaderboard", { body });
        let payload = data;
        if (!payload?.ok && error) payload = await functionErrorPayload(error);
        if (requestId !== requestSequence || state.selectedBoard !== boardKey) return state;
        if (!payload?.ok) {
          return publish({ status: "error", selectedBoard: boardKey, error: true });
        }
        const next = makeState({
          status: payload.data?.entries?.length ? "ready" : "empty",
          selectedBoard: boardKey,
          board: payload.data?.board,
          entries: payload.data?.entries,
          viewer: payload.data?.viewer,
          lastUpdatedAt: now(),
        });
        cache.set(key, { state: next, cachedAt: now() });
        return publish(next);
      } catch {
        if (requestId !== requestSequence || state.selectedBoard !== boardKey) return state;
        return publish({ status: isOnline() ? "error" : "offline", selectedBoard: boardKey, error: true });
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, promise);
    return promise;
  };

  return Object.freeze({
    initializeLeaderboards(boardKey = LEADERBOARD_BOARDS.DAILY) {
      return load(boardKey);
    },
    getLeaderboardState: () => state,
    subscribeToLeaderboards(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    selectLeaderboardBoard(boardKey) {
      if (!VALID_BOARDS.includes(boardKey)) return Promise.resolve(state);
      if (
        state.selectedBoard === boardKey &&
        ["loading", "refreshing", "ready", "empty"].includes(state.status)
      ) return inFlight.get(requestKey(boardKey)) || Promise.resolve(state);
      requestSequence += 1;
      return load(boardKey);
    },
    refreshLeaderboard() {
      return load(state.selectedBoard, { force: true });
    },
    invalidateLeaderboardBoard(boardKey) {
      if (!VALID_BOARDS.includes(boardKey)) return false;
      cache.delete(requestKey(boardKey));
      return true;
    },
    resetLeaderboardState() {
      requestSequence += 1;
      inFlight.clear();
      cache.clear();
      return publish(makeState());
    },
  });
}

const leaderboardService = createLeaderboardService();

export const initializeLeaderboards = leaderboardService.initializeLeaderboards;
export const getLeaderboardState = leaderboardService.getLeaderboardState;
export const subscribeToLeaderboards = leaderboardService.subscribeToLeaderboards;
export const selectLeaderboardBoard = leaderboardService.selectLeaderboardBoard;
export const refreshLeaderboard = leaderboardService.refreshLeaderboard;
export const invalidateLeaderboardBoard = leaderboardService.invalidateLeaderboardBoard;
export const resetLeaderboardState = leaderboardService.resetLeaderboardState;

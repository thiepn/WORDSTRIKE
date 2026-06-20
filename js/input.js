import { calculateWordScore } from "./scoring.js";
import {
  flashBossWrong,
  flashCandidateWrong,
  flashWrong,
  removeWordElement,
  renderBossPhrase,
  updateWordElement,
} from "./renderer.js";

const IGNORED_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape", "Enter",
]);

function distanceToCore(word, game) {
  return Math.hypot(word.x - game.coreX, word.y - game.coreY);
}

function ensureTargetingState(game) {
  if (!game.targetingState) {
    game.targetingState = {
      mode: game.activeTargetId == null ? "idle" : "locked",
      prefix: "",
      candidateIds: [],
      activeTargetId: game.activeTargetId ?? null,
      startedAtActiveMs: null,
    };
  }
  if (
    game.targetingState.mode === "idle" &&
    game.activeTargetId != null
  ) {
    game.targetingState.mode = "locked";
    game.targetingState.activeTargetId = game.activeTargetId;
  }
  return game.targetingState;
}

export function resetTargetingState(game) {
  game.activeTargetId = null;
  game.targetingState = {
    mode: "idle",
    prefix: "",
    candidateIds: [],
    activeTargetId: null,
    startedAtActiveMs: null,
  };
}

function renderTargetingState(game) {
  const state = ensureTargetingState(game);
  const candidates = new Set(state.candidateIds);
  for (const word of game.words) {
    updateWordElement(
      word,
      state.mode === "locked" && state.activeTargetId === word.id,
      {
        candidate: state.mode === "ambiguous" && candidates.has(word.id),
        prefixLength: state.prefix.length,
      },
    );
  }
}

function eligibleWords(game) {
  return game.words.filter((word) => (
    word &&
    typeof word.text === "string" &&
    !word.coreArrivalProcessed
  ));
}

function lockTarget(game, target, prefix, startedAtActiveMs) {
  const state = ensureTargetingState(game);
  state.mode = "locked";
  state.prefix = prefix;
  state.candidateIds = [];
  state.activeTargetId = target.id;
  state.startedAtActiveMs = startedAtActiveMs;
  game.activeTargetId = target.id;
  target.typedIndex = prefix.length;
  target.startedAt = startedAtActiveMs;
  renderTargetingState(game);
  return target;
}

export function reconcileTargetingState(game) {
  const state = ensureTargetingState(game);
  if (state.mode === "locked") {
    const target = eligibleWords(game).find((word) => word.id === state.activeTargetId);
    if (!target) resetTargetingState(game);
    return target || null;
  }
  if (state.mode !== "ambiguous") return null;
  const candidates = eligibleWords(game).filter(
    (word) => state.candidateIds.includes(word.id) && word.text.startsWith(state.prefix),
  );
  state.candidateIds = candidates.map((word) => word.id);
  if (candidates.length === 1) {
    return lockTarget(
      game,
      candidates[0],
      state.prefix,
      state.startedAtActiveMs,
    );
  }
  if (!candidates.length) resetTargetingState(game);
  else renderTargetingState(game);
  return null;
}

function completeTarget(game, target, settings, onWordCompleted) {
  const actualTimeSeconds = Math.max(
    (game.elapsedMs - target.startedAt) / 1000,
    0.05,
  );
  game.score += calculateWordScore(target.text.length, actualTimeSeconds, game.combo);
  game.combo += 1;
  game.completedWordCount = (game.completedWordCount || 0) + 1;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  game.words = game.words.filter((word) => word.id !== target.id);
  resetTargetingState(game);
  removeWordElement(target, true, settings.particles);
  onWordCompleted?.(game, target);
}

export function handleGameplayKey(
  event,
  game,
  settings,
  onWordCompleted,
) {
  if (game.phase !== "ACTIVE" || game.ended) return false;
  if (IGNORED_KEYS.has(event.key) || event.key.length !== 1) return false;
  const key = event.key.toLowerCase();
  const state = ensureTargetingState(game);
  if (!/^[a-z]$/.test(key)) {
    return false;
  }
  event.preventDefault();
  game.totalKeystrokes += 1;

  if (state.mode === "ambiguous") {
    const nextPrefix = state.prefix + key;
    const candidates = eligibleWords(game).filter(
      (word) => state.candidateIds.includes(word.id) && word.text.startsWith(nextPrefix),
    );
    if (!candidates.length) {
      if (settings.strictMode) game.combo = 0;
      flashCandidateWrong(state.candidateIds);
      return true;
    }
    game.correctKeystrokes += 1;
    game.correctCharacters += 1;
    const exact = candidates.filter((word) => word.text.length === nextPrefix.length);
    if (candidates.length === 1 || exact.length === 1) {
      const target = exact[0] || candidates[0];
      lockTarget(game, target, nextPrefix, state.startedAtActiveMs);
      if (target.typedIndex >= target.text.length) {
        completeTarget(game, target, settings, onWordCompleted);
      }
      return true;
    }
    state.prefix = nextPrefix;
    state.candidateIds = candidates.map((word) => word.id);
    renderTargetingState(game);
    return true;
  }

  if (state.mode === "idle") {
    const candidates = eligibleWords(game)
      .filter((word) => word.text.startsWith(key))
      .sort((a, b) => distanceToCore(a, game) - distanceToCore(b, game));
    if (!candidates.length) {
      if (settings.strictMode) game.combo = 0;
      return true;
    }
    game.correctKeystrokes += 1;
    game.correctCharacters += 1;
    if (candidates.length > 1) {
      state.mode = "ambiguous";
      state.prefix = key;
      state.candidateIds = candidates.map((word) => word.id);
      state.activeTargetId = null;
      state.startedAtActiveMs = game.elapsedMs;
      game.activeTargetId = null;
      renderTargetingState(game);
      return true;
    }
    const target = lockTarget(game, candidates[0], key, game.elapsedMs);
    if (target.typedIndex >= target.text.length) {
      completeTarget(game, target, settings, onWordCompleted);
    }
    return true;
  }

  const target = eligibleWords(game).find((word) => word.id === state.activeTargetId);
  if (!target) {
    resetTargetingState(game);
    if (settings.strictMode) game.combo = 0;
    return true;
  }
  if (target.text[target.typedIndex] !== key) {
    if (settings.strictMode) game.combo = 0;
    flashWrong(target.id);
    return true;
  }
  target.typedIndex += 1;
  game.correctKeystrokes += 1;
  game.correctCharacters += 1;
  updateWordElement(target, true);

  if (target.typedIndex >= target.text.length) {
    completeTarget(game, target, settings, onWordCompleted);
  }
  return true;
}

export function handleBossKey(event, game, settings, onPhraseCompleted) {
  if (game.ended) return false;
  if (game.phase !== "ACTIVE") {
    if (event.key === " ") event.preventDefault();
    return false;
  }
  if (IGNORED_KEYS.has(event.key) || event.key.length !== 1) return false;
  const key = event.key.toLowerCase();
  if (!/^[a-z ]$/.test(key)) return false;
  event.preventDefault();
  game.totalKeystrokes += 1;

  const expected = game.currentPhrase[game.phraseCharIndex];
  if (key !== expected) {
    if (settings.strictMode) game.combo = 0;
    flashBossWrong();
    return true;
  }

  game.phraseCharIndex += 1;
  game.correctKeystrokes += 1;
  game.correctCharacters += 1;

  const completedPhrase = game.phraseCharIndex >= game.currentPhrase.length;
  const completedWord = key === " " || completedPhrase;
  if (completedWord) {
    const boundary = key === " " ? game.phraseCharIndex - 1 : game.phraseCharIndex;
    const wordLength = game.currentPhrase.slice(game.wordStartIndex, boundary).trim().length;
    if (wordLength > 0) {
      const actualTimeSeconds = Math.max((game.elapsedMs - game.wordStartElapsedMs) / 1000, 0.05);
      game.score += calculateWordScore(wordLength, actualTimeSeconds, game.combo);
      game.combo += 1;
      game.completedWordCount = (game.completedWordCount || 0) + 1;
      game.maxCombo = Math.max(game.maxCombo, game.combo);
    }
    game.wordStartIndex = game.phraseCharIndex;
    game.wordStartElapsedMs = game.elapsedMs;
  }

  renderBossPhrase(game);
  if (completedPhrase) onPhraseCompleted?.(game);
  return true;
}

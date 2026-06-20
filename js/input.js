import { calculateWordScore } from "./scoring.js";
import {
  flashBossWrong,
  flashCandidateWrong,
  flashWordCorruption,
  flashWrong,
  removeWordElement,
  renderBossPhrase,
  updateWordElement,
} from "./renderer.js";
import {
  BLACKOUT_ID,
  CHAIN_BREAK_CAUSES,
  hasChainModifier,
  markChainBroken,
  NO_BACKSPACE_ID,
} from "./modifiers.js";

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
    !word.abandoned &&
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

function abandonTarget(game, target) {
  const remainingCharacters = Math.max(0, target.text.length - target.typedIndex);
  if (!target.missedCharactersRecorded) {
    target.missedCharactersRecorded = true;
    game.missedCharacters += remainingCharacters;
    game.abandonedCharacters += remainingCharacters;
  }
  target.abandoned = true;
  target.abandonedAt = game.elapsedMs;
  game.abandonedWordCount += 1;
  resetTargetingState(game);
  updateWordElement(target, false);
  flashWordCorruption(target.id);
}

function breakChainFromInput(
  game,
  cause,
  failedWordId,
  onChainBreak,
) {
  if (!markChainBroken(game, cause, failedWordId)) return false;
  resetTargetingState(game);
  onChainBreak?.(game);
  return true;
}

function completeTarget(game, target, settings, onWordCompleted) {
  if (
    game.config.modifiers?.includes(BLACKOUT_ID) &&
    target.blackoutHidden &&
    !target.blackoutCompletedCounted
  ) {
    target.blackoutCompletedCounted = true;
    game.blackoutStats.hiddenWordsCompleted += 1;
  }
  const actualTimeSeconds = Math.max(
    (game.elapsedMs - target.startedAt) / 1000,
    0.05,
  );
  game.score += calculateWordScore(target.text.length, actualTimeSeconds, game.combo);
  game.combo += 1;
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
  onChainBreak,
) {
  const chain = hasChainModifier(game.config);
  if (
    event.key === "Backspace" &&
    (game.config.modifiers?.includes(NO_BACKSPACE_ID) || chain)
  ) {
    event.preventDefault();
    return true;
  }
  if (game.phase !== "ACTIVE" || game.ended || game.failureReason) return false;
  if (IGNORED_KEYS.has(event.key) || event.key.length !== 1) return false;
  const key = event.key.toLowerCase();
  const noBackspace = game.config.modifiers?.includes(NO_BACKSPACE_ID);
  const state = ensureTargetingState(game);
  if (!/^[a-z]$/.test(key)) {
    if (chain) {
      event.preventDefault();
      game.totalKeystrokes += 1;
      const cause = state.mode === "ambiguous"
        ? CHAIN_BREAK_CAUSES.WRONG_KEY_AMBIGUOUS
        : state.mode === "locked"
          ? CHAIN_BREAK_CAUSES.WRONG_KEY_LOCKED
          : CHAIN_BREAK_CAUSES.WRONG_KEY_IDLE;
      breakChainFromInput(
        game,
        cause,
        state.activeTargetId,
        onChainBreak,
      );
      return true;
    }
    if (!noBackspace) return false;
    event.preventDefault();
    game.totalKeystrokes += 1;
    if (settings.strictMode) game.combo = 0;
    if (state.mode === "locked") {
      const activeTarget = eligibleWords(game).find(
        (word) => word.id === state.activeTargetId,
      );
      if (activeTarget) abandonTarget(game, activeTarget);
    } else if (state.mode === "ambiguous") {
      flashCandidateWrong(state.candidateIds);
    }
    return true;
  }
  event.preventDefault();
  game.totalKeystrokes += 1;

  if (state.mode === "ambiguous") {
    const nextPrefix = state.prefix + key;
    const candidates = eligibleWords(game).filter(
      (word) => state.candidateIds.includes(word.id) && word.text.startsWith(nextPrefix),
    );
    if (!candidates.length) {
      if (chain) {
        breakChainFromInput(
          game,
          CHAIN_BREAK_CAUSES.WRONG_KEY_AMBIGUOUS,
          null,
          onChainBreak,
        );
        return true;
      }
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
      if (chain) {
        breakChainFromInput(
          game,
          CHAIN_BREAK_CAUSES.WRONG_KEY_IDLE,
          null,
          onChainBreak,
        );
        return true;
      }
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
    if (chain) {
      breakChainFromInput(
        game,
        CHAIN_BREAK_CAUSES.WRONG_KEY_LOCKED,
        target.id,
        onChainBreak,
      );
      return true;
    }
    if (settings.strictMode) game.combo = 0;
    if (noBackspace) abandonTarget(game, target);
    else flashWrong(target.id);
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
      game.maxCombo = Math.max(game.maxCombo, game.combo);
    }
    game.wordStartIndex = game.phraseCharIndex;
    game.wordStartElapsedMs = game.elapsedMs;
  }

  renderBossPhrase(game);
  if (completedPhrase) onPhraseCompleted?.(game);
  return true;
}

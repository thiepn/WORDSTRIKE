import { calculateWordScore } from "./scoring.js";
import {
  flashBossWrong,
  flashWordCorruption,
  flashWrong,
  removeWordElement,
  renderBossPhrase,
  updateWordElement,
} from "./renderer.js";
import { NO_BACKSPACE_ID } from "./modifiers.js";

const IGNORED_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape", "Enter",
]);

function distanceToCore(word, game) {
  return Math.hypot(word.x - game.coreX, word.y - game.coreY);
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
  game.activeTargetId = null;
  updateWordElement(target, false);
  flashWordCorruption(target.id);
}

export function handleGameplayKey(event, game, settings, onWordCompleted) {
  if (
    event.key === "Backspace" &&
    game.config.modifiers?.includes(NO_BACKSPACE_ID)
  ) {
    event.preventDefault();
    return true;
  }
  if (game.phase !== "ACTIVE" || game.ended) return false;
  if (IGNORED_KEYS.has(event.key) || event.key.length !== 1) return false;
  const key = event.key.toLowerCase();
  const noBackspace = game.config.modifiers?.includes(NO_BACKSPACE_ID);
  if (!/^[a-z]$/.test(key)) {
    if (!noBackspace) return false;
    event.preventDefault();
    game.totalKeystrokes += 1;
    const activeTarget = game.words.find(
      (word) => word.id === game.activeTargetId && !word.abandoned,
    );
    if (settings.strictMode) game.combo = 0;
    if (activeTarget) abandonTarget(game, activeTarget);
    return true;
  }
  event.preventDefault();
  game.totalKeystrokes += 1;

  let target = game.words.find(
    (word) => word.id === game.activeTargetId && !word.abandoned,
  );
  if (!target) game.activeTargetId = null;
  if (!target) {
    const candidates = game.words
      .filter((word) => !word.abandoned && word.text[word.typedIndex] === key)
      .sort((a, b) => distanceToCore(a, game) - distanceToCore(b, game));
    target = candidates[0];
    if (target) {
      game.activeTargetId = target.id;
      target.startedAt = game.elapsedMs;
    }
  }

  if (!target || target.text[target.typedIndex] !== key) {
    if (settings.strictMode) game.combo = 0;
    if (
      target &&
      !target.abandoned &&
      noBackspace
    ) {
      abandonTarget(game, target);
    } else if (target) {
      flashWrong(target.id);
    }
    return true;
  }

  target.typedIndex += 1;
  game.correctKeystrokes += 1;
  game.correctCharacters += 1;
  updateWordElement(target, true);

  if (target.typedIndex >= target.text.length) {
    const actualTimeSeconds = Math.max((game.elapsedMs - target.startedAt) / 1000, 0.05);
    game.score += calculateWordScore(target.text.length, actualTimeSeconds, game.combo);
    game.combo += 1;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    game.activeTargetId = null;
    game.words = game.words.filter((word) => word.id !== target.id);
    removeWordElement(target, true, settings.particles);
    onWordCompleted?.(game, target);
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

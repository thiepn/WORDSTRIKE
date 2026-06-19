import { calculateWordScore } from "./scoring.js";
import { flashWrong, removeWordElement, updateWordElement } from "./renderer.js";

const IGNORED_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape", "Enter",
]);

function distanceToCore(word, game) {
  return Math.hypot(word.x - game.coreX, word.y - game.coreY);
}

export function handleGameplayKey(event, game, settings, onWordCompleted) {
  if (IGNORED_KEYS.has(event.key) || event.key.length !== 1) return false;
  const key = event.key.toLowerCase();
  if (!/^[a-z]$/.test(key)) return false;
  event.preventDefault();
  game.totalKeystrokes += 1;

  let target = game.words.find((word) => word.id === game.activeTargetId);
  if (!target) {
    const candidates = game.words
      .filter((word) => word.text[word.typedIndex] === key)
      .sort((a, b) => distanceToCore(a, game) - distanceToCore(b, game));
    target = candidates[0];
    if (target) {
      game.activeTargetId = target.id;
      target.startedAt = game.elapsedMs;
    }
  }

  if (!target || target.text[target.typedIndex] !== key) {
    if (settings.strictMode) game.combo = 0;
    if (target) flashWrong(target.id);
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

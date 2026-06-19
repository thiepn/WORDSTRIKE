export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getWordTierForLevel(n) {
  if (n < 15) return 1;
  if (n < 35) return 2;
  if (n < 60) return 3;
  if (n < 85) return 4;
  return 5;
}

export function generateLevel(n) {
  const minWordLength = clamp(3 + Math.floor(n / 20), 3, 7);
  return {
    isBoss: n % 10 === 0,
    wordCount: clamp(8 + Math.floor(n / 4), 8, 30),
    minWordLength,
    maxWordLength: clamp(minWordLength + 2 + Math.floor(n / 40), 5, 11),
    spawnIntervalMs: clamp(1600 - n * 4, 350, 1600),
    wordSpeedPxPerSec: clamp(50 + n * 0.4, 50, 200),
    maxSimultaneousWords: clamp(3 + Math.floor(n / 15), 3, 10),
    lives: 3,
    targetWPM: clamp(30 + n * 0.05, 30, 90),
    modifiers: [],
    wordTier: getWordTierForLevel(n),
    world: Math.floor((n - 1) / 100),
  };
}

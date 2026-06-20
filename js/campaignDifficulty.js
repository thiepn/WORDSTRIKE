export const CAMPAIGN_DIFFICULTY_ANCHORS = Object.freeze([
  Object.freeze({ level: 1, legacyLevel: 1 }),
  Object.freeze({ level: 3, legacyLevel: 4 }),
  Object.freeze({ level: 5, legacyLevel: 8 }),
  Object.freeze({ level: 6, legacyLevel: 12 }),
  Object.freeze({ level: 8, legacyLevel: 18 }),
  Object.freeze({ level: 9, legacyLevel: 23 }),
  Object.freeze({ level: 11, legacyLevel: 30 }),
  Object.freeze({ level: 15, legacyLevel: 35 }),
  Object.freeze({ level: 20, legacyLevel: 40 }),
  Object.freeze({ level: 30, legacyLevel: 50 }),
  Object.freeze({ level: 40, legacyLevel: 58 }),
  Object.freeze({ level: 50, legacyLevel: 65 }),
  Object.freeze({ level: 60, legacyLevel: 70 }),
  Object.freeze({ level: 70, legacyLevel: 76 }),
  Object.freeze({ level: 80, legacyLevel: 84 }),
  Object.freeze({ level: 90, legacyLevel: 92 }),
  Object.freeze({ level: 99, legacyLevel: 100 }),
]);

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function getCampaignDifficultyLevel(actualLevel) {
  const numericLevel = Number(actualLevel);
  if (!Number.isFinite(numericLevel)) return 1;
  if (numericLevel <= 1) return 1;
  if (numericLevel >= 99) return 100;

  for (let index = 1; index < CAMPAIGN_DIFFICULTY_ANCHORS.length; index += 1) {
    const upper = CAMPAIGN_DIFFICULTY_ANCHORS[index];
    if (numericLevel > upper.level) continue;
    const lower = CAMPAIGN_DIFFICULTY_ANCHORS[index - 1];
    const progress = (numericLevel - lower.level) / (upper.level - lower.level);
    return lower.legacyLevel
      + progress * (upper.legacyLevel - lower.legacyLevel);
  }

  return 100;
}

export function getLegacyCampaignWordTier(level) {
  if (level < 15) return 1;
  if (level < 35) return 2;
  if (level < 60) return 3;
  if (level < 85) return 4;
  return 5;
}

export function getLegacyCampaignPressureProfile(level) {
  const safeLevel = Number.isFinite(Number(level)) ? Number(level) : 1;
  const minWordLength = clamp(3 + Math.floor(safeLevel / 20), 3, 7);
  const maxWordLength = clamp(
    minWordLength + 2 + Math.floor(safeLevel / 40),
    5,
    11,
  );
  return Object.freeze({
    minWordLength,
    maxWordLength,
    targetAverageWordLength: (minWordLength + maxWordLength) / 2,
    spawnIntervalMs: clamp(1600 - safeLevel * 4, 350, 1600),
    wordSpeedPxPerSec: clamp(50 + safeLevel * 0.4, 50, 200),
    maxSimultaneousWords: clamp(3 + Math.floor(safeLevel / 15), 3, 10),
    targetWPM: clamp(30 + safeLevel * 0.05, 30, 90),
    wordTier: getLegacyCampaignWordTier(safeLevel),
  });
}

export function getLegacyCampaignWordCount(actualLevel) {
  const safeLevel = Number.isFinite(Number(actualLevel)) ? Number(actualLevel) : 1;
  return clamp(8 + Math.floor(safeLevel / 4), 8, 30);
}

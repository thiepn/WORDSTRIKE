import {
  calculateBossTiming as calculateDedicatedBossTiming,
  getBossDifficultyProfile,
} from "./bossGenerator.js";
import {
  getCampaignDifficultyLevel,
  getLegacyCampaignPressureProfile,
  getLegacyCampaignWordCount,
  getLegacyCampaignWordTier,
} from "./campaignDifficulty.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getWordTierForLevel(n) {
  return getLegacyCampaignWordTier(n);
}

export function generateLegacyLevel(n) {
  const pressure = getLegacyCampaignPressureProfile(n);
  return {
    isBoss: n % 10 === 0,
    wordCount: getLegacyCampaignWordCount(n),
    ...pressure,
    lives: 3,
    world: Math.floor((n - 1) / 100),
  };
}

export function generateLevel(n) {
  const virtualDifficultyLevel = getCampaignDifficultyLevel(n);
  const pressure = getLegacyCampaignPressureProfile(virtualDifficultyLevel);
  return {
    isBoss: n % 10 === 0,
    actualLevel: n,
    virtualDifficultyLevel,
    wordCount: getLegacyCampaignWordCount(n),
    ...pressure,
    lives: 3,
    world: Math.floor((n - 1) / 100),
  };
}

export function generateBossLevel(n) {
  const profile = getBossDifficultyProfile(n);
  if (!profile) return null;
  return {
    ...profile,
    phraseCount: profile.segmentCount,
    wordsPerPhrase: profile.wordsPerSegment,
    wordTier: profile.bossIndex,
    world: Math.floor((n - 1) / 100),
  };
}

export function calculateBossTiming(level, selectedSegments) {
  return calculateDedicatedBossTiming(level, selectedSegments);
}

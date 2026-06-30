import { getLegacyCampaignPressureProfile } from "./campaignDifficulty.js";

export const DAILY_CHALLENGE_VERSION = 1;
export const DAILY_WORDS_PER_WAVE = 20;
export const DAILY_TOTAL_WORDS = 60;
export const DAILY_STARTING_INTEGRITY = 3;
export const DAILY_SPAWN_PAUSE_MS = 1000;
export const DAILY_WAVE_BANNER_MS = 1250;
export const DAILY_COLLISION_IMMUNITY_MS = 350;

const DEFINITIONS = [
  {
    wave: 1,
    legacyLevel: 30,
    minWordLength: 3,
    maxWordLength: 7,
    targetAverageWordLength: 5,
    sourceCounts: { common: 13, lowMid: 7 },
  },
  {
    wave: 2,
    legacyLevel: 45,
    minWordLength: 4,
    maxWordLength: 9,
    targetAverageWordLength: 6,
    sourceCounts: { common: 7, mid: 11, difficult: 2 },
  },
  {
    wave: 3,
    legacyLevel: 60,
    minWordLength: 5,
    maxWordLength: 11,
    targetAverageWordLength: 7,
    sourceCounts: { common: 3, midHigh: 12, difficult: 5 },
  },
];

export const DAILY_WAVE_PROFILES = Object.freeze(DEFINITIONS.map((definition) => {
  const pressure = getLegacyCampaignPressureProfile(definition.legacyLevel);
  return Object.freeze({
    ...definition,
    spawnIntervalMs: pressure.spawnIntervalMs,
    wordSpeedPxPerSec: pressure.wordSpeedPxPerSec,
    maxSimultaneousWords: pressure.maxSimultaneousWords,
    targetWPM: pressure.targetWPM,
  });
}));

export function getDailyWaveProfile(wave) {
  return DAILY_WAVE_PROFILES.find((profile) => profile.wave === Number(wave)) || null;
}

export function isStandardDailyConfiguration(config = {}, currentDateKey) {
  return (
    config.challengeVersion === DAILY_CHALLENGE_VERSION &&
    config.dateKey === currentDateKey &&
    config.developerMode !== true &&
    config.dateOverride !== true &&
    config.totalWords === DAILY_TOTAL_WORDS
  );
}

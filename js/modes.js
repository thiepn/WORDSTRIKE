export const MODE_IDS = Object.freeze({
  CAMPAIGN: "campaign",
  SPEED_TEST: "speed-test",
  ENDLESS: "endless",
  DAILY: "daily",
  PRACTICE: "practice",
});

const MODE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: MODE_IDS.CAMPAIGN,
    name: "Campaign",
    shortLabel: "100 Levels",
    description: "Defend the core through 100 levels.",
    enabled: true,
    status: "available",
    route: "level-select",
    supportsPause: true,
    supportsSeed: true,
    storesProgress: true,
  }),
  Object.freeze({
    id: MODE_IDS.SPEED_TEST,
    name: "Typing Test",
    shortLabel: "Speed + Accuracy",
    description: "Measure your typing speed and accuracy.",
    enabled: true,
    status: "available",
    route: "speed-test-setup",
    supportsPause: false,
    supportsSeed: true,
    storesProgress: true,
  }),
  Object.freeze({
    id: MODE_IDS.ENDLESS,
    name: "Endless",
    shortLabel: "Survival",
    description: "Hold the core as pressure keeps rising.",
    enabled: false,
    status: "coming-soon",
    route: null,
    supportsPause: true,
    supportsSeed: true,
    storesProgress: true,
  }),
  Object.freeze({
    id: MODE_IDS.DAILY,
    name: "Daily Strike",
    shortLabel: "Daily Challenge",
    description: "Face one shared challenge each day.",
    enabled: false,
    status: "coming-soon",
    route: null,
    supportsPause: true,
    supportsSeed: true,
    storesProgress: true,
  }),
  Object.freeze({
    id: MODE_IDS.PRACTICE,
    name: "Practice Lab",
    shortLabel: "Training",
    description: "Train focused typing skills.",
    enabled: false,
    status: "coming-soon",
    route: null,
    supportsPause: true,
    supportsSeed: true,
    storesProgress: true,
  }),
]);

const MODE_BY_ID = new Map(MODE_DEFINITIONS.map((mode) => [mode.id, mode]));

export function isValidModeId(modeId) {
  return typeof modeId === "string" && MODE_BY_ID.has(modeId);
}

export function getModeDefinition(modeId) {
  return MODE_BY_ID.get(modeId) || null;
}

export function getAllModes() {
  return [...MODE_DEFINITIONS];
}

export function getEnabledModes() {
  return MODE_DEFINITIONS.filter((mode) => mode.enabled);
}

export function isModeEnabled(modeId) {
  return getModeDefinition(modeId)?.enabled === true;
}

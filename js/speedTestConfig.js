export const SPEED_TEST_TYPES = Object.freeze({
  TIME: "time",
  WORDS: "words",
});

export const SPEED_TEST_CONFIG_IDS = Object.freeze([
  "time-15",
  "time-30",
  "time-60",
  "time-120",
  "words-25",
  "words-50",
  "words-100",
]);

export const DEFAULT_SPEED_TEST_CONFIG_ID = "time-60";

const CONFIGURATIONS = Object.freeze([
  Object.freeze({
    configId: "time-15",
    testType: SPEED_TEST_TYPES.TIME,
    durationSeconds: 15,
    wordCount: null,
    label: "15 Seconds",
  }),
  Object.freeze({
    configId: "time-30",
    testType: SPEED_TEST_TYPES.TIME,
    durationSeconds: 30,
    wordCount: null,
    label: "30 Seconds",
  }),
  Object.freeze({
    configId: "time-60",
    testType: SPEED_TEST_TYPES.TIME,
    durationSeconds: 60,
    wordCount: null,
    label: "60 Seconds",
  }),
  Object.freeze({
    configId: "time-120",
    testType: SPEED_TEST_TYPES.TIME,
    durationSeconds: 120,
    wordCount: null,
    label: "120 Seconds",
  }),
  Object.freeze({
    configId: "words-25",
    testType: SPEED_TEST_TYPES.WORDS,
    durationSeconds: null,
    wordCount: 25,
    label: "25 Words",
  }),
  Object.freeze({
    configId: "words-50",
    testType: SPEED_TEST_TYPES.WORDS,
    durationSeconds: null,
    wordCount: 50,
    label: "50 Words",
  }),
  Object.freeze({
    configId: "words-100",
    testType: SPEED_TEST_TYPES.WORDS,
    durationSeconds: null,
    wordCount: 100,
    label: "100 Words",
  }),
]);

const CONFIG_BY_ID = new Map(CONFIGURATIONS.map((config) => [config.configId, config]));

export function getSpeedTestConfig(configId) {
  return CONFIG_BY_ID.get(configId) || null;
}

export function getAllSpeedTestConfigs() {
  return [...CONFIGURATIONS];
}

export function getSpeedTestConfigsByType(testType) {
  return CONFIGURATIONS.filter((config) => config.testType === testType);
}

export function isValidSpeedTestConfigId(configId) {
  return CONFIG_BY_ID.has(configId);
}

export function normalizeSpeedTestConfigId(configId) {
  return isValidSpeedTestConfigId(configId)
    ? configId
    : DEFAULT_SPEED_TEST_CONFIG_ID;
}

export function parseDeveloperSpeedTestConfig(search = "") {
  return normalizeSpeedTestConfigId(new URLSearchParams(search).get("test"));
}

export function moveSpeedTestConfigSelection(configId, key) {
  const current = getSpeedTestConfig(normalizeSpeedTestConfigId(configId));
  if (["ArrowLeft", "ArrowRight", "Tab"].includes(key)) {
    return current.testType === SPEED_TEST_TYPES.TIME ? "words-50" : "time-60";
  }
  const options = getSpeedTestConfigsByType(current.testType);
  const currentIndex = options.findIndex((option) => option.configId === current.configId);
  const direction = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  if (!direction) return current.configId;
  return options[(currentIndex + direction + options.length) % options.length].configId;
}

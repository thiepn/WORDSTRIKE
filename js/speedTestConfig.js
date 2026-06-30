export const SPEED_TEST_TYPES = Object.freeze({
  TIME: "time",
  WORDS: "words",
});

export const SPEED_TEST_CONFIG_IDS = Object.freeze([
  "time-15",
  "time-30",
  "time-60",
  "time-120",
  "words-10",
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
    configId: "words-10",
    testType: SPEED_TEST_TYPES.WORDS,
    durationSeconds: null,
    wordCount: 10,
    label: "10 Words",
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

export function moveSpeedTestConfiguration(configId, key) {
  const current = getSpeedTestConfig(configId) || getSpeedTestConfig(DEFAULT_SPEED_TEST_CONFIG_ID);
  const options = getSpeedTestConfigsByType(current.testType);
  const index = Math.max(0, options.findIndex((option) => option.configId === current.configId));
  if (key === "ArrowLeft") return options[(index - 1 + options.length) % options.length].configId;
  if (key === "ArrowRight") return options[(index + 1) % options.length].configId;
  if (key === "Home") return options[0].configId;
  if (key === "End") return options.at(-1).configId;
  if (["ArrowUp", "ArrowDown"].includes(key)) {
    return current.testType === SPEED_TEST_TYPES.TIME ? "words-50" : "time-60";
  }
  return current.configId;
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

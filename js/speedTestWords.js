import { mixSeed, shuffleSeeded } from "./random.js";

export const SPEED_TEST_WORD_SET = Object.freeze({
  id: "english-200",
  name: "English 200",
  version: 1,
  wordCount: 199,
});
export const LEGACY_SPEED_TEST_WORD_SET_ID = "legacy-common-740";
export const SPEED_TEST_BATCH_SIZE = 200;

function hashLabel(label) {
  let hash = 0x811c9dc5;
  for (const character of label) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function validateSpeedTestVocabulary(source) {
  const words = Array.isArray(source?.words) ? source.words : [];
  const errors = [];
  const seen = new Set();
  for (const [index, word] of words.entries()) {
    if (typeof word !== "string") {
      errors.push(`entry ${index}: missing word`);
      continue;
    }
    if (!/^[a-z]{1,10}$/.test(word)) {
      errors.push(`${word}: must be lowercase ASCII and 1-10 letters`);
    }
    if (seen.has(word)) errors.push(`${word}: duplicate word`);
    seen.add(word);
  }
  if (words.length !== SPEED_TEST_WORD_SET.wordCount) {
    errors.push(`requires exactly ${SPEED_TEST_WORD_SET.wordCount} words`);
  }
  return {
    valid: errors.length === 0,
    errors,
    words: errors.length ? [...words] : [...seen],
  };
}

export async function loadSpeedTestWordBank() {
  const response = await fetch(new URL("../data/english200.json", import.meta.url));
  if (!response.ok) throw new Error(`Typing Test vocabulary request failed: ${response.status}`);
  const source = await response.json();
  if (
    source?.wordSetId !== SPEED_TEST_WORD_SET.id ||
    source?.wordSetName !== SPEED_TEST_WORD_SET.name ||
    source?.wordSetVersion !== SPEED_TEST_WORD_SET.version ||
    source?.wordCount !== SPEED_TEST_WORD_SET.wordCount
  ) {
    throw new Error("Invalid Typing Test word-set metadata");
  }
  const validation = validateSpeedTestVocabulary(source);
  if (!validation.valid) {
    throw new Error(`Invalid Typing Test vocabulary: ${validation.errors.join("; ")}`);
  }
  return {
    schemaVersion: source.schemaVersion ?? 1,
    wordSet: SPEED_TEST_WORD_SET,
    words: validation.words,
  };
}

export function deriveSpeedTestWordSeed(attemptSeed, configId) {
  return mixSeed(
    mixSeed(attemptSeed, hashLabel(configId)),
    hashLabel("speed-test-words"),
  );
}

export function createSpeedTestWordStream(pool, attemptSeed, configId) {
  const validPool = [...new Set((pool || []).filter(
    (word) => typeof word === "string" && /^[a-z]{1,10}$/.test(word),
  ))];
  if (!validPool.length) throw new Error("Typing Test word pool is empty");
  const baseSeed = deriveSpeedTestWordSeed(attemptSeed, configId);
  const words = [];
  let batchIndex = 0;
  let lastBatchSeed = null;

  const appendBatch = () => {
    const batchSeed = mixSeed(baseSeed, Math.imul(batchIndex + 1, 0x9e3779b9));
    lastBatchSeed = batchSeed;
    const shuffled = shuffleSeeded(validPool, batchSeed).slice(
      0,
      Math.min(SPEED_TEST_BATCH_SIZE, validPool.length),
    );
    if (
      words.length &&
      shuffled.length > 1 &&
      words.at(-1) === shuffled[0]
    ) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    words.push(...shuffled);
    batchIndex += 1;
  };

  return {
    words,
    ensure(count) {
      while (words.length < count) appendBatch();
      return words;
    },
    get batchCount() {
      return batchIndex;
    },
    get baseSeed() {
      return baseSeed;
    },
    get lastBatchSeed() {
      return lastBatchSeed;
    },
    get lastBatchIndex() {
      return Math.max(0, batchIndex - 1);
    },
  };
}

export function generateSpeedTestWords(pool, attemptSeed, configId, count) {
  const stream = createSpeedTestWordStream(pool, attemptSeed, configId);
  return stream.ensure(Math.max(0, count)).slice(0, Math.max(0, count));
}

import { mixSeed, shuffleSeeded } from "./random.js";

export const MIN_SPEED_TEST_WORDS = 500;
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
    if (!/^[a-z]{2,10}$/.test(word)) {
      errors.push(`${word}: must be lowercase ASCII and 2-10 letters`);
    }
    if (seen.has(word)) errors.push(`${word}: duplicate word`);
    seen.add(word);
  }
  if (seen.size < MIN_SPEED_TEST_WORDS) {
    errors.push(`requires at least ${MIN_SPEED_TEST_WORDS} unique words`);
  }
  return {
    valid: errors.length === 0,
    errors,
    words: errors.length ? [...words] : [...seen],
  };
}

export async function loadSpeedTestWordBank() {
  const response = await fetch(new URL("../data/typingTestWords.json", import.meta.url));
  if (!response.ok) throw new Error(`Typing Test vocabulary request failed: ${response.status}`);
  const source = await response.json();
  const validation = validateSpeedTestVocabulary(source);
  if (!validation.valid) {
    throw new Error(`Invalid Typing Test vocabulary: ${validation.errors.join("; ")}`);
  }
  return {
    schemaVersion: source.schemaVersion ?? 1,
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
    (word) => typeof word === "string" && /^[a-z]{2,10}$/.test(word),
  ))];
  if (!validPool.length) throw new Error("Typing Test word pool is empty");
  const baseSeed = deriveSpeedTestWordSeed(attemptSeed, configId);
  const words = [];
  let batchIndex = 0;

  const appendBatch = () => {
    const batchSeed = mixSeed(baseSeed, Math.imul(batchIndex + 1, 0x9e3779b9));
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
  };
}

export function generateSpeedTestWords(pool, attemptSeed, configId, count) {
  const stream = createSpeedTestWordStream(pool, attemptSeed, configId);
  return stream.ensure(Math.max(0, count)).slice(0, Math.max(0, count));
}

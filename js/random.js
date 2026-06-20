export function normalizeSeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const normalized = Math.trunc(number) >>> 0;
  return normalized || 1;
}

export function createAttemptSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] || 1;
  }
  const time = Date.now() >>> 0;
  const random = Math.floor(Math.random() * 0xffffffff) >>> 0;
  return (time ^ random) || 1;
}

export function parseDeveloperSeed(search = "") {
  return normalizeSeed(new URLSearchParams(search).get("seed"));
}

export function mixSeed(seed, salt = 0) {
  let value = (normalizeSeed(seed) ?? 1) ^ (Math.trunc(salt) >>> 0);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0 || 1;
}

export function createSeededRandom(seed) {
  let state = normalizeSeed(seed) ?? 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded(items, seed) {
  const result = [...items];
  const random = createSeededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

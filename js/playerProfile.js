export const PLAYER_PROFILE_VERSION = 1;
export const DEFAULT_DISPLAY_NAME = "Player";

function timestamp(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function generatePlayerId(cryptoSource = globalThis.crypto) {
  if (typeof cryptoSource?.randomUUID === "function") {
    return `ws_${cryptoSource.randomUUID()}`;
  }
  if (typeof cryptoSource?.getRandomValues === "function") {
    const bytes = cryptoSource.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
    return `ws_${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
  throw new Error("Secure identity generation is unavailable.");
}

export function normalizeDisplayName(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/gu, " ");
}

export function validateDisplayName(value) {
  if (typeof value !== "string" || /[\p{Cc}\p{Cf}]/u.test(value)) {
    return { valid: false, value: null };
  }
  const normalized = normalizeDisplayName(value);
  const length = [...normalized].length;
  return {
    valid: length >= 2 && length <= 20,
    value: length >= 2 && length <= 20 ? normalized : null,
  };
}

export function createDefaultPlayerProfile({
  cryptoSource = globalThis.crypto,
  now = Date.now(),
} = {}) {
  const createdAt = timestamp(now, Date.now());
  return {
    playerId: generatePlayerId(cryptoSource),
    displayName: DEFAULT_DISPLAY_NAME,
    createdAt,
    updatedAt: createdAt,
    profileVersion: PLAYER_PROFILE_VERSION,
  };
}

export function sanitizePlayerProfile(value) {
  if (!value || typeof value !== "object") return null;
  const playerId = typeof value.playerId === "string" && value.playerId.trim()
    ? value.playerId.trim()
    : null;
  if (!playerId) return null;
  const name = validateDisplayName(value.displayName);
  const createdAt = timestamp(value.createdAt);
  const updatedAt = Math.max(createdAt, timestamp(value.updatedAt, createdAt));
  return {
    playerId,
    displayName: name.valid ? name.value : DEFAULT_DISPLAY_NAME,
    createdAt,
    updatedAt,
    profileVersion: PLAYER_PROFILE_VERSION,
  };
}

export function ensurePlayerProfile(value, options = {}) {
  return sanitizePlayerProfile(value) || createDefaultPlayerProfile(options);
}

export function updateDisplayName(profile, nextName, now = Date.now()) {
  const current = sanitizePlayerProfile(profile);
  const validation = validateDisplayName(nextName);
  if (!current || !validation.valid) return current;
  return {
    ...current,
    displayName: validation.value,
    updatedAt: Math.max(
      current.createdAt,
      current.updatedAt,
      timestamp(now, current.updatedAt),
    ),
  };
}

export function getPublicPlayerProfile(profile) {
  const safe = sanitizePlayerProfile(profile);
  if (!safe) return null;
  return {
    playerId: safe.playerId,
    displayName: safe.displayName,
    profileVersion: safe.profileVersion,
  };
}

export async function copyPlayerIdToClipboard(
  playerId,
  clipboard = globalThis.navigator?.clipboard,
) {
  if (
    typeof playerId !== "string" ||
    !playerId ||
    typeof clipboard?.writeText !== "function"
  ) return false;
  try {
    await clipboard.writeText(playerId);
    return true;
  } catch {
    return false;
  }
}

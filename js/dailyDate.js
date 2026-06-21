const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getUtcDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function isValidDailyDateKey(value) {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) return false;
  return getUtcDateKey(`${value}T00:00:00.000Z`) === value;
}

export function getPreviousUtcDateKey(dateKey) {
  if (!isValidDailyDateKey(dateKey)) return null;
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return getUtcDateKey(date);
}

export function parseDailyDateOverride(search = "", currentDateKey = getUtcDateKey()) {
  const value = new URLSearchParams(search).get("date");
  return isValidDailyDateKey(value) ? value : currentDateKey;
}

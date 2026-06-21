export const EMPTY_STAT = "—";

export function formatCompactNumber(value) {
  if (value == null || value === "") return EMPTY_STAT;
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)).toLocaleString("en-US") : EMPTY_STAT;
}

export function formatPercentage(value, digits = 1) {
  if (value == null || value === "") return EMPTY_STAT;
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(digits)}%` : EMPTY_STAT;
}

export function formatDuration(value) {
  if (value == null || value === "") return EMPTY_STAT;
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return EMPTY_STAT;
  const totalSeconds = Math.floor(milliseconds / 1000);
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function validDate(value) {
  if (value == null || value === "") return null;
  const date = new Date(Number(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatDateTime(value) {
  const date = validDate(value);
  if (!date) return EMPTY_STAT;
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `${month} ${date.getDate()} · ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatUtcDate(value) {
  const date = typeof value === "string"
    ? new Date(`${value}T00:00:00.000Z`)
    : validDate(value);
  if (!date || !Number.isFinite(date.getTime())) return EMPTY_STAT;
  return `${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase()} ${date.getUTCDate()}`;
}

export function formatRecordValue(value, formatter = formatCompactNumber) {
  return value == null ? EMPTY_STAT : formatter(value);
}

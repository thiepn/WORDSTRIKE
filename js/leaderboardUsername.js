export const LEADERBOARD_USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export function normalizeUsernameInput(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateLeaderboardUsername(value) {
  const username = normalizeUsernameInput(value);
  return Object.freeze({
    valid: LEADERBOARD_USERNAME_PATTERN.test(username),
    username,
    normalized: username.toLowerCase(),
    message: LEADERBOARD_USERNAME_PATTERN.test(username)
      ? ""
      : "Use 3–20 letters, numbers, or underscores",
  });
}

export function formatUsernameChangeDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "an unavailable date";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function canChangeLeaderboardUsername(profile, nowMs = Date.now()) {
  if (!profile?.canChangeAt) return true;
  const eligibleAt = new Date(profile.canChangeAt).getTime();
  return !Number.isFinite(eligibleAt) || eligibleAt <= nowMs;
}

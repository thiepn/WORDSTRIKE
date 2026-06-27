export const SUPABASE_CONFIG = Object.freeze({
  url: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "sb_publishable_REPLACE_ME",
});

function isSafeProjectUrl(value) {
  if (typeof value !== "string" || /YOUR_PROJECT_REF|REPLACE_ME/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && /^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)
      && url.pathname === "/"
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function isSafePublishableKey(value) {
  if (typeof value !== "string" || /REPLACE_ME|sb_secret_|service[_-]?role/i.test(value)) {
    return false;
  }
  return /^sb_publishable_[A-Za-z0-9._-]+$/.test(value);
}

export function hasValidSupabaseConfig(config = SUPABASE_CONFIG) {
  return isSafeProjectUrl(config?.url) && isSafePublishableKey(config?.publishableKey);
}

export function getOAuthRedirectUrl(location = globalThis.location) {
  if (!location?.href) return "";
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  return url.href;
}

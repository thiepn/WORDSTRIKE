import assert from "node:assert/strict";
import {
  getOAuthRedirectUrl,
  hasValidSupabaseConfig,
  SUPABASE_CONFIG,
} from "../js/supabaseConfig.js";

const valid = {
  url: "https://abc123project.supabase.co",
  publishableKey: "sb_publishable_public-browser-key",
};
assert.equal(hasValidSupabaseConfig(valid), true);
assert.equal(hasValidSupabaseConfig(SUPABASE_CONFIG), true);
assert.doesNotMatch(SUPABASE_CONFIG.publishableKey, /sb_secret_|service[_-]?role/i);
assert.equal(hasValidSupabaseConfig({ ...valid, url: "https://YOUR_PROJECT_REF.supabase.co" }), false);
assert.equal(hasValidSupabaseConfig({ ...valid, publishableKey: "sb_publishable_REPLACE_ME" }), false);
assert.equal(hasValidSupabaseConfig({ ...valid, publishableKey: "sb_secret_private" }), false);
assert.equal(hasValidSupabaseConfig({ ...valid, publishableKey: "service_role" }), false);
assert.equal(hasValidSupabaseConfig({ ...valid, publishableKey: "sb_publishable_service_role" }), false);
assert.equal(getOAuthRedirectUrl({ href: "http://localhost:8000/?code=oauth#token" }), "http://localhost:8000/");
assert.equal(
  getOAuthRedirectUrl({ href: "https://thiepn.github.io/WORDSTRIKE/?code=oauth#state" }),
  "https://thiepn.github.io/WORDSTRIKE/",
);

console.log("Supabase frontend configuration, key safety, and redirect URLs passed.");

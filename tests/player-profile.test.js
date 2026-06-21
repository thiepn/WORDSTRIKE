import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createDefaultPlayerProfile,
  copyPlayerIdToClipboard,
  ensurePlayerProfile,
  generatePlayerId,
  getPublicPlayerProfile,
  normalizeDisplayName,
  sanitizePlayerProfile,
  updateDisplayName,
  validateDisplayName,
} from "../js/playerProfile.js";

const uuidCrypto = { randomUUID: () => "550e8400-e29b-41d4-a716-446655440000" };
const profile = createDefaultPlayerProfile({ cryptoSource: uuidCrypto, now: 1000 });
assert.equal(profile.playerId, "ws_550e8400-e29b-41d4-a716-446655440000");
assert.equal(profile.displayName, "Player");
assert.equal(profile.createdAt, 1000);
assert.deepEqual(ensurePlayerProfile(profile, { cryptoSource: uuidCrypto }), profile);
assert.deepEqual(sanitizePlayerProfile(profile), profile);

const bytesCrypto = {
  getRandomValues(array) {
    array.forEach((_value, index) => { array[index] = index; });
    return array;
  },
};
assert.match(generatePlayerId(bytesCrypto), /^ws_[0-9a-f-]{36}$/);
assert.equal(normalizeDisplayName("  Ada   Lovelace  "), "Ada Lovelace");
assert.equal(validateDisplayName("李 雷").valid, true);
assert.equal(validateDisplayName("A").valid, false);
assert.equal(validateDisplayName("a".repeat(21)).valid, false);
assert.equal(validateDisplayName("Bad\nName").valid, false);
assert.equal(validateDisplayName("Nova_7-Prime").valid, true);

const renamed = updateDisplayName(profile, "  Ada   Lovelace  ", 2000);
assert.equal(renamed.displayName, "Ada Lovelace");
assert.equal(renamed.playerId, profile.playerId);
assert.equal(renamed.updatedAt, 2000);
assert.deepEqual(updateDisplayName(profile, "x", 2000), profile);
assert.deepEqual(getPublicPlayerProfile(renamed), {
  playerId: profile.playerId,
  displayName: "Ada Lovelace",
  profileVersion: 1,
});
assert.deepEqual(Object.keys(getPublicPlayerProfile(renamed)).sort(), [
  "displayName", "playerId", "profileVersion",
]);
let copied = null;
assert.equal(await copyPlayerIdToClipboard(profile.playerId, {
  async writeText(value) { copied = value; },
}), true);
assert.equal(copied, profile.playerId);
assert.equal(await copyPlayerIdToClipboard(profile.playerId, {
  async writeText() { throw new Error("denied"); },
}), false);
assert.equal(await copyPlayerIdToClipboard(profile.playerId, null), false);

const source = await readFile(new URL("../js/playerProfile.js", import.meta.url), "utf8");
assert.doesNotMatch(source, /Math\.random/);

console.log("Player profile identity, crypto fallback, Unicode validation, editing, and public shape tests passed.");

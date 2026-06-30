import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = { html: "", set innerHTML(value) { this.html = value; } };
globalThis.document = { querySelector: () => app };
const { renderLeaderboards } = await import("../js/leaderboardUi.js");
const state = { status: "ready", selectedCategory: "campaign", selectedTypingDuration: 60, selectedBoardKey: "campaign-highest-level-v1", entries: [{ rank: 1, username: "PublicPlayer", level: 10, grade: "A", accuracy: 95 }], viewer: null };
renderLeaderboards(state, { status: "signed-out" }, { status: "idle" });
assert.match(app.html, /SIGN IN FOR GLOBAL RANKS/);
assert.match(app.html, /leaderboard-google-sign-in[^>]*>CONTINUE WITH GOOGLE/);
assert.match(app.html, /account-primary[^>]*data-action="leaderboard-google-sign-in"/);
assert.match(app.html, /PublicPlayer/);
renderLeaderboards(state, { status: "signed-in", user: { email: "private@example.com" } }, { status: "needs-username", profile: null });
assert.match(app.html, /leaderboard-open-username[^>]*>SET USERNAME/);
assert.match(app.html, /account-primary[^>]*data-action="leaderboard-open-username"/);
assert.doesNotMatch(app.html, /private@example\.com|CONTINUE WITH GOOGLE/);
const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
assert.match(main, /action === "leaderboard-google-sign-in"[\s\S]*signInWithGoogle\(\)/);
assert.match(main, /action === "leaderboard-open-username"[\s\S]*openAccountSettings\(\)/);

console.log("Signed-out rankings remain public with direct Google sign-in, while username setup has a direct shortcut.");

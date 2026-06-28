import assert from "node:assert/strict";
import { renderGlobalSubmissionMarkup } from "../js/ui.js";

const daily = { boardKey: "daily-strike-v1" };
assert.match(renderGlobalSubmissionMarkup({ ...daily, status: "ineligible", reason: "signed-out" }), /Sign in.*OPEN PROFILE.*VIEW LEADERBOARD/s);
assert.match(renderGlobalSubmissionMarkup({ ...daily, status: "ineligible", reason: "username-required" }), /Choose a public username/);
assert.match(renderGlobalSubmissionMarkup({ ...daily, status: "ready" }), /SUBMIT GLOBAL SCORE.*view-daily-leaderboard/s);
assert.match(renderGlobalSubmissionMarkup({ ...daily, status: "submitting" }), /disabled/);
assert.match(renderGlobalSubmissionMarkup({ ...daily, status: "submitted", rank: 42 }), /Global score submitted.*Rank #42/s);
assert.match(renderGlobalSubmissionMarkup({ ...daily, status: "already-submitted" }), /already submitted/);
assert.match(renderGlobalSubmissionMarkup({ ...daily, status: "error" }), /local result is safe.*RETRY.*VIEW LEADERBOARD/s);
assert.match(renderGlobalSubmissionMarkup({ ...daily, status: "offline" }), /offline.*local result is safe.*RETRY/s);
assert.doesNotMatch(renderGlobalSubmissionMarkup({ ...daily, status: "ready" }), /email|token|user-?id/i);
assert.match(renderGlobalSubmissionMarkup({ boardKey: "endless-v1", status: "ready" }), /view-endless-leaderboard/);

console.log("Result submission UI covers signed-out, username, ready, pending, success, duplicate, error, offline, rank, and board links.");

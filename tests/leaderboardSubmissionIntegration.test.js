import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { beginSession, clearSession } from "../js/sessionManager.js";
import { MODE_IDS } from "../js/modes.js";
import { buildSessionResult } from "../js/sessionResult.js";

clearSession();
const first = beginSession({ modeId: MODE_IDS.ENDLESS, source: "mode-select" });
assert.ok(first.id);
const result = buildSessionResult({ sessionId: first.id, sessionSource: first.source, modeId: MODE_IDS.ENDLESS });
assert.equal(result.sessionId, first.id);
assert.equal(result.sessionSource, "mode-select");
clearSession();
const second = beginSession({ modeId: MODE_IDS.ENDLESS, source: "retry" });
assert.notEqual(second.id, first.id);

const dailyMode = await readFile(new URL("../js/dailyMode.js", import.meta.url), "utf8");
const endlessMode = await readFile(new URL("../js/endlessMode.js", import.meta.url), "utf8");
const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
assert.ok(dailyMode.indexOf("recordCompletedSession(result)") < dailyMode.indexOf("callbacks.onComplete?.(game, result)"));
assert.ok(endlessMode.indexOf("recordCompletedSession(result)") < endlessMode.indexOf("callbacks.onComplete?.(game, result)"));
assert.match(main, /function finishDaily[\s\S]*prepareAutomaticResultSubmission\("daily", result/);
assert.match(main, /function finishEndless[\s\S]*prepareAutomaticResultSubmission\("endless", result/);

console.log("Daily/Endless run IDs remain stable through finalization while separate runs receive separate IDs.");

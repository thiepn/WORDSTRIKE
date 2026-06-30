import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  advanceWordTrajectory,
  createWordTrajectory,
  projectWordTrajectory,
} from "../js/gameplayWorld.js";

const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const desktop = css.slice(0, css.indexOf("@media (max-width: 760px)"));
const mobile = css.slice(css.indexOf("@media (max-width: 760px)"), css.indexOf("@media (hover: none)"));

assert.match(desktop, /\.word-visual\s*\{[^}]*font-size:\s*clamp\(22px, 2vw, 30px\)/s);
assert.match(desktop, /\.core\s*\{[^}]*width:\s*58px[^}]*height:\s*58px/s);
assert.match(mobile, /\.word-visual\s*\{[^}]*font-size:\s*clamp\(13px, 4vw, 17px\)/s);
assert.match(mobile, /\.core\s*\{[^}]*width:\s*34px[^}]*height:\s*34px/s);
assert.match(mobile, /\.boss-phrase-size-normal\s*\{\s*font-size:\s*clamp\(20px, 5\.8vw, 28px\)/);
assert.match(css, /\.gameplay-pause-button[\s\S]*min-height:\s*44px/);

const portraitWord = { ...createWordTrajectory({ edge: "right", ratio: 0.4, speed: 100 }) };
const desktopWord = { ...portraitWord };
projectWordTrajectory(portraitWord, { width: 390, height: 844 });
projectWordTrajectory(desktopWord, { width: 1366, height: 768 });
advanceWordTrajectory(portraitWord, 1000, { width: 390, height: 844 });
advanceWordTrajectory(desktopWord, 1000, { width: 1366, height: 768 });
assert.equal(portraitWord.travelProgress, desktopWord.travelProgress);
assert.equal(portraitWord.travelDurationMs, desktopWord.travelDurationMs);

console.log("Mobile defense visuals scale independently while logical word progress and impact duration remain unchanged.");

import assert from "node:assert/strict";
import {
  advanceWordTrajectory,
  createWordTrajectory,
  projectWordTrajectory,
} from "../js/gameplayWorld.js";

const viewports = [
  { width: 360, height: 800 }, { width: 844, height: 390 },
  { width: 768, height: 1024 }, { width: 1024, height: 768 },
  { width: 1366, height: 768 }, { width: 2560, height: 1440 },
];
const outcomes = viewports.map((viewport) => {
  const word = { ...createWordTrajectory({ edge: "right", ratio: 0.37, speed: 100 }) };
  projectWordTrajectory(word, viewport);
  advanceWordTrajectory(word, 1000, viewport);
  const progressAfterSecond = word.travelProgress;
  const resized = { width: viewport.height, height: viewport.width };
  advanceWordTrajectory(word, word.travelDurationMs - 1000, resized);
  return { progressAfterSecond, impact: word.travelProgress, duration: word.travelDurationMs };
});
for (const outcome of outcomes) {
  assert.equal(outcome.progressAfterSecond, outcomes[0].progressAfterSecond);
  assert.equal(outcome.duration, outcomes[0].duration);
  assert.equal(outcome.impact, 1);
}

console.log("Fixed logical trajectories preserve progress and impact timing across viewport, orientation, and render-scale changes.");

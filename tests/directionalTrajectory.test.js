import assert from "node:assert/strict";
import {
  createWordTrajectory,
  FULLY_VERTICAL_SPEED_SCALE,
  getDirectionalSpeedScale,
} from "../js/gameplayWorld.js";

const vectors = [
  [1, 0],
  [4, 1],
  [1, 1],
  [1, 4],
  [0, 1],
];
const scales = vectors.map(([dx, dy]) => getDirectionalSpeedScale(dx, dy));
for (let index = 1; index < scales.length; index += 1) {
  assert.ok(scales[index] <= scales[index - 1], "speed scale must decrease monotonically with verticality");
}
assert.equal(scales[0], 1);
assert.equal(scales.at(-1), FULLY_VERTICAL_SPEED_SCALE);
assert.equal(getDirectionalSpeedScale(1, 4), getDirectionalSpeedScale(-1, -4));

const top = createWordTrajectory({ edge: "top", ratio: 0.5, speed: 60 });
const bottom = createWordTrajectory({ edge: "bottom", ratio: 0.5, speed: 60 });
const left = createWordTrajectory({ edge: "left", ratio: 0.5, speed: 60 });
const right = createWordTrajectory({ edge: "right", ratio: 0.5, speed: 60 });
assert.equal(top.directionalSpeedScale, bottom.directionalSpeedScale);
assert.equal(left.directionalSpeedScale, right.directionalSpeedScale);
assert.equal(top.directionalSpeedScale, FULLY_VERTICAL_SPEED_SCALE);
assert.equal(left.directionalSpeedScale, 1);
assert.equal(createWordTrajectory({ edge: "top", ratio: 0.5, speed: 60 }).travelDurationMs, top.travelDurationMs);

console.log("Directional trajectory scaling is continuous, symmetric, monotonic, and viewport-independent.");

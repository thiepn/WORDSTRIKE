import assert from "node:assert/strict";
import {
  getSpeedTestLineWindow,
  isConstrainedSpeedTestLayout,
} from "../js/speedTestLayout.js";

assert.deepEqual(getSpeedTestLineWindow({ currentLineIndex: 0, lineCount: 4, constrained: true }), {
  topLineIndex: 0, bottomLineIndex: 1, activeLineIndex: 0, visibleLineCount: 2,
});
assert.deepEqual(getSpeedTestLineWindow({ currentLineIndex: 1, lineCount: 4, constrained: true }), {
  topLineIndex: 1, bottomLineIndex: 2, activeLineIndex: 1, visibleLineCount: 2,
});
assert.deepEqual(getSpeedTestLineWindow({ currentLineIndex: 2, lineCount: 4, constrained: true }), {
  topLineIndex: 2, bottomLineIndex: 3, activeLineIndex: 2, visibleLineCount: 2,
});
assert.deepEqual(getSpeedTestLineWindow({ currentLineIndex: 3, lineCount: 4, constrained: true }), {
  topLineIndex: 2, bottomLineIndex: 3, activeLineIndex: 3, visibleLineCount: 2,
});
assert.deepEqual(getSpeedTestLineWindow({ currentLineIndex: 2, lineCount: 5, constrained: false }), {
  topLineIndex: 1, bottomLineIndex: 3, activeLineIndex: 2, visibleLineCount: 3,
});
assert.equal(isConstrainedSpeedTestLayout({
  body: { classList: { contains: () => true } },
  matchMedia: () => ({ matches: false }),
}), true);
assert.equal(isConstrainedSpeedTestLayout({
  body: { classList: { contains: () => false } },
  matchMedia: () => ({ matches: true }),
}), true);

console.log("Constrained Typing keeps the active and upcoming rows visible while desktop retains its three-row window.");

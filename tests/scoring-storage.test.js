import assert from "node:assert/strict";
import { calculateAccuracy, calculateGrade } from "../js/scoring.js";
import { createGameState, registerMissedWord } from "../js/gameLoop.js";

const gradeCases = [
  [100, "S"],
  [98, "S"],
  [97, "A"],
  [95, "A"],
  [90, "B"],
  [86.1, "C"],
  [79.9, "D"],
];
for (const [accuracy, grade] of gradeCases) {
  assert.equal(calculateGrade({ accuracy }), grade);
}
assert.equal(calculateGrade({ accuracy: 100, failed: true }), "Fail");
assert.equal(calculateGrade({ accuracy: 86.1, failed: false, actualWPM: 999, score: 999999 }), "C");
assert.equal(calculateAccuracy(10, 10, 0), 100);
assert.equal(calculateAccuracy(10, 11, 0), 10 / 11 * 100);
assert.equal(calculateAccuracy(2, 2, 3), 40);
assert.equal(calculateAccuracy(0, 0, 0), 100);

const normalGame = createGameState(1, { lives: 3, spawnIntervalMs: 1000 }, []);
assert.equal(normalGame.missedCharacters, 0);
const partialWord = { text: "laser", typedIndex: 2 };
assert.equal(registerMissedWord(normalGame, partialWord), 3);
assert.equal(registerMissedWord(normalGame, partialWord), 0);
assert.equal(normalGame.missedCharacters, 3);
assert.equal(createGameState(1, { lives: 3, spawnIntervalMs: 1000 }, []).missedCharacters, 0);

globalThis.localStorage = {
  value: JSON.stringify({
    currentFurthestLevel: 12,
    levels: {
      10: {
        grade: "S",
        bestAccuracy: 86.1,
        bestWPM: 55,
        bestScore: 900,
        maxCombo: 8,
      },
    },
    settings: { screenShake: true, particles: true, strictMode: false },
  }),
  getItem() { return this.value; },
  setItem(_key, value) { this.value = value; },
};

const { loadSave, updateLevelResult } = await import("../js/storage.js");
const save = loadSave();
assert.equal(save.currentFurthestLevel, 12);

const chainProgress = {
  currentFurthestLevel: 82,
  levels: {},
  settings: { screenShake: true, particles: true, strictMode: false },
};
updateLevelResult(chainProgress, 82, {
  grade: "S",
  accuracy: 100,
  wpm: 70,
  score: 1200,
  maxCombo: 20,
  isBoss: false,
});
assert.equal(chainProgress.currentFurthestLevel, 83);
assert.equal(chainProgress.levels["82"].grade, "S");
const chainClearSnapshot = JSON.stringify(chainProgress);
updateLevelResult(chainProgress, 82, {
  grade: "Fail",
  accuracy: 90,
  wpm: 100,
  score: 9999,
  maxCombo: 99,
  isBoss: false,
  failureReason: "chain-broken",
});
assert.equal(JSON.stringify(chainProgress), chainClearSnapshot);

const bossProgress = {
  currentFurthestLevel: 10,
  levels: {},
  settings: { screenShake: true, particles: true, strictMode: false },
};
updateLevelResult(bossProgress, 10, {
  accuracy: 98,
  wpm: 60,
  score: 1000,
  maxCombo: 4,
  isBoss: true,
  timeRemaining: 12,
});
assert.equal(bossProgress.currentFurthestLevel, 11);
assert.equal(bossProgress.levels["10"].bossCleared, true);
const clearedSnapshot = JSON.stringify(bossProgress);
updateLevelResult(bossProgress, 10, {
  grade: "Fail",
  accuracy: 100,
  wpm: 100,
  score: 9999,
  maxCombo: 99,
  isBoss: true,
});
assert.equal(JSON.stringify(bossProgress), clearedSnapshot);
assert.equal(save.levels["10"].grade, "C");
assert.equal(save.levels["10"].bestScore, 900);

updateLevelResult(save, 10, {
  accuracy: 95,
  wpm: 40,
  score: 700,
  maxCombo: 6,
  isBoss: true,
  timeRemaining: 20,
});
assert.equal(save.levels["10"].grade, "A");
assert.equal(save.levels["10"].bestAccuracy, 95);
assert.equal(save.levels["10"].bestScore, 900);
assert.equal(save.currentFurthestLevel, 12);

console.log("Accuracy-only grading and storage migration tests passed.");

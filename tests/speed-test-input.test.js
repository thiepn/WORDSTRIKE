import assert from "node:assert/strict";
import { getSpeedTestConfig } from "../js/speedTestConfig.js";
import {
  createSpeedTestRuntime,
  handleSpeedTestInput,
} from "../js/speedTest.js";

const pool = ["word", "apple", "river", "stone", "green"];
const event = (key, options = {}) => ({
  key,
  ...options,
  prevented: false,
  preventDefault() { this.prevented = true; },
});

let state = createSpeedTestRuntime({
  config: getSpeedTestConfig("time-15"),
  wordPool: pool,
  attemptSeed: 1,
});
state.words.splice(0, state.words.length, "word", "apple", "river");

assert.equal(handleSpeedTestInput(state, event("Backspace"), 10), false);
assert.equal(state.activeStartedAtMs, null);
assert.equal(state.metrics.backspaces, 0);
assert.equal(handleSpeedTestInput(state, event(" "), 20), false);
assert.equal(state.activeStartedAtMs, null);
assert.equal(handleSpeedTestInput(state, event("Shift"), 30), false);

handleSpeedTestInput(state, event("w"), 100);
assert.equal(state.activeStartedAtMs, 100);
assert.equal(state.typedBuffer, "w");
assert.equal(state.metrics.correctKeystrokes, 1);
handleSpeedTestInput(state, event("p"), 110);
handleSpeedTestInput(state, event("r"), 120);
handleSpeedTestInput(state, event("d"), 130);
assert.equal(state.typedBuffer, "wprd");
assert.equal(state.metrics.correctKeystrokes, 3);
assert.equal(state.metrics.incorrectKeystrokes, 1);

handleSpeedTestInput(state, event("Backspace"), 140);
handleSpeedTestInput(state, event("Backspace"), 150);
handleSpeedTestInput(state, event("Backspace"), 160);
assert.equal(state.typedBuffer, "w");
assert.equal(state.metrics.backspaces, 3);
handleSpeedTestInput(state, event("o"), 170);
handleSpeedTestInput(state, event("r"), 180);
handleSpeedTestInput(state, event("d"), 190);
assert.equal(state.typedBuffer, "word");
assert.equal(state.metrics.incorrectKeystrokes, 1);
handleSpeedTestInput(state, event(" "), 200);
assert.equal(state.currentWordIndex, 1);
assert.equal(state.metrics.wordsCompleted, 1);
assert.equal(state.metrics.exactWords, 1);
assert.equal(state.metrics.rawTypedCharacters, 8);
assert.equal(state.metrics.printableKeystrokes, 7);
assert.equal(state.metrics.validSpaces, 1);
assert.equal(state.metrics.correctSpaces, 1);
assert.equal(state.metrics.correctKeystrokes, 7);

handleSpeedTestInput(state, event("a"), 210);
handleSpeedTestInput(state, event("x"), 220);
handleSpeedTestInput(state, event("!"), 230);
handleSpeedTestInput(state, event(" "), 240);
assert.equal(state.metrics.wordsCompleted, 2);
assert.equal(state.metrics.incorrectWords, 1);
assert.equal(state.metrics.missedCharacters, 2);
assert.equal(state.metrics.incorrectKeystrokes, 3);
assert.equal(state.metrics.validSpaces, 2);

const historical = {
  correct: state.metrics.correctKeystrokes,
  incorrect: state.metrics.incorrectKeystrokes,
  printable: state.metrics.printableKeystrokes,
};
handleSpeedTestInput(state, event("x"), 250);
handleSpeedTestInput(state, event("y"), 260);
const ctrlBackspace = event("Backspace", { ctrlKey: true });
assert.equal(handleSpeedTestInput(state, ctrlBackspace, 270), true);
assert.equal(ctrlBackspace.prevented, true);
assert.equal(state.typedBuffer, "");
assert.equal(state.metrics.backspaces, 4);
assert.equal(state.metrics.wordDeletes, 1);
assert.equal(state.metrics.correctKeystrokes, historical.correct);
assert.equal(state.metrics.incorrectKeystrokes, historical.incorrect + 2);
assert.equal(state.metrics.printableKeystrokes, historical.printable + 2);

const idle = createSpeedTestRuntime({
  config: getSpeedTestConfig("time-15"),
  wordPool: pool,
  attemptSeed: 3,
});
const idleDelete = event("Backspace", { ctrlKey: true });
assert.equal(handleSpeedTestInput(idle, idleDelete, 10), false);
assert.equal(idleDelete.prevented, true);
assert.equal(idle.activeStartedAtMs, null);
assert.equal(idle.metrics.backspaces, 0);
assert.equal(idle.metrics.wordDeletes, 0);

state = createSpeedTestRuntime({
  config: getSpeedTestConfig("time-15"),
  wordPool: pool,
  attemptSeed: 2,
});
state.words.splice(0, state.words.length, "cat");
for (const key of "catzzz") handleSpeedTestInput(state, event(key), 100);
assert.equal(state.metrics.extraCharacters, 3);
assert.equal(state.metrics.incorrectKeystrokes, 3);

console.log("Typing Test input, correction history, commit, missing, punctuation, and extra-character tests passed.");

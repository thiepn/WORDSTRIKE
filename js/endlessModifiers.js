import {
  BLACKOUT_ID,
  QUICK_FINGERS_ID,
} from "./modifiers.js";
import { createSeededRandom, mixSeed } from "./random.js";

export const ENDLESS_MODIFIERS = Object.freeze([
  QUICK_FINGERS_ID,
  BLACKOUT_ID,
]);

export function getEndlessModifierForStage({ stage, seed, previousModifier = null } = {}) {
  if (stage === 5) return QUICK_FINGERS_ID;
  if (stage === 10) return null;
  if (stage === 15) return BLACKOUT_ID;
  if (!Number.isInteger(stage) || stage < 20 || stage % 5 !== 0) return null;
  const options = ENDLESS_MODIFIERS.filter((id) => id !== previousModifier);
  const random = createSeededRandom(mixSeed(seed, Math.imul(stage, 0x45d9f3b)));
  return options[Math.floor(random() * options.length)] || QUICK_FINGERS_ID;
}

export function getNextEndlessModifierStage(stage) {
  if (stage < 5) return 5;
  if (stage < 15) return 15;
  if (stage < 20) return 20;
  return Math.ceil((stage + 1) / 5) * 5;
}

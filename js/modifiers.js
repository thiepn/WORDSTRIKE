export const MODIFIERS = Object.freeze({
  QUICK_FINGERS: Object.freeze({
    id: "quick-fingers",
    name: "Quick Fingers",
    shortLabel: "QUICK",
    description: "Spawn intervals are temporarily halved during burst windows.",
    unlockLevel: 20,
    implemented: true,
  }),
  NO_BACKSPACE: Object.freeze({
    id: "no-backspace",
    name: "No Backspace",
    shortLabel: "NO BKSP",
    description: "One wrong key corrupts the active target. Corrupted words cannot be recovered.",
    unlockLevel: 40,
    implemented: true,
  }),
  BLACKOUT: Object.freeze({
    id: "blackout",
    name: "Blackout",
    shortLabel: "BLACKOUT",
    description: "Words fade after appearing and must be remembered.",
    unlockLevel: 60,
    implemented: false,
  }),
  CHAIN: Object.freeze({
    id: "chain",
    name: "Chain",
    shortLabel: "CHAIN",
    description: "Losing the combo ends the level.",
    unlockLevel: 80,
    implemented: false,
  }),
});

export const QUICK_FINGERS_ID = MODIFIERS.QUICK_FINGERS.id;
export const NO_BACKSPACE_ID = MODIFIERS.NO_BACKSPACE.id;

export function hasQuickFingers(level) {
  return getModifiersForLevel(level).includes(QUICK_FINGERS_ID);
}

export function getModifiersForLevel(level) {
  if (
    !Number.isInteger(level) ||
    level < MODIFIERS.QUICK_FINGERS.unlockLevel ||
    level % 10 === 0 ||
    level % 5 !== 2
  ) {
    return [];
  }
  if (level < MODIFIERS.NO_BACKSPACE.unlockLevel) return [QUICK_FINGERS_ID];
  const slotIndex = Math.floor((level - 42) / 5);
  return [slotIndex % 2 === 0 ? NO_BACKSPACE_ID : QUICK_FINGERS_ID];
}

export function getModifierById(id) {
  return Object.values(MODIFIERS).find((modifier) => modifier.id === id) || null;
}

export function getQuickFingersPhase(activeElapsedMs) {
  const elapsed = Number.isFinite(activeElapsedMs) ? Math.max(0, activeElapsedMs) : 0;
  if (elapsed < 6000) {
    return {
      active: false,
      phase: "waiting",
      remainingMs: 6000 - elapsed,
      burstCount: 0,
    };
  }

  const cycleElapsed = elapsed - 6000;
  const position = cycleElapsed % 12000;
  const completedCycles = Math.floor(cycleElapsed / 12000);
  if (position < 4000) {
    return {
      active: true,
      phase: "burst",
      remainingMs: 4000 - position,
      burstCount: completedCycles + 1,
    };
  }
  return {
    active: false,
    phase: "cooldown",
    remainingMs: 12000 - position,
    burstCount: completedCycles + 1,
  };
}

export function getEffectiveSpawnInterval(baseIntervalMs, quickFingersActive) {
  const safeBase = Number.isFinite(baseIntervalMs) ? Math.max(0, baseIntervalMs) : 0;
  return quickFingersActive ? Math.max(150, safeBase * 0.5) : safeBase;
}

export function applyForcedModifier(level, modifiers, forcedModifierId) {
  const assigned = Array.isArray(modifiers) ? [...modifiers] : [];
  const forcedModifier = getModifierById(forcedModifierId);
  if (
    level % 10 === 0 ||
    !forcedModifier?.implemented ||
    ![QUICK_FINGERS_ID, NO_BACKSPACE_ID].includes(forcedModifierId)
  ) {
    return assigned;
  }
  return [forcedModifierId];
}

export function isForcedModifierRequested(search = "") {
  const requested = new URLSearchParams(search).get("modifier");
  return [QUICK_FINGERS_ID, NO_BACKSPACE_ID].includes(requested) ? requested : null;
}

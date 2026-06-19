import { isBetterGrade } from "./scoring.js";

const STORAGE_KEY = "wordstrike_save";

export function createDefaultSave() {
  return {
    currentFurthestLevel: 1,
    levels: {},
    settings: {
      screenShake: true,
      particles: true,
      strictMode: false,
    },
  };
}

function validateSave(value) {
  const defaults = createDefaultSave();
  if (!value || typeof value !== "object") return defaults;
  return {
    currentFurthestLevel: Math.max(1, Number(value.currentFurthestLevel) || 1),
    levels: value.levels && typeof value.levels === "object" ? value.levels : {},
    settings: {
      screenShake: value.settings?.screenShake !== false,
      particles: value.settings?.particles !== false,
      strictMode: value.settings?.strictMode === true,
    },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const save = raw ? validateSave(JSON.parse(raw)) : createDefaultSave();
    saveGame(save);
    return save;
  } catch {
    const save = createDefaultSave();
    saveGame(save);
    return save;
  }
}

export function saveGame(save) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function updateLevelResult(save, levelNumber, result) {
  const key = String(levelNumber);
  const previous = save.levels[key];
  const next = {
    grade: previous?.grade || result.grade,
    bestWPM: Math.max(previous?.bestWPM || 0, result.wpm),
    bestAccuracy: Math.max(previous?.bestAccuracy || 0, result.accuracy),
    bestScore: Math.max(previous?.bestScore || 0, result.score),
    maxCombo: Math.max(previous?.maxCombo || 0, result.maxCombo),
  };
  if (!previous || isBetterGrade(result.grade, previous.grade)) {
    next.grade = result.grade;
  }
  save.levels[key] = next;
  save.currentFurthestLevel = Math.max(save.currentFurthestLevel, levelNumber + 1);
  saveGame(save);
}

export function updateSetting(save, setting, value) {
  save.settings[setting] = Boolean(value);
  saveGame(save);
}

export function resetProgress(save) {
  save.currentFurthestLevel = 1;
  save.levels = {};
  saveGame(save);
}

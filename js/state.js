export const Screens = Object.freeze({
  TITLE: "TITLE",
  LEVEL_SELECT: "LEVEL_SELECT",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  RESULTS: "RESULTS",
  SETTINGS: "SETTINGS",
});

export const appState = {
  screen: Screens.TITLE,
  previousScreen: Screens.TITLE,
  devMode: false,
  forcedModifierId: null,
  save: null,
  wordBank: null,
  bossPhraseBank: null,
  currentLevel: 1,
  game: null,
  results: null,
  menuIndex: 0,
  levelSelection: 1,
  pauseIndex: 0,
  resultsIndex: 0,
  settingsIndex: 0,
};

export function isDevelopmentMode(search = "") {
  return new URLSearchParams(search).get("dev") === "1";
}

export function shouldPersistLevelResult(devMode, legitimatelyUnlocked) {
  return !devMode && legitimatelyUnlocked;
}

export function canLaunchLevel(devMode, currentFurthestLevel, levelNumber) {
  return (
    Number.isInteger(levelNumber) &&
    levelNumber >= 1 &&
    levelNumber <= 100 &&
    (devMode || levelNumber <= currentFurthestLevel)
  );
}

export function moveLevelGridSelection(currentLevel, key, maximumLevel = 100) {
  const delta = key === "ArrowLeft" ? -1
    : key === "ArrowRight" ? 1
      : key === "ArrowUp" ? -10
        : key === "ArrowDown" ? 10
          : 0;
  return Math.max(1, Math.min(maximumLevel, currentLevel + delta));
}

export function changeScreen(nextScreen, { remember = true } = {}) {
  if (remember && nextScreen === Screens.SETTINGS) {
    appState.previousScreen = appState.screen;
  }
  appState.screen = nextScreen;
}

export function returnFromSettings() {
  appState.screen = appState.previousScreen || Screens.TITLE;
}

export const Screens = Object.freeze({
  TITLE: "TITLE",
  MODE_SELECT: "MODE_SELECT",
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
  developerSeed: null,
  save: null,
  wordBank: null,
  bossWordBank: null,
  currentLevel: 1,
  game: null,
  results: null,
  menuIndex: 0,
  modeSelection: 0,
  levelSelection: 1,
  pauseIndex: 0,
  resultsIndex: 0,
  resultsReadyAt: 0,
  settingsIndex: 0,
};

export function getResultsActions(result) {
  const cleared = result?.grade !== "Fail";
  return [
    "retry",
    ...(cleared && result.levelNumber < 100 ? ["next"] : []),
    "levels",
  ];
}

export function getDefaultResultsIndex(result) {
  const actions = getResultsActions(result);
  if (result?.grade === "Fail") return actions.indexOf("retry");
  return actions.indexOf(result?.levelNumber < 100 ? "next" : "levels");
}

export function isResultsInputBlocked(event, nowMs, readyAtMs) {
  return event?.repeat === true || nowMs < readyAtMs;
}

export function clearAttemptRuntime(game) {
  if (!game) return;
  game.activeTargetId = null;
  if (game.mode === "normal") {
    game.targetingState = {
      mode: "idle",
      prefix: "",
      candidateIds: [],
      activeTargetId: null,
      startedAtActiveMs: null,
    };
    if (Array.isArray(game.words)) game.words.length = 0;
    if (Array.isArray(game.wordQueue)) game.wordQueue.length = 0;
    game.modifierRuntime = null;
    delete game.blackoutStats;
    delete game.chainRuntime;
    delete game.failureReason;
    game.abandonedWordCount = 0;
    game.abandonedCharacters = 0;
  } else if (game.mode === "boss") {
    if (Array.isArray(game.segments)) game.segments.length = 0;
    if (Array.isArray(game.phrases)) game.phrases.length = 0;
    game.currentPhrase = "";
    game.transitionElapsedMs = 0;
  }
}

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

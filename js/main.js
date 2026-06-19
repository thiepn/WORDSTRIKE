import {
  appState,
  canLaunchLevel,
  changeScreen,
  isDevelopmentMode,
  moveLevelGridSelection,
  returnFromSettings,
  Screens,
  shouldPersistLevelResult,
} from "./state.js";
import { generateLevel } from "./levelGenerator.js";
import { loadSave, resetProgress, updateLevelResult, updateSetting } from "./storage.js";
import { loadWordBank, selectWordsForLevel } from "./wordBank.js";
import { calculateAccuracy, calculateGrade, calculateWPM } from "./scoring.js";
import { handleGameplayKey } from "./input.js";
import { resumeGameLoop, startLevelLoop, stopGameLoop } from "./gameLoop.js";
import {
  hidePauseOverlay,
  renderGameplayShell,
  renderLevelSelect,
  renderDevModeIndicator,
  renderResults,
  renderSettings,
  renderTitle,
  showPauseOverlay,
  updateHud,
} from "./ui.js";

const titleActions = ["start", "levels", "settings"];

function openTitle() {
  stopGameLoop();
  changeScreen(Screens.TITLE);
  appState.menuIndex = 0;
  renderCurrentScreen();
}

function openLevelSelect() {
  stopGameLoop();
  changeScreen(Screens.LEVEL_SELECT);
  const selectionLimit = appState.devMode ? 100 : appState.save.currentFurthestLevel;
  appState.levelSelection = Math.min(appState.currentLevel || 1, selectionLimit, 100);
  renderCurrentScreen();
}

function openSettings() {
  changeScreen(Screens.SETTINGS);
  appState.settingsIndex = 0;
  renderCurrentScreen();
}

function backFromSettings() {
  returnFromSettings();
  renderCurrentScreen();
}

function startLevel(levelNumber) {
  const safeLevel = Math.max(1, Math.min(100, levelNumber));
  const legitimatelyUnlocked = safeLevel <= appState.save.currentFurthestLevel;
  if (!canLaunchLevel(appState.devMode, appState.save.currentFurthestLevel, safeLevel)) return;
  stopGameLoop();
  appState.currentLevel = safeLevel;
  const config = generateLevel(safeLevel);
  const words = selectWordsForLevel(appState.wordBank, config, safeLevel);
  changeScreen(Screens.PLAYING);
  renderGameplayShell(safeLevel, config.lives);
  const game = startLevelLoop(safeLevel, config, words, {
    onHudUpdate: updateHud,
    onEnd: finishLevel,
  });
  game.persistResult = shouldPersistLevelResult(appState.devMode, legitimatelyUnlocked);
}

function finishLevel(game, success) {
  const wpm = calculateWPM(game.correctCharacters, game.elapsedMs);
  const accuracy = calculateAccuracy(game.correctKeystrokes, game.totalKeystrokes);
  const grade = calculateGrade({
    accuracy,
    actualWPM: wpm,
    targetWPM: game.config.targetWPM,
    livesRemaining: game.lives,
    startingLives: game.config.lives,
    maxComboAchieved: game.maxCombo,
    wordCount: game.config.wordCount,
    failed: !success,
  });
  appState.results = {
    grade,
    wpm,
    accuracy,
    maxCombo: game.maxCombo,
    score: game.score,
    livesRemaining: game.lives,
    startingLives: game.config.lives,
    levelNumber: game.levelNumber,
  };
  if (success && game.persistResult) {
    updateLevelResult(appState.save, game.levelNumber, appState.results);
  }
  appState.resultsIndex = 0;
  changeScreen(Screens.RESULTS);
  renderCurrentScreen();
}

function pauseGame() {
  if (appState.screen !== Screens.PLAYING) return;
  changeScreen(Screens.PAUSED);
  appState.pauseIndex = 0;
  showPauseOverlay(appState.pauseIndex, { resume: resumeGame, levels: openLevelSelect });
}

function resumeGame() {
  if (appState.screen !== Screens.PAUSED) return;
  hidePauseOverlay();
  changeScreen(Screens.PLAYING);
  resumeGameLoop();
}

function activateTitleAction() {
  const action = titleActions[appState.menuIndex];
  if (action === "start") startLevel(appState.save.currentFurthestLevel);
  if (action === "levels") openLevelSelect();
  if (action === "settings") openSettings();
}

function toggleSetting(key) {
  updateSetting(appState.save, key, !appState.save.settings[key]);
  renderCurrentScreen();
}

function confirmReset() {
  if (window.confirm("Reset all level progress? Settings will be kept.")) {
    resetProgress(appState.save);
    appState.currentLevel = 1;
    renderCurrentScreen();
  }
}

function renderCurrentScreen() {
  if (appState.screen === Screens.TITLE) {
    renderTitle(appState.menuIndex, {
      start: () => startLevel(appState.save.currentFurthestLevel),
      levels: openLevelSelect,
      settings: openSettings,
    });
  } else if (appState.screen === Screens.LEVEL_SELECT) {
    renderLevelSelect(appState.save, appState.levelSelection, appState.devMode, {
      back: openTitle,
      select: startLevel,
      devInspect: inspectDevLevel,
      devLaunch: startLevel,
    });
  } else if (appState.screen === Screens.RESULTS) {
    renderResults(appState.results, appState.resultsIndex, {
      retry: () => startLevel(appState.results.levelNumber),
      next: () => startLevel(appState.results.levelNumber + 1),
      levels: openLevelSelect,
    });
  } else if (appState.screen === Screens.SETTINGS) {
    renderSettings(appState.save, appState.settingsIndex, {
      toggle: toggleSetting,
      reset: confirmReset,
      back: backFromSettings,
    });
  }
  document.querySelector(".dev-mode-indicator")?.remove();
  if (appState.devMode) renderDevModeIndicator();
}

function moveLevelSelection(key) {
  const selectionLimit = appState.devMode ? 100 : appState.save.currentFurthestLevel;
  appState.levelSelection = moveLevelGridSelection(
    appState.levelSelection,
    key,
    Math.min(100, selectionLimit),
  );
  renderCurrentScreen();
}

function inspectDevLevel(levelNumber) {
  if (!appState.devMode || !Number.isFinite(levelNumber)) return;
  appState.levelSelection = Math.max(1, Math.min(100, Math.round(levelNumber)));
  renderCurrentScreen();
  const input = document.querySelector("#dev-level-input");
  input?.focus();
}

function handleGlobalKeydown(event) {
  if (appState.screen === Screens.PLAYING) {
    if (event.key === "Escape") {
      event.preventDefault();
      pauseGame();
      return;
    }
    handleGameplayKey(event, appState.game, appState.save.settings, updateHud);
    updateHud(appState.game);
    return;
  }

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape"].includes(event.key)) {
    event.preventDefault();
  }

  if (appState.screen === Screens.PAUSED) {
    if (event.key === "Escape") {
      resumeGame();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      appState.pauseIndex = appState.pauseIndex === 0 ? 1 : 0;
      showPauseOverlay(appState.pauseIndex, { resume: resumeGame, levels: openLevelSelect });
    } else if (event.key === "Enter") {
      appState.pauseIndex === 0 ? resumeGame() : openLevelSelect();
    }
    return;
  }

  if (appState.screen === Screens.TITLE) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      appState.menuIndex = (appState.menuIndex + direction + titleActions.length) % titleActions.length;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      activateTitleAction();
    }
    return;
  }

  if (appState.screen === Screens.LEVEL_SELECT) {
    if (event.key.startsWith("Arrow")) moveLevelSelection(event.key);
    if (event.key === "Enter") startLevel(appState.levelSelection);
    if (event.key === "Escape") openTitle();
    return;
  }

  if (appState.screen === Screens.RESULTS) {
    const canAdvance = appState.results.grade !== "Fail" && appState.results.levelNumber < 100;
    const actionCount = canAdvance ? 3 : 2;
    if (event.key === "Escape") {
      openLevelSelect();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      appState.resultsIndex = (appState.resultsIndex + direction + actionCount) % actionCount;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      if (appState.resultsIndex === 0) startLevel(appState.results.levelNumber);
      else if (canAdvance && appState.resultsIndex === 1) startLevel(appState.results.levelNumber + 1);
      else openLevelSelect();
    }
    return;
  }

  if (appState.screen === Screens.SETTINGS) {
    if (event.key === "Escape") {
      backFromSettings();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      appState.settingsIndex = (appState.settingsIndex + direction + 5) % 5;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      const keys = ["strictMode", "particles", "screenShake"];
      if (appState.settingsIndex < 3) toggleSetting(keys[appState.settingsIndex]);
      if (appState.settingsIndex === 3) confirmReset();
      if (appState.settingsIndex === 4) backFromSettings();
    }
  }
}

async function bootstrap() {
  appState.devMode = isDevelopmentMode(window.location.search);
  appState.save = loadSave();
  appState.wordBank = await loadWordBank();
  document.addEventListener("keydown", handleGlobalKeydown);
  renderCurrentScreen();
}

bootstrap();

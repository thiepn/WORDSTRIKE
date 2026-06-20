import {
  appState,
  canLaunchLevel,
  changeScreen,
  clearAttemptRuntime,
  isDevelopmentMode,
  getDefaultResultsIndex,
  getResultsActions,
  isResultsInputBlocked,
  moveLevelGridSelection,
  returnFromSettings,
  Screens,
  shouldPersistLevelResult,
} from "./state.js";
import {
  calculateBossTiming,
  generateBossLevel,
  generateLevel,
} from "./levelGenerator.js";
import { loadSave, resetProgress, updateLevelResult, updateSetting } from "./storage.js";
import {
  loadBossPhraseBank,
  loadWordBank,
  selectBossPhrases,
  createNormalWordAttempt,
} from "./wordBank.js";
import { calculateAccuracy, calculateGrade, calculateWPM } from "./scoring.js";
import { handleBossKey, handleGameplayKey } from "./input.js";
import { resumeGameLoop, startLevelLoop, stopGameLoop } from "./gameLoop.js";
import {
  completeBossPhrase,
  resumeBossLoop,
  startBossLoop,
  stopBossLoop,
} from "./bossLoop.js";
import {
  applyForcedModifier,
  BLACKOUT_ID,
  isForcedModifierRequested,
  NO_BACKSPACE_ID,
  QUICK_FINGERS_ID,
} from "./modifiers.js";
import { createAttemptSeed, parseDeveloperSeed } from "./random.js";
import {
  hidePauseOverlay,
  renderBossShell,
  renderGameplayShell,
  renderLevelSelect,
  renderDevModeIndicator,
  renderResults,
  renderSettings,
  renderTitle,
  showPauseOverlay,
  updateBossHud,
  updateHud,
} from "./ui.js";

const titleActions = ["start", "levels", "settings"];
const currentTimeMs = () => globalThis.performance?.now?.() ?? Date.now();

function stopActiveLoops() {
  stopGameLoop();
  stopBossLoop();
}

function discardActiveAttempt() {
  clearAttemptRuntime(appState.game);
}

function getAttemptSeed() {
  return appState.devMode && appState.developerSeed
    ? appState.developerSeed
    : createAttemptSeed();
}

function openTitle() {
  stopActiveLoops();
  discardActiveAttempt();
  appState.game = null;
  appState.pauseIndex = 0;
  changeScreen(Screens.TITLE);
  appState.menuIndex = 0;
  renderCurrentScreen();
}

function openLevelSelect() {
  stopActiveLoops();
  discardActiveAttempt();
  appState.game = null;
  appState.pauseIndex = 0;
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
  stopActiveLoops();
  appState.currentLevel = safeLevel;
  if (safeLevel % 10 === 0) {
    startBossLevel(safeLevel, legitimatelyUnlocked);
    return;
  }
  const baseConfig = generateLevel(safeLevel);
  const modifiers = applyForcedModifier(
    safeLevel,
    baseConfig.modifiers,
    appState.devMode ? appState.forcedModifierId : null,
  );
  const config = { ...baseConfig, modifiers };
  const forcedModifier = (
    appState.devMode &&
    [QUICK_FINGERS_ID, NO_BACKSPACE_ID, BLACKOUT_ID].includes(appState.forcedModifierId) &&
    safeLevel % 10 !== 0
  );
  const attemptSeed = getAttemptSeed();
  const attempt = createNormalWordAttempt(appState.wordBank, config, attemptSeed);
  changeScreen(Screens.PLAYING);
  renderGameplayShell(
    safeLevel,
    config.lives,
    config,
    appState.devMode,
    forcedModifier,
    { attemptSeed, ...attempt },
  );
  const game = startLevelLoop(
    safeLevel,
    config,
    attempt.spawnQueue,
    {
      onHudUpdate: updateHud,
      onEnd: finishLevel,
    },
    { attemptSeed, selectedWords: attempt.selectedWords },
  );
  game.persistResult = shouldPersistLevelResult(appState.devMode, legitimatelyUnlocked);
  game.forcedModifier = forcedModifier;
  game.devMode = appState.devMode;
}

function startBossLevel(levelNumber, legitimatelyUnlocked) {
  const baseConfig = generateBossLevel(levelNumber);
  const attemptSeed = getAttemptSeed();
  const phrases = selectBossPhrases(appState.bossPhraseBank, baseConfig, attemptSeed);
  const timing = calculateBossTiming(levelNumber, phrases);
  const config = {
    ...baseConfig,
    attemptSeed,
    baselineTimeLimitSec: baseConfig.timeLimitSec,
    timeLimitSec: timing.effectiveTimeLimitSec,
    ...timing,
  };
  changeScreen(Screens.PLAYING);
  renderBossShell(levelNumber, config, appState.devMode, { attemptSeed, phrases });
  const game = startBossLoop(levelNumber, config, phrases, {
    onUpdate: updateBossHud,
    onEnd: finishLevel,
  });
  game.persistResult = shouldPersistLevelResult(appState.devMode, legitimatelyUnlocked);
  game.attemptSeed = attemptSeed;
}

function finishLevel(game, success) {
  const wpm = calculateWPM(game.correctCharacters, game.elapsedMs);
  const accuracy = calculateAccuracy(
    game.correctKeystrokes,
    game.totalKeystrokes,
    game.missedCharacters,
  );
  const grade = calculateGrade({
    accuracy,
    failed: !success,
  });
  const isBoss = game.mode === "boss";
  appState.results = {
    grade,
    wpm,
    accuracy,
    maxCombo: game.maxCombo,
    score: game.score,
    livesRemaining: isBoss ? 0 : game.lives,
    startingLives: isBoss ? 0 : game.config.lives,
    levelNumber: game.levelNumber,
    isBoss,
    timeRemaining: isBoss ? game.remainingMs / 1000 : 0,
    phrasesCompleted: isBoss ? game.phrasesCompleted : 0,
    phraseCount: isBoss ? game.phrases.length : 0,
    modifierIds: isBoss ? [] : [...(game.config.modifiers || [])],
    burstCount: isBoss ? 0 : game.modifierRuntime?.quickFingers?.burstCount || 0,
    abandonedWordCount: isBoss ? 0 : game.abandonedWordCount || 0,
    abandonedCharacters: isBoss ? 0 : game.abandonedCharacters || 0,
    wordsHidden: isBoss ? 0 : game.blackoutStats?.wordsHidden || 0,
    hiddenWordsCompleted: isBoss ? 0 : game.blackoutStats?.hiddenWordsCompleted || 0,
    wordsMissedAfterFade: isBoss ? 0 : game.blackoutStats?.wordsMissedAfterFade || 0,
  };
  if (success && game.persistResult) {
    updateLevelResult(appState.save, game.levelNumber, appState.results);
  }
  appState.resultsIndex = getDefaultResultsIndex(appState.results);
  appState.resultsReadyAt = currentTimeMs() + 200;
  changeScreen(Screens.RESULTS);
  renderCurrentScreen();
}

function pauseGame() {
  if (appState.screen !== Screens.PLAYING) return;
  changeScreen(Screens.PAUSED);
  appState.pauseIndex = 0;
  renderPauseOverlay();
}

function retryCurrentLevel() {
  startLevel(appState.currentLevel);
}

function renderPauseOverlay() {
  showPauseOverlay(appState.pauseIndex, {
    resume: resumeGame,
    retry: retryCurrentLevel,
    levels: openLevelSelect,
    title: openTitle,
    select: (index) => { appState.pauseIndex = index; },
  });
}

function resumeGame() {
  if (appState.screen !== Screens.PAUSED) return;
  hidePauseOverlay();
  changeScreen(Screens.PLAYING);
  if (appState.game?.mode === "boss") resumeBossLoop();
  else resumeGameLoop();
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
    renderLevelSelect(
      appState.save,
      appState.levelSelection,
      appState.devMode,
      appState.bossPhraseBank,
      appState.forcedModifierId,
      appState.developerSeed,
      {
      back: openTitle,
      select: startLevel,
      devInspect: inspectDevLevel,
      devLaunch: startLevel,
      devForceModifier: setForcedModifier,
      },
    );
  } else if (appState.screen === Screens.RESULTS) {
    renderResults(appState.results, appState.resultsIndex, {
      retry: () => startLevel(appState.results.levelNumber),
      next: () => startLevel(appState.results.levelNumber + 1),
      levels: openLevelSelect,
      select: (index) => { appState.resultsIndex = index; },
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

function setForcedModifier(modifierId) {
  if (!appState.devMode || appState.levelSelection % 10 === 0) return;
  appState.forcedModifierId = appState.forcedModifierId === modifierId
    ? null
    : modifierId;
  renderCurrentScreen();
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
    if (appState.game?.mode === "boss") {
      handleBossKey(event, appState.game, appState.save.settings, completeBossPhrase);
      updateBossHud(appState.game);
    } else {
      handleGameplayKey(event, appState.game, appState.save.settings, updateHud);
      updateHud(appState.game);
    }
    return;
  }

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape"].includes(event.key)) {
    event.preventDefault();
  }

  if (appState.screen === Screens.PAUSED) {
    if (event.key === "Escape") {
      resumeGame();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      appState.pauseIndex = (appState.pauseIndex + direction + 4) % 4;
      renderPauseOverlay();
    } else if (event.key === "Enter") {
      [resumeGame, retryCurrentLevel, openLevelSelect, openTitle][appState.pauseIndex]();
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
    const actions = getResultsActions(appState.results);
    if (isResultsInputBlocked(event, currentTimeMs(), appState.resultsReadyAt)) return;
    if (event.key === "Escape") {
      openLevelSelect();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      appState.resultsIndex = (
        appState.resultsIndex + direction + actions.length
      ) % actions.length;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      const action = actions[appState.resultsIndex];
      if (action === "retry") startLevel(appState.results.levelNumber);
      else if (action === "next") startLevel(appState.results.levelNumber + 1);
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
  appState.developerSeed = appState.devMode
    ? parseDeveloperSeed(window.location.search)
    : null;
  appState.forcedModifierId = appState.devMode
    ? isForcedModifierRequested(window.location.search)
    : null;
  appState.save = loadSave();
  [appState.wordBank, appState.bossPhraseBank] = await Promise.all([
    loadWordBank(),
    loadBossPhraseBank(),
  ]);
  document.addEventListener("keydown", handleGlobalKeydown);
  renderCurrentScreen();
}

bootstrap();

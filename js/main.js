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
  generateBossLevel,
  generateLevel,
} from "./levelGenerator.js";
import { generateBossEncounter } from "./bossGenerator.js";
import { loadSave, resetProgress, updateLevelResult, updateSetting } from "./storage.js";
import {
  loadBossWordBank,
  loadWordBank,
  createNormalWordAttempt,
} from "./wordBank.js";
import { calculateGrade } from "./scoring.js";
import {
  calculateSessionAccuracy,
  calculateSessionWpm,
} from "./sessionMetrics.js";
import { handleBossKey, handleGameplayKey } from "./input.js";
import {
  finalizeChainFailure,
  resumeGameLoop,
  startLevelLoop,
  stopGameLoop,
} from "./gameLoop.js";
import {
  completeBossPhrase,
  resumeBossLoop,
  startBossLoop,
  stopBossLoop,
} from "./bossLoop.js";
import {
  applyForcedModifier,
  BLACKOUT_ID,
  CHAIN_ID,
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
  renderModeSelect,
  renderDevModeIndicator,
  renderDevSessionDiagnostics,
  renderResults,
  renderSettings,
  renderTitle,
  showPauseOverlay,
  updateBossHud,
  updateHud,
} from "./ui.js";
import { getAllModes, isModeEnabled, MODE_IDS } from "./modes.js";
import {
  beginCampaignSession,
  finalizeCampaignSession,
  syncCampaignSession,
} from "./campaignSession.js";
import {
  clearSession,
  pauseSession,
  resumeSession,
} from "./sessionManager.js";
import { cleanupCurrentSession } from "./sessionCleanup.js";

const titleActions = ["modes", "settings"];
const currentTimeMs = () => globalThis.performance?.now?.() ?? Date.now();

function stopActiveLoops() {
  stopGameLoop();
  stopBossLoop();
}

function discardActiveAttempt() {
  clearAttemptRuntime(appState.game);
}

function cleanupCampaignAttempt(reason, { clearSessionState = true } = {}) {
  cleanupCurrentSession({
    reason,
    stopGameplay: stopActiveLoops,
    hidePause: hidePauseOverlay,
    clearRuntime: discardActiveAttempt,
    clearSessionState,
  });
  appState.game = null;
  appState.pauseIndex = 0;
}

function getAttemptSeed() {
  return appState.devMode && appState.developerSeed
    ? appState.developerSeed
    : createAttemptSeed();
}

function openTitle() {
  cleanupCampaignAttempt("main-menu");
  changeScreen(Screens.TITLE);
  appState.menuIndex = 0;
  renderCurrentScreen();
}

function openModeSelect() {
  cleanupCampaignAttempt("mode-select");
  changeScreen(Screens.MODE_SELECT);
  appState.modeSelection = 0;
  renderCurrentScreen();
}

function openLevelSelect(reason = "level-select") {
  cleanupCampaignAttempt(reason);
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

function startLevel(levelNumber, source = "level-select") {
  const safeLevel = Math.max(1, Math.min(100, levelNumber));
  const legitimatelyUnlocked = safeLevel <= appState.save.currentFurthestLevel;
  if (!canLaunchLevel(appState.devMode, appState.save.currentFurthestLevel, safeLevel)) return;
  cleanupCampaignAttempt(source === "retry" ? "retry" : "new-session");
  appState.currentLevel = safeLevel;
  if (safeLevel % 10 === 0) {
    startBossLevel(safeLevel, legitimatelyUnlocked, source);
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
    [QUICK_FINGERS_ID, NO_BACKSPACE_ID, BLACKOUT_ID, CHAIN_ID].includes(appState.forcedModifierId) &&
    safeLevel % 10 !== 0
  );
  const attemptSeed = getAttemptSeed();
  const attempt = createNormalWordAttempt(appState.wordBank, config, attemptSeed);
  beginCampaignSession({
    level: safeLevel,
    isBoss: false,
    seed: attemptSeed,
    source: appState.devMode ? "developer" : source,
    developerMode: appState.devMode,
    modifierId: config.modifiers?.[0] || null,
    difficultyData: config,
  });
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
      onHudUpdate: (currentGame) => {
        syncCampaignSession(currentGame);
        updateHud(currentGame);
      },
      onEnd: finishLevel,
    },
    { attemptSeed, selectedWords: attempt.selectedWords },
  );
  game.persistResult = shouldPersistLevelResult(appState.devMode, legitimatelyUnlocked);
  game.forcedModifier = forcedModifier;
  game.devMode = appState.devMode;
  syncCampaignSession(game);
}

function startBossLevel(levelNumber, legitimatelyUnlocked, source) {
  const baseConfig = generateBossLevel(levelNumber);
  const attemptSeed = getAttemptSeed();
  const encounter = generateBossEncounter(
    appState.bossWordBank,
    levelNumber,
    attemptSeed,
  );
  const phrases = encounter.segments;
  const config = {
    ...baseConfig,
    attemptSeed,
    vocabularySource: appState.bossWordBank?.source || "dedicated",
    timeLimitSec: encounter.timing.effectiveTimeLimitSec,
    generationAttempt: encounter.generationAttempt,
    fallbackUsed: encounter.fallbackUsed,
    ...encounter.metrics,
    ...encounter.timing,
  };
  beginCampaignSession({
    level: levelNumber,
    isBoss: true,
    seed: attemptSeed,
    source: appState.devMode ? "developer" : source,
    developerMode: appState.devMode,
    difficultyData: config,
  });
  changeScreen(Screens.PLAYING);
  renderBossShell(levelNumber, config, appState.devMode, {
    attemptSeed,
    encounter,
  });
  const game = startBossLoop(levelNumber, config, phrases, {
    onUpdate: (currentGame) => {
      syncCampaignSession(currentGame);
      updateBossHud(currentGame);
    },
    onEnd: finishLevel,
  });
  game.persistResult = shouldPersistLevelResult(appState.devMode, legitimatelyUnlocked);
  game.attemptSeed = attemptSeed;
}

function finishLevel(game, success) {
  const wpm = calculateSessionWpm({
    characterCount: game.correctCharacters,
    activeDurationMs: game.elapsedMs,
  });
  const accuracy = calculateSessionAccuracy({
    correctKeystrokes: game.correctKeystrokes,
    totalKeystrokes: game.totalKeystrokes,
    missedCharacters: game.missedCharacters,
  });
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
    failureReason: isBoss ? null : game.failureReason || null,
    chainBroken: isBoss ? false : game.chainRuntime?.broken === true,
    chainBreakCause: isBoss ? null : game.chainRuntime?.breakCause || null,
    chainComboAtBreak: isBoss ? 0 : game.chainRuntime?.comboAtBreak || 0,
    chainFailedWordId: isBoss ? null : game.chainRuntime?.failedWordId ?? null,
  };
  finalizeCampaignSession(game, appState.results, success);
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
  pauseSession();
  appState.pauseIndex = 0;
  renderPauseOverlay();
}

function retryCurrentLevel() {
  startLevel(appState.currentLevel, "retry");
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
  resumeSession();
  if (appState.game?.mode === "boss") resumeBossLoop();
  else resumeGameLoop();
}

function activateTitleAction() {
  const action = titleActions[appState.menuIndex];
  if (action === "modes") openModeSelect();
  if (action === "settings") openSettings();
}

function activateSelectedMode(modeId = getAllModes()[appState.modeSelection]?.id) {
  if (!isModeEnabled(modeId)) return false;
  if (modeId === MODE_IDS.CAMPAIGN) {
    openLevelSelect("mode-select");
    return true;
  }
  return false;
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
      modes: openModeSelect,
      settings: openSettings,
    });
  } else if (appState.screen === Screens.MODE_SELECT) {
    renderModeSelect(getAllModes(), appState.modeSelection, {
      select: (index) => {
        if (appState.modeSelection === index) return;
        appState.modeSelection = index;
        renderCurrentScreen();
      },
      activate: activateSelectedMode,
    });
  } else if (appState.screen === Screens.LEVEL_SELECT) {
    renderLevelSelect(
      appState.save,
      appState.levelSelection,
      appState.devMode,
      appState.bossWordBank,
      appState.forcedModifierId,
      appState.developerSeed,
      {
      back: openModeSelect,
      select: (level) => startLevel(level, "level-select"),
      devInspect: inspectDevLevel,
      devLaunch: (level) => startLevel(level, "developer"),
      devForceModifier: setForcedModifier,
      },
    );
  } else if (appState.screen === Screens.RESULTS) {
    renderResults(appState.results, appState.resultsIndex, {
      retry: () => startLevel(appState.results.levelNumber, "retry"),
      next: () => startLevel(appState.results.levelNumber + 1, "next-level"),
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
  document.querySelector(".dev-session-diagnostics")?.remove();
  if (appState.devMode) {
    renderDevModeIndicator();
    renderDevSessionDiagnostics();
  }
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
      handleGameplayKey(
        event,
        appState.game,
        appState.save.settings,
        updateHud,
        finalizeChainFailure,
      );
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

  if (appState.screen === Screens.MODE_SELECT) {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      appState.modeSelection = (
        appState.modeSelection - 1 + getAllModes().length
      ) % getAllModes().length;
      renderCurrentScreen();
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      appState.modeSelection = (appState.modeSelection + 1) % getAllModes().length;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      activateSelectedMode();
    } else if (event.key === "Escape") {
      openTitle();
    }
    return;
  }

  if (appState.screen === Screens.LEVEL_SELECT) {
    if (event.key.startsWith("Arrow")) moveLevelSelection(event.key);
    if (event.key === "Enter") startLevel(appState.levelSelection);
    if (event.key === "Escape") openModeSelect();
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
      if (action === "retry") startLevel(appState.results.levelNumber, "retry");
      else if (action === "next") startLevel(appState.results.levelNumber + 1, "next-level");
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
  clearSession();
  appState.devMode = isDevelopmentMode(window.location.search);
  appState.developerSeed = appState.devMode
    ? parseDeveloperSeed(window.location.search)
    : null;
  appState.forcedModifierId = appState.devMode
    ? isForcedModifierRequested(window.location.search)
    : null;
  appState.save = loadSave();
  [appState.wordBank, appState.bossWordBank] = await Promise.all([
    loadWordBank(),
    loadBossWordBank(),
  ]);
  document.addEventListener("keydown", handleGlobalKeydown);
  renderCurrentScreen();
}

bootstrap();

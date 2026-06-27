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
  loadCommonWordBank,
  loadWordBank,
  createNormalWordAttempt,
} from "./wordBank.js";
import { loadSpeedTestWordBank } from "./speedTestWords.js";
import { calculateGrade } from "./scoring.js";
import {
  calculateSessionAccuracy,
  calculateSessionWpm,
} from "./sessionMetrics.js";
import { handleBossKey, handleGameplayKey } from "./input.js";
import {
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
import { createAttemptSeed, parseDeveloperSeed } from "./random.js";
import {
  clearSpeedTestLayout,
  hidePauseOverlay,
  renderBossShell,
  renderEndlessReady,
  renderEndlessResults,
  renderEndlessShell,
  renderDailyReady,
  renderDailyResults,
  renderDailyShell,
  renderGameplayShell,
  renderLevelSelect,
  renderModeSelect,
  renderSpeedTestResults,
  renderSpeedTestRun,
  renderDevModeIndicator,
  renderDevSessionDiagnostics,
  renderResults,
  renderSettings,
  renderTitle,
  showPauseOverlay,
  showEndlessPauseOverlay,
  showDailyPauseOverlay,
  showSpeedTestPauseOverlay,
  updateEndlessHud,
  updateDailyHud,
  updateBossHud,
  updateHud,
  updateSpeedTestRun,
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
import {
  DEFAULT_SPEED_TEST_CONFIG_ID,
  getSpeedTestConfig,
  normalizeSpeedTestConfigId,
  parseDeveloperSpeedTestConfig,
} from "./speedTestConfig.js";
import {
  clearSpeedTestRuntime,
  getCurrentSpeedTest,
  handleCurrentSpeedTestKey,
  pauseSpeedTest,
  resumeSpeedTest,
  startSpeedTest,
  stopSpeedTestLoop,
} from "./speedTest.js";
import { createEndlessVocabulary } from "./endlessWords.js";
import {
  clearEndlessRuntime,
  handleEndlessKey,
  resumeEndlessLoop,
  startEndlessRun,
  stopEndlessLoop,
} from "./endlessMode.js";
import { createDailyVocabulary, generateDailyPlan } from "./dailyGenerator.js";
import { getUtcDateKey, isValidDailyDateKey, parseDailyDateOverride } from "./dailyDate.js";
import {
  ensureStoredPlayerProfile,
  getDailyRecord,
  loadModeData,
  updateStoredDisplayName,
} from "./modeStorage.js";
import { copyPlayerIdToClipboard, validateDisplayName } from "./playerProfile.js";
import { getStatisticsSnapshot } from "./statistics.js";
import {
  renderProfileStatistics,
  STATISTICS_TABS,
  updateLeaderboardUsernameFeedback,
  updateProfileAuthSection,
} from "./statisticsUi.js";
import {
  clearDailyRuntime,
  handleDailyKey,
  resumeDailyLoop,
  startDailyRun,
  stopDailyLoop,
} from "./dailyMode.js";
import {
  attachAppClickListener,
  resolveAppClickAction,
} from "./appClickRouting.js";
import {
  getAuthState,
  initializeAuth,
  signInWithGoogle,
  signOut,
  subscribeToAuth,
} from "./authService.js";
import {
  cancelUsernameChange,
  changeUsername,
  checkUsernameAvailability,
  claimUsername,
  getLeaderboardProfileState,
  initializeLeaderboardProfile,
  resetLeaderboardProfile,
  setUsernameDraft,
  startUsernameChange,
  subscribeToLeaderboardProfile,
} from "./leaderboardProfileService.js";
import { isTextEntryTarget } from "./inputSafety.js";

const titleActions = ["modes", "profile", "settings"];
const currentTimeMs = () => globalThis.performance?.now?.() ?? Date.now();
let lastAuthUiKey = "";

function stopActiveLoops() {
  stopGameLoop();
  stopBossLoop();
  stopSpeedTestLoop();
  stopEndlessLoop();
  stopDailyLoop();
}

function discardActiveAttempt() {
  clearAttemptRuntime(appState.game);
  clearSpeedTestLayout();
  clearSpeedTestRuntime();
  clearEndlessRuntime();
  clearDailyRuntime();
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
  appState.profileEditing = false;
  renderCurrentScreen();
}

function openProfileStatistics() {
  cleanupCampaignAttempt("profile-stats");
  ensureStoredPlayerProfile();
  appState.statisticsTabIndex = 0;
  appState.statisticsRecentFilter = "all";
  appState.profileEditing = false;
  appState.profileDraft = "";
  appState.profileNameError = "";
  appState.profileCopyMessage = "";
  changeScreen(Screens.PROFILE_STATS);
  renderCurrentScreen();
}

function openModeSelect() {
  cleanupCampaignAttempt("mode-select");
  changeScreen(Screens.MODE_SELECT);
  appState.modeSelection = 0;
  renderCurrentScreen();
}

function openEndlessReady(reason = "endless-ready") {
  cleanupCampaignAttempt(reason);
  changeScreen(Screens.ENDLESS_READY);
  renderCurrentScreen();
}

function openDailyReady(reason = "daily-ready") {
  cleanupCampaignAttempt(reason);
  if (!appState.devMode || !appState.dailyDateOverride) {
    appState.dailyDateKey = getUtcDateKey();
  }
  appState.dailyResult = null;
  appState.dailyRecordFlags = null;
  changeScreen(Screens.DAILY_READY);
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
  const config = generateLevel(safeLevel);
  const attemptSeed = getAttemptSeed();
  const attempt = createNormalWordAttempt(appState.wordBank, config, attemptSeed);
  beginCampaignSession({
    level: safeLevel,
    isBoss: false,
    seed: attemptSeed,
    source: appState.devMode ? "developer" : source,
    developerMode: appState.devMode,
    difficultyData: config,
  });
  changeScreen(Screens.PLAYING);
  renderGameplayShell(
    safeLevel,
    config.lives,
    config,
    appState.devMode,
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
  game.devMode = appState.devMode;
  syncCampaignSession(game);
}

function finishSpeedTest(state, result) {
  if (!result || appState.screen === Screens.SPEED_TEST_RESULTS) return;
  appState.speedTestResult = result;
  appState.speedTestRecordFlags = { ...state.recordFlags };
  appState.speedTestResultsIndex = 1;
  appState.speedTestResultsReadyAt = currentTimeMs() + 200;
  changeScreen(Screens.SPEED_TEST_RESULTS);
  renderCurrentScreen();
}

function resetSpeedTestAttempt(source = "mode-select") {
  const config = getSpeedTestConfig(appState.speedTestConfigId)
    || getSpeedTestConfig(DEFAULT_SPEED_TEST_CONFIG_ID);
  cleanupCampaignAttempt(source === "retry" ? "retry" : "new-session");
  appState.speedTestResult = null;
  appState.speedTestRecordFlags = null;
  appState.speedTestResultsIndex = 0;
  appState.speedTestResultsReadyAt = 0;
  appState.pauseIndex = 0;
  const attemptSeed = getAttemptSeed();
  const state = startSpeedTest({
    config,
    wordPool: appState.speedTestWordBank.words,
    attemptSeed,
    developerMode: appState.devMode,
    source,
    deferSession: source === "change-test",
    onUpdate: updateSpeedTestRun,
    onComplete: finishSpeedTest,
  });
  if (!state) {
    openModeSelect();
    return;
  }
  changeScreen(Screens.SPEED_TEST_RUN);
  renderSpeedTestRun(state, appState.devMode, {
    selectConfig: changeSpeedTestConfig,
  });
  updateSpeedTestRun(state, currentTimeMs());
}

function finishEndless(game, result) {
  if (!result || appState.screen === Screens.ENDLESS_RESULTS) return;
  appState.endlessResult = result;
  appState.endlessResultsIndex = 0;
  appState.endlessResultsReadyAt = currentTimeMs() + 200;
  changeScreen(Screens.ENDLESS_RESULTS);
  renderCurrentScreen();
}

function finishDaily(game, result) {
  if (!result || appState.screen === Screens.DAILY_RESULTS) return;
  appState.dailyResult = result;
  appState.dailyRecordFlags = { ...game.recordFlags };
  appState.dailyResultsIndex = 0;
  appState.dailyResultsReadyAt = currentTimeMs() + 200;
  changeScreen(Screens.DAILY_RESULTS);
  renderCurrentScreen();
}

function startDaily(source = "daily-ready", dateKey = appState.dailyDateKey) {
  cleanupCampaignAttempt(source === "retry" ? "retry" : "new-session");
  const challengeDateKey = isValidDailyDateKey(dateKey) ? dateKey : getUtcDateKey();
  const vocabulary = createDailyVocabulary({
    commonWords: appState.commonWordBank.words,
    campaignBank: appState.wordBank,
  });
  const plan = generateDailyPlan({ dateKey: challengeDateKey, vocabulary });
  const game = startDailyRun({
    plan,
    developerMode: appState.devMode,
    dateOverride: appState.dailyDateOverride,
    source,
    onUpdate: updateDailyHud,
    onComplete: finishDaily,
  });
  if (!game) {
    openDailyReady("start-failed");
    return;
  }
  appState.dailyDateKey = challengeDateKey;
  changeScreen(Screens.PLAYING);
  renderDailyShell(game, appState.devMode);
  updateDailyHud(game);
}

function startEndless(source = "mode-select") {
  cleanupCampaignAttempt(["retry", "restart"].includes(source) ? source : "new-session");
  const game = startEndlessRun({
    seed: getAttemptSeed(),
    vocabulary: createEndlessVocabulary({
      commonWords: appState.commonWordBank.words,
      campaignBank: appState.wordBank,
      bossBank: appState.bossWordBank,
    }),
    startStage: appState.devMode ? appState.endlessStartStage : 1,
    recordEligible: !appState.devMode,
    developerMode: appState.devMode,
    source,
    onUpdate: updateEndlessHud,
    onComplete: finishEndless,
  });
  if (!game) {
    openEndlessReady("start-failed");
    return;
  }
  changeScreen(Screens.PLAYING);
  renderEndlessShell(game, appState.devMode);
  updateEndlessHud(game);
}

function changeSpeedTestConfig(configId) {
  const state = getCurrentSpeedTest();
  if (state?.phase === "ACTIVE") return;
  const next = normalizeSpeedTestConfigId(configId);
  if (next === appState.speedTestConfigId) return;
  appState.speedTestConfigId = next;
  resetSpeedTestAttempt("change-test");
}

function pauseTypingTest() {
  if (appState.screen !== Screens.SPEED_TEST_RUN) return;
  if (!pauseSpeedTest(currentTimeMs())) return;
  changeScreen(Screens.PAUSED);
  appState.pauseIndex = 0;
  renderPauseOverlay();
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
    tierPatterns: encounter.tierPatterns,
    tierCounts: encounter.tierCounts,
    wordSources: encounter.wordSources,
    targetSegmentCharacters: encounter.targetSegmentCharacters,
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
  if (appState.game?.mode === "endless") stopEndlessLoop();
  if (appState.game?.mode === "daily") stopDailyLoop();
  appState.pauseIndex = 0;
  renderPauseOverlay();
}

function retryCurrentLevel() {
  startLevel(appState.currentLevel, "retry");
}

function renderPauseOverlay() {
  if (getCurrentSpeedTest()?.phase === "PAUSED") {
    showSpeedTestPauseOverlay(appState.pauseIndex, {
      resume: resumeGame,
      retry: () => resetSpeedTestAttempt("retry"),
      quit: () => resetSpeedTestAttempt("quit-test"),
      title: openTitle,
      select: (index) => { appState.pauseIndex = index; },
    });
    return;
  }
  if (appState.game?.mode === "endless") {
    showEndlessPauseOverlay(appState.pauseIndex, {
      resume: resumeGame,
      restart: () => startEndless("restart"),
      modes: openModeSelect,
      title: openTitle,
      select: (index) => { appState.pauseIndex = index; },
    });
    return;
  }
  if (appState.game?.mode === "daily") {
    showDailyPauseOverlay(appState.pauseIndex, {
      resume: resumeGame,
      retry: () => startDaily("retry", appState.game.config.dateKey),
      modes: openModeSelect,
      title: openTitle,
      select: (index) => { appState.pauseIndex = index; },
    });
    return;
  }
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
  if (getCurrentSpeedTest()?.phase === "PAUSED") {
    changeScreen(Screens.SPEED_TEST_RUN);
    resumeSpeedTest(currentTimeMs());
    updateSpeedTestRun(getCurrentSpeedTest(), currentTimeMs());
    return;
  }
  changeScreen(Screens.PLAYING);
  resumeSession();
  if (appState.game?.mode === "boss") resumeBossLoop();
  else if (appState.game?.mode === "endless") resumeEndlessLoop();
  else if (appState.game?.mode === "daily") resumeDailyLoop();
  else resumeGameLoop();
}

function activateTitleAction() {
  const action = titleActions[appState.menuIndex];
  if (action === "modes") openModeSelect();
  if (action === "profile") openProfileStatistics();
  if (action === "settings") openSettings();
}

function selectStatisticsTab(index) {
  appState.statisticsTabIndex = Math.max(
    0,
    Math.min(STATISTICS_TABS.length - 1, Number(index) || 0),
  );
  appState.profileEditing = false;
  appState.profileNameError = "";
  appState.profileCopyMessage = "";
  renderCurrentScreen();
}

function beginProfileNameEdit() {
  const profile = ensureStoredPlayerProfile();
  appState.profileEditing = true;
  appState.profileDraft = profile.displayName;
  appState.profileNameError = "";
  renderCurrentScreen();
}

function cancelProfileNameEdit() {
  appState.profileEditing = false;
  appState.profileDraft = "";
  appState.profileNameError = "";
  renderCurrentScreen();
}

function saveProfileName(value = document.querySelector("#profile-name-input")?.value) {
  const validation = validateDisplayName(value);
  if (!validation.valid) {
    appState.profileNameError = "USE 2–20 CHARACTERS WITHOUT CONTROL CHARACTERS";
    appState.profileDraft = typeof value === "string" ? value : "";
    renderCurrentScreen();
    return false;
  }
  updateStoredDisplayName(validation.value);
  appState.profileEditing = false;
  appState.profileDraft = "";
  appState.profileNameError = "";
  renderCurrentScreen();
  return true;
}

async function copyPlayerId() {
  const profile = ensureStoredPlayerProfile();
  const copied = await copyPlayerIdToClipboard(profile.playerId);
  appState.profileCopyMessage = copied ? "ID COPIED" : "COPY UNAVAILABLE";
  if (appState.screen === Screens.PROFILE_STATS) renderCurrentScreen();
  window.setTimeout(() => {
    if (appState.screen !== Screens.PROFILE_STATS) return;
    appState.profileCopyMessage = "";
    renderCurrentScreen();
  }, 1800);
}

function activateSelectedMode(modeId = getAllModes()[appState.modeSelection]?.id) {
  if (!isModeEnabled(modeId)) return false;
  const route = getAllModes().find((mode) => mode.id === modeId)?.route;
  if (route === "level-select") openLevelSelect("mode-select");
  else if (route === "speed-test") {
    appState.speedTestConfigId = DEFAULT_SPEED_TEST_CONFIG_ID;
    resetSpeedTestAttempt("mode-select");
  }
  else if (route === "endless-ready") openEndlessReady("mode-select");
  else if (route === "daily-ready") openDailyReady("mode-select");
  else return false;
  return true;
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
      profile: openProfileStatistics,
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
      back: openTitle,
    });
  } else if (appState.screen === Screens.ENDLESS_READY) {
    renderEndlessReady({ start: () => startEndless("mode-select") });
  } else if (appState.screen === Screens.ENDLESS_RESULTS) {
    renderEndlessResults(
      appState.endlessResult,
      appState.endlessResultsIndex,
      {
        retry: () => startEndless("retry"),
        modes: openModeSelect,
        title: openTitle,
        select: (index) => {
          if (appState.endlessResultsIndex === index) return;
          appState.endlessResultsIndex = index;
          renderCurrentScreen();
        },
      },
    );
  } else if (appState.screen === Screens.DAILY_READY) {
    renderDailyReady({
      dateKey: appState.dailyDateKey,
      record: getDailyRecord(appState.dailyDateKey),
      developer: appState.devMode,
    }, {
      start: () => startDaily("daily-ready", appState.dailyDateKey),
    });
  } else if (appState.screen === Screens.DAILY_RESULTS) {
    renderDailyResults(
      appState.dailyResult,
      appState.dailyRecordFlags,
      appState.dailyResultsIndex,
      {
        retry: () => startDaily("retry", appState.dailyResult.modeData.dateKey),
        modes: openModeSelect,
        title: openTitle,
        select: (index) => {
          if (appState.dailyResultsIndex === index) return;
          appState.dailyResultsIndex = index;
          renderCurrentScreen();
        },
      },
    );
  } else if (appState.screen === Screens.SPEED_TEST_RUN) {
    const state = getCurrentSpeedTest();
    if (state) {
      renderSpeedTestRun(state, appState.devMode, {
        selectConfig: changeSpeedTestConfig,
      });
      updateSpeedTestRun(state, currentTimeMs());
    }
  } else if (appState.screen === Screens.SPEED_TEST_RESULTS) {
    renderSpeedTestResults(
      appState.speedTestResult,
      appState.speedTestRecordFlags,
      appState.speedTestResultsIndex,
      {
        retry: () => resetSpeedTestAttempt("retry"),
        change: () => resetSpeedTestAttempt("change-test"),
        modes: openModeSelect,
        title: openTitle,
        select: (index) => {
          if (index === appState.speedTestResultsIndex) return;
          appState.speedTestResultsIndex = index;
          renderCurrentScreen();
        },
      },
    );
  } else if (appState.screen === Screens.LEVEL_SELECT) {
    renderLevelSelect(
      appState.save,
      appState.levelSelection,
      appState.devMode,
      appState.bossWordBank,
      appState.developerSeed,
      {
      back: openModeSelect,
      select: (level) => startLevel(level, "level-select"),
      devInspect: inspectDevLevel,
      devLaunch: (level) => startLevel(level, "developer"),
      },
    );
  } else if (appState.screen === Screens.RESULTS) {
    renderResults(appState.results, appState.resultsIndex, {
      retry: () => startLevel(appState.results.levelNumber, "retry"),
      next: () => startLevel(appState.results.levelNumber + 1, "next-level"),
      levels: openLevelSelect,
      title: openTitle,
      select: (index) => { appState.resultsIndex = index; },
    });
  } else if (appState.screen === Screens.SETTINGS) {
    renderSettings(appState.save, appState.settingsIndex, {
      toggle: toggleSetting,
      reset: confirmReset,
      back: backFromSettings,
    });
  } else if (appState.screen === Screens.PROFILE_STATS) {
    const storage = loadModeData();
    const profile = storage.profile || ensureStoredPlayerProfile();
    if (!storage.profile) storage.profile = profile;
    renderProfileStatistics({
      snapshot: getStatisticsSnapshot(storage, appState.save, getUtcDateKey()),
      storage,
      activeTab: appState.statisticsTabIndex,
      recentFilter: appState.statisticsRecentFilter,
      editing: appState.profileEditing,
      draft: appState.profileDraft,
      nameError: appState.profileNameError,
      copyMessage: appState.profileCopyMessage,
      developerMode: appState.devMode,
      authState: getAuthState(),
      leaderboardProfileState: getLeaderboardProfileState(),
    }, {
      selectTab: selectStatisticsTab,
      viewRecent: () => selectStatisticsTab(5),
      setRecentFilter: (filter) => {
        appState.statisticsRecentFilter = filter;
        renderCurrentScreen();
      },
      editName: beginProfileNameEdit,
      saveName: () => saveProfileName(),
      cancelName: cancelProfileNameEdit,
      copyId: copyPlayerId,
      back: openTitle,
    });
  }
  document.querySelector(".dev-mode-indicator")?.remove();
  document.querySelector(".dev-session-diagnostics")?.remove();
  if (appState.devMode) {
    renderDevModeIndicator();
    renderDevSessionDiagnostics();
  }
}

function handleAppClick(event) {
  const root = document.querySelector("#app");
  const readyAt = appState.screen === Screens.ENDLESS_RESULTS
    ? appState.endlessResultsReadyAt
    : appState.dailyResultsReadyAt;
  const action = resolveAppClickAction(event, {
    root,
    screen: appState.screen,
    readyAt,
    now: currentTimeMs(),
  });
  if (!action) return;
  event.preventDefault();
  if (appState.screen === Screens.ENDLESS_RESULTS) {
    if (action === "retry") startEndless("retry");
    else if (action === "modes") openModeSelect();
    else if (action === "title") openTitle();
  } else if (appState.screen === Screens.DAILY_RESULTS) {
    if (action === "retry") startDaily("retry", appState.dailyResult.modeData.dateKey);
    else if (action === "modes") openModeSelect();
    else if (action === "title") openTitle();
  } else if (appState.screen === Screens.PROFILE_STATS) {
    if (action === "auth-google-sign-in") void signInWithGoogle();
    else if (action === "auth-sign-out") void signOut();
    else if (action === "leaderboard-username-start-change") startUsernameChange();
    else if (action === "leaderboard-username-cancel-change") cancelUsernameChange();
    else {
      const username = document.querySelector("#leaderboard-username-input")?.value ?? "";
      if (action === "leaderboard-username-check") void checkUsernameAvailability(username);
      else if (action === "leaderboard-username-claim") void claimUsername(username);
      else if (action === "leaderboard-username-save-change") void changeUsername(username);
    }
  }
}

function handleAppInput(event) {
  if (event.target?.id !== "leaderboard-username-input") return;
  setUsernameDraft(event.target.value);
  updateLeaderboardUsernameFeedback(event.target.value);
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
  if (isTextEntryTarget(event.target)) return;
  if (appState.screen === Screens.SPEED_TEST_RUN) {
    if (event.key === "Escape") {
      event.preventDefault();
      pauseTypingTest();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      resetSpeedTestAttempt("tab-reset");
      return;
    }
    handleCurrentSpeedTestKey(event);
    return;
  }

  if (appState.screen === Screens.PLAYING) {
    if (event.key === "Escape") {
      event.preventDefault();
      pauseGame();
      return;
    }
    if (appState.game?.mode === "endless") {
      handleEndlessKey(event, appState.game);
      updateEndlessHud(appState.game);
    } else if (appState.game?.mode === "daily") {
      handleDailyKey(event, appState.game);
      updateDailyHud(appState.game);
    } else if (appState.game?.mode === "boss") {
      handleBossKey(event, appState.game, appState.save.settings, completeBossPhrase);
      updateBossHud(appState.game);
    } else {
      handleGameplayKey(
        event,
        appState.game,
        appState.save.settings,
        updateHud,
      );
      updateHud(appState.game);
    }
    return;
  }

  if (appState.screen === Screens.PROFILE_STATS) {
    if (appState.profileEditing) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelProfileNameEdit();
      } else if (event.key === "Enter") {
        event.preventDefault();
        saveProfileName(event.target?.value);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      openTitle();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      selectStatisticsTab(
        (appState.statisticsTabIndex + direction + STATISTICS_TABS.length)
          % STATISTICS_TABS.length,
      );
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
      if (getCurrentSpeedTest()?.phase === "PAUSED") {
        [
          resumeGame,
          () => resetSpeedTestAttempt("retry"),
          () => resetSpeedTestAttempt("quit-test"),
          openTitle,
        ][appState.pauseIndex]();
      } else if (appState.game?.mode === "endless") {
        [resumeGame, () => startEndless("restart"), openModeSelect, openTitle][appState.pauseIndex]();
      } else if (appState.game?.mode === "daily") {
        [resumeGame, () => startDaily("retry", appState.game.config.dateKey), openModeSelect, openTitle][appState.pauseIndex]();
      } else {
        [resumeGame, retryCurrentLevel, openLevelSelect, openTitle][appState.pauseIndex]();
      }
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
    const itemCount = getAllModes().length + 1;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      appState.modeSelection = (
        appState.modeSelection - 1 + itemCount
      ) % itemCount;
      renderCurrentScreen();
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      appState.modeSelection = (appState.modeSelection + 1) % itemCount;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      if (appState.modeSelection === getAllModes().length) openTitle();
      else activateSelectedMode();
    } else if (event.key === "Escape") {
      openTitle();
    }
    return;
  }

  if (appState.screen === Screens.ENDLESS_READY) {
    if (event.key === "Escape") openModeSelect();
    else if (event.key === "Enter") startEndless("mode-select");
    return;
  }

  if (appState.screen === Screens.ENDLESS_RESULTS) {
    const actions = ["retry", "modes", "title"];
    if (isResultsInputBlocked(
      event,
      currentTimeMs(),
      appState.endlessResultsReadyAt,
    )) return;
    if (event.key === "Escape") {
      openModeSelect();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      appState.endlessResultsIndex = (
        appState.endlessResultsIndex + direction + actions.length
      ) % actions.length;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      const action = actions[appState.endlessResultsIndex];
      if (action === "retry") startEndless("retry");
      else if (action === "modes") openModeSelect();
      else openTitle();
    }
    return;
  }

  if (appState.screen === Screens.DAILY_READY) {
    if (event.key === "Escape") openModeSelect();
    else if (event.key === "Enter") startDaily("daily-ready", appState.dailyDateKey);
    return;
  }

  if (appState.screen === Screens.DAILY_RESULTS) {
    const actions = ["retry", "modes", "title"];
    if (isResultsInputBlocked(event, currentTimeMs(), appState.dailyResultsReadyAt)) return;
    if (event.key === "Escape") {
      openModeSelect();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      appState.dailyResultsIndex = (
        appState.dailyResultsIndex + direction + actions.length
      ) % actions.length;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      const action = actions[appState.dailyResultsIndex];
      if (action === "retry") startDaily("retry", appState.dailyResult.modeData.dateKey);
      else if (action === "modes") openModeSelect();
      else openTitle();
    }
    return;
  }

  if (appState.screen === Screens.SPEED_TEST_RESULTS) {
    const actions = ["retry", "change", "modes", "title"];
    if (isResultsInputBlocked(
      event,
      currentTimeMs(),
      appState.speedTestResultsReadyAt,
    )) return;
    if (event.key === "Tab") {
      event.preventDefault();
      resetSpeedTestAttempt("retry");
    } else if (event.key === "Escape") {
      event.preventDefault();
      resetSpeedTestAttempt("change-test");
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      appState.speedTestResultsIndex = (
        appState.speedTestResultsIndex + direction + actions.length
      ) % actions.length;
      renderCurrentScreen();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const action = actions[appState.speedTestResultsIndex];
      if (action === "retry") resetSpeedTestAttempt("retry");
      else if (action === "change") resetSpeedTestAttempt("change-test");
      else if (action === "modes") openModeSelect();
      else openTitle();
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
      else if (action === "levels") openLevelSelect();
      else openTitle();
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
  subscribeToAuth((authState) => {
    const authUiKey = `${authState.status}:${authState.user?.id ?? ""}`;
    const authUiChanged = authUiKey !== lastAuthUiKey;
    lastAuthUiKey = authUiKey;
    if (authState.status === "signed-in") void initializeLeaderboardProfile(authState.user);
    else resetLeaderboardProfile();
    if (
      authUiChanged &&
      appState.screen === Screens.PROFILE_STATS &&
      appState.statisticsTabIndex === 6
    ) {
      updateProfileAuthSection(authState, getLeaderboardProfileState());
    }
  });
  subscribeToLeaderboardProfile((profileState) => {
    if (appState.screen === Screens.PROFILE_STATS && appState.statisticsTabIndex === 6) {
      updateProfileAuthSection(getAuthState(), profileState);
    }
  });
  void initializeAuth();
  const search = new URLSearchParams(window.location.search);
  appState.devMode = isDevelopmentMode(window.location.search);
  appState.developerSeed = appState.devMode
    ? parseDeveloperSeed(window.location.search)
    : null;
  appState.endlessStartStage = appState.devMode
    ? Math.max(1, Number.parseInt(search.get("stage"), 10) || 1)
    : 1;
  appState.dailyDateOverride = appState.devMode && isValidDailyDateKey(search.get("date"));
  appState.dailyDateKey = appState.devMode
    ? parseDailyDateOverride(window.location.search)
    : getUtcDateKey();
  appState.save = loadSave();
  [
    appState.wordBank,
    appState.bossWordBank,
    appState.speedTestWordBank,
    appState.commonWordBank,
  ] = await Promise.all([
    loadWordBank(),
    loadBossWordBank(),
    loadSpeedTestWordBank(),
    loadCommonWordBank(),
  ]);
  document.addEventListener("keydown", handleGlobalKeydown);
  const appRoot = document.querySelector("#app");
  attachAppClickListener(appRoot, handleAppClick);
  appRoot?.addEventListener("input", handleAppInput);
  if (
    appState.devMode &&
    search.get("mode") === MODE_IDS.SPEED_TEST
  ) {
    appState.speedTestConfigId = parseDeveloperSpeedTestConfig(
      window.location.search,
    );
    resetSpeedTestAttempt("developer");
  } else if (appState.devMode && search.get("mode") === MODE_IDS.ENDLESS) {
    openEndlessReady("developer");
  } else if (appState.devMode && search.get("mode") === MODE_IDS.DAILY) {
    openDailyReady("developer");
  } else {
    renderCurrentScreen();
  }
}

bootstrap();

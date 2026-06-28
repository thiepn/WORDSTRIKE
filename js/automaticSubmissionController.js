import {
  expireAutomaticSubmissionCheck,
  getSubmissionState,
  markAutomaticSubmissionPending,
  refreshSubmissionEligibility,
  submitCurrentResult,
} from "./leaderboardSubmissionService.js";

const INITIALIZING = new Set(["idle", "loading"]);

export function createAutomaticSubmissionController({
  getState = getSubmissionState,
  markPending = markAutomaticSubmissionPending,
  expireCheck = expireAutomaticSubmissionCheck,
  refreshEligibility = refreshSubmissionEligibility,
  submit = submitCurrentResult,
  schedule = (callback, delay) => globalThis.setTimeout?.(callback, delay),
  cancelSchedule = (timerId) => globalThis.clearTimeout?.(timerId),
  accountCheckTimeoutMs = 10000,
} = {}) {
  let intent = null;
  let checkTimer = null;

  const clearTimer = () => {
    if (checkTimer != null) cancelSchedule(checkTimer);
    checkTimer = null;
  };

  const clear = () => {
    clearTimer();
    intent = null;
  };

  const arm = (authState, profileState) => {
    const submission = getState();
    const authInitializing = INITIALIZING.has(authState?.status);
    const authenticated = authState?.status === "signed-in" && Boolean(authState.user?.id);
    const profileInitializing = INITIALIZING.has(profileState?.status);
    const hasUsername = Boolean(profileState?.profile?.username);
    if (
      !submission.sessionId ||
      !submission.boardKey ||
      !["checking", "ready"].includes(submission.status) ||
      (!authenticated && !authInitializing) ||
      (authenticated && !hasUsername && !profileInitializing)
    ) {
      clear();
      return false;
    }
    intent = {
      sessionId: submission.sessionId,
      boardKey: submission.boardKey,
      expectedUserId: authenticated ? authState.user.id : null,
      attempted: false,
    };
    markPending(submission.sessionId);
    if (submission.status === "checking" && schedule) {
      checkTimer = schedule(() => {
        const pending = intent;
        clear();
        if (pending && !pending.attempted) expireCheck(pending.sessionId);
      }, accountCheckTimeoutMs);
    }
    return true;
  };

  const evaluate = async (authState, profileState) => {
    const submission = refreshEligibility(authState, profileState);
    if (!intent) return submission;
    if (
      submission.sessionId !== intent.sessionId ||
      submission.boardKey !== intent.boardKey ||
      intent.attempted
    ) return submission;

    if (INITIALIZING.has(authState?.status)) return submission;
    if (authState?.status !== "signed-in" || !authState.user?.id) {
      clear();
      return submission;
    }
    if (intent.expectedUserId && intent.expectedUserId !== authState.user.id) {
      clear();
      return submission;
    }
    intent.expectedUserId = authState.user.id;

    if (!profileState?.profile?.username) {
      if (INITIALIZING.has(profileState?.status)) return submission;
      clear();
      return submission;
    }
    if (submission.status !== "ready") return submission;

    clearTimer();
    intent.attempted = true;
    return submit();
  };

  return Object.freeze({
    armPreparedResult: arm,
    handleStateChange: evaluate,
    clearAutomaticSubmission: clear,
  });
}

const automaticSubmissionController = createAutomaticSubmissionController();

export const armPreparedResult = automaticSubmissionController.armPreparedResult;
export const handleAutomaticSubmissionStateChange = automaticSubmissionController.handleStateChange;
export const clearAutomaticSubmission = automaticSubmissionController.clearAutomaticSubmission;

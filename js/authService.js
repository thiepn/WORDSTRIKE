import { getOAuthRedirectUrl } from "./supabaseConfig.js";
import { getSupabaseClient } from "./supabaseClient.js";

const freezeState = (status, session = null, error = null) => Object.freeze({
  status,
  session,
  user: session?.user ?? null,
  error,
});

const safeError = () => Object.freeze({ message: "Online account request failed." });

export function createAuthService({
  getClient = getSupabaseClient,
  getRedirectUrl = getOAuthRedirectUrl,
} = {}) {
  let state = freezeState("idle");
  let initializationPromise = null;
  let authSubscription = null;
  const listeners = new Set();

  const publish = (nextState) => {
    state = nextState;
    for (const listener of listeners) listener(state);
    return state;
  };

  const stateFromSession = (session) => freezeState(
    session?.user ? "signed-in" : "signed-out",
    session?.user ? session : null,
  );

  const initialize = () => {
    if (initializationPromise) return initializationPromise;
    publish(freezeState("loading"));
    initializationPromise = (async () => {
      const client = getClient();
      if (!client?.auth) return publish(freezeState("unavailable"));
      try {
        if (!authSubscription) {
          const response = client.auth.onAuthStateChange?.((_event, session) => {
            publish(stateFromSession(session));
          });
          authSubscription = response?.data?.subscription ?? response?.subscription ?? null;
        }
        const { data, error } = await client.auth.getSession();
        if (error) return publish(freezeState("error", null, safeError()));
        return publish(stateFromSession(data?.session ?? null));
      } catch {
        return publish(freezeState("error", null, safeError()));
      }
    })();
    return initializationPromise;
  };

  const signIn = async () => {
    if (state.status === "signing-in") return state;
    await initialize();
    if (state.status === "signing-in" || state.status === "signed-in") return state;
    const client = getClient();
    if (!client?.auth) return publish(freezeState("unavailable"));
    publish(freezeState("signing-in"));
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getRedirectUrl() },
      });
      if (error) return publish(freezeState("error", null, safeError()));
      return state;
    } catch {
      return publish(freezeState("error", null, safeError()));
    }
  };

  const signOutCurrentBrowser = async () => {
    if (state.status === "signing-out") return state;
    await initialize();
    const client = getClient();
    if (!client?.auth) return publish(freezeState("unavailable"));
    publish(freezeState("signing-out", state.session));
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) return publish(freezeState("error", null, safeError()));
      return publish(freezeState("signed-out"));
    } catch {
      return publish(freezeState("error", null, safeError()));
    }
  };

  return Object.freeze({
    initializeAuth: initialize,
    getAuthState: () => state,
    subscribeToAuth(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    signInWithGoogle: signIn,
    signOut: signOutCurrentBrowser,
  });
}

const authService = createAuthService();

export const initializeAuth = authService.initializeAuth;
export const getAuthState = authService.getAuthState;
export const subscribeToAuth = authService.subscribeToAuth;
export const signInWithGoogle = authService.signInWithGoogle;
export const signOut = authService.signOut;

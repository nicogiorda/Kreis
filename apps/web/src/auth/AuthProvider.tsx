import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { registerAuthTokenRefresher } from "../api/client";
import { supabaseBrowser } from "../lib/supabase-browser";
import { markStartup, measureStartup, updateStartupDebug } from "../startup/startup-debug";
import type { AuthStatus } from "./auth.types";
import { AuthContext } from "./useAuth";

const legacyAuthStorageKey = "kreis-auth-session-v1";
const passwordRecoveryStorageKey = "kreis-password-recovery-active-v1";
const authInitializationTimeoutMs = 5_000;
export const passwordRecoveryTtlMs = 30 * 60 * 1_000;

type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
};

class AuthInitializationTimeoutError extends Error {
  constructor() {
    super("No pudimos recuperar tu sesion a tiempo.");
    this.name = "AuthInitializationTimeoutError";
  }
}

const initialState: AuthState = {
  status: "initializing",
  session: null,
  user: null,
  error: null
};

type RecoveryMarker = {
  active: true;
  expiresAt: number;
};

function removeLegacyAuthSession(): void {
  try {
    window.localStorage.removeItem(legacyAuthStorageKey);
  } catch {
    // Storage may be unavailable in private contexts.
  }
}

function removePasswordRecoveryMarker(): void {
  try {
    window.localStorage.removeItem(passwordRecoveryStorageKey);
  } catch {
    // In-memory recovery intent still protects the current render.
  }
}

function persistPasswordRecoveryMarker(expiresAt = Date.now() + passwordRecoveryTtlMs): number {
  const marker: RecoveryMarker = {
    active: true,
    expiresAt
  };

  try {
    window.localStorage.setItem(passwordRecoveryStorageKey, JSON.stringify(marker));
  } catch {
    // Recovery remains protected in memory while this PWA instance is open.
  }

  return expiresAt;
}

function readPasswordRecoveryMarker(): { marker: RecoveryMarker | null; expired: boolean } {
  try {
    const storedMarker = window.localStorage.getItem(passwordRecoveryStorageKey);
    if (!storedMarker) return { marker: null, expired: false };

    const marker = JSON.parse(storedMarker) as Partial<RecoveryMarker>;
    if (marker.active !== true || typeof marker.expiresAt !== "number" || marker.expiresAt <= Date.now()) {
      removePasswordRecoveryMarker();
      return { marker: null, expired: true };
    }

    return { marker: marker as RecoveryMarker, expired: false };
  } catch {
    removePasswordRecoveryMarker();
    return { marker: null, expired: true };
  }
}

function clearKnownSupabaseAuthStorage(): void {
  try {
    const keys = Object.keys(window.localStorage);

    keys.forEach((key) => {
      if (key === "kreis-supabase-auth-v1" || (key.startsWith("sb-") && key.endsWith("-auth-token"))) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    // The in-memory state below still lets the user continue.
  }
}

function stateFromSession(session: Session | null): AuthState {
  return session
    ? {
        status: "authenticated",
        session,
        user: session.user,
        error: null
      }
    : {
        status: "anonymous",
        session: null,
        user: null,
        error: null
      };
}

function passwordRecoveryState(session: Session): AuthState {
  return {
    status: "password-recovery",
    session,
    user: session.user,
    error: null
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId = 0;

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new AuthInitializationTimeoutError()), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function getAuthRecoveryMessage(error: unknown): string {
  if (error instanceof AuthInitializationTimeoutError) return "No pudimos recuperar tu sesion.";
  if (error instanceof Error && error.message) return error.message;

  return "No pudimos recuperar tu sesion.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const initializationRun = useRef(0);
  const recoveryIntentRef = useRef(false);
  const recoveryExpiresAtRef = useRef<number | null>(null);
  const recoveryExpirationDetectedRef = useRef(false);
  const stateRef = useRef<AuthState>(initialState);

  const commitState = useCallback((nextState: AuthState): void => {
    stateRef.current = nextState;
    setState(nextState);
    updateStartupDebug({ authStatus: nextState.status });
  }, []);

  const activatePasswordRecovery = useCallback((session: Session, expiresAt?: number): void => {
    recoveryIntentRef.current = true;
    recoveryExpiresAtRef.current = persistPasswordRecoveryMarker(expiresAt);
    commitState(passwordRecoveryState(session));
  }, [commitState]);

  const clearPasswordRecovery = useCallback((): void => {
    recoveryIntentRef.current = false;
    recoveryExpiresAtRef.current = null;
    recoveryExpirationDetectedRef.current = false;
    removePasswordRecoveryMarker();
  }, []);

  const initializeSession = useCallback(async (): Promise<void> => {
    const runId = initializationRun.current + 1;
    initializationRun.current = runId;

    removeLegacyAuthSession();
    markStartup("auth-init-start");
    updateStartupDebug({ authStatus: "initializing" });
    const initializingState: AuthState = {
      status: "initializing",
      session: stateRef.current.session,
      user: stateRef.current.user,
      error: null
    };
    commitState(initializingState);

    try {
      const { data, error } = await withTimeout(supabaseBrowser.auth.getSession(), authInitializationTimeoutMs);

      if (error) throw error;
      if (initializationRun.current !== runId) return;

      const recoveryMarkerState = readPasswordRecoveryMarker();
      if (data.session && recoveryMarkerState.marker) {
        activatePasswordRecovery(data.session, recoveryMarkerState.marker.expiresAt);
        return;
      }

      if (data.session && (recoveryMarkerState.expired || recoveryExpirationDetectedRef.current)) {
        clearPasswordRecovery();
        const { error: signOutError } = await supabaseBrowser.auth.signOut({ scope: "local" });
        if (signOutError) clearKnownSupabaseAuthStorage();
        commitState(stateFromSession(null));
        return;
      }

      if (!data.session) {
        clearPasswordRecovery();
      }

      const nextState = stateFromSession(data.session);
      commitState(nextState);
    } catch (error) {
      if (initializationRun.current !== runId) return;

      const message = getAuthRecoveryMessage(error);
      commitState({
        status: "recovery-error",
        session: null,
        user: null,
        error: message
      });
    } finally {
      if (initializationRun.current === runId) {
        markStartup("auth-init-end");
        measureStartup("auth-init", "auth-init-start", "auth-init-end");
      }
    }
  }, [activatePasswordRecovery, clearPasswordRecovery, commitState]);

  useEffect(() => {
    return registerAuthTokenRefresher(async () => {
      const { data, error } = await supabaseBrowser.auth.refreshSession();
      if (error || !data.session) return null;

      return data.session.access_token;
    });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(initializeSession);

    const { data } = supabaseBrowser.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (event === "SIGNED_OUT") {
        clearPasswordRecovery();
        commitState(stateFromSession(null));
        return;
      }

      if (!session) {
        if (event === "INITIAL_SESSION") {
          clearPasswordRecovery();
          commitState(stateFromSession(null));
        }
        return;
      }

      const persistedMarkerState = readPasswordRecoveryMarker();
      if (persistedMarkerState.expired) {
        recoveryIntentRef.current = false;
        recoveryExpiresAtRef.current = null;
        recoveryExpirationDetectedRef.current = true;
        removePasswordRecoveryMarker();
        commitState(stateFromSession(null));

        window.setTimeout(() => {
          void supabaseBrowser.auth.signOut({ scope: "local" }).then(({ error }) => {
            if (error) clearKnownSupabaseAuthStorage();
            recoveryExpirationDetectedRef.current = false;
          });
        }, 0);
        return;
      }

      const persistedMarker = persistedMarkerState.marker;
      const recoveryIsActive =
        event === "PASSWORD_RECOVERY" ||
        recoveryIntentRef.current ||
        Boolean(persistedMarker) ||
        stateRef.current.status === "password-recovery";

      if (recoveryIsActive) {
        activatePasswordRecovery(session, persistedMarker?.expiresAt ?? recoveryExpiresAtRef.current ?? undefined);
        return;
      }

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        commitState(stateFromSession(session));
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [activatePasswordRecovery, clearPasswordRecovery, commitState, initializeSession]);

  const signOut = useCallback(async (): Promise<void> => {
    clearPasswordRecovery();
    const { error } = await supabaseBrowser.auth.signOut({ scope: "local" });

    if (error) throw error;

    commitState(stateFromSession(null));
  }, [clearPasswordRecovery, commitState]);

  const signOutOtherDevices = useCallback(async (): Promise<void> => {
    const { error } = await supabaseBrowser.auth.signOut({ scope: "others" });
    if (error) throw error;
  }, []);

  const signOutEverywhere = useCallback(async (): Promise<void> => {
    clearPasswordRecovery();
    const { error } = await supabaseBrowser.auth.signOut({ scope: "global" });

    if (error) throw error;

    commitState(stateFromSession(null));
  }, [clearPasswordRecovery, commitState]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    clearPasswordRecovery();
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      throw error ?? new Error("No pudimos iniciar sesion.");
    }

    const nextState = stateFromSession(data.session);
    commitState(nextState);
  }, [clearPasswordRecovery, commitState]);

  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(normalizedEmail);
    if (error) throw error;
  }, []);

  const verifyRecoveryCode = useCallback(async (email: string, code: string): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.replace(/\D/g, "").slice(0, 6);

    recoveryIntentRef.current = true;
    recoveryExpiresAtRef.current = persistPasswordRecoveryMarker();

    const { data, error } = await supabaseBrowser.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedCode,
      type: "recovery"
    });

    if (error || !data.session || !data.user) {
      clearPasswordRecovery();
      throw error ?? new Error("No pudimos validar el codigo.");
    }

    activatePasswordRecovery(data.session, recoveryExpiresAtRef.current ?? undefined);
  }, [activatePasswordRecovery, clearPasswordRecovery]);

  const updateRecoveredPassword = useCallback(async (newPassword: string): Promise<void> => {
    if (stateRef.current.status !== "password-recovery" || !stateRef.current.session) {
      throw new Error("La sesion de recuperacion ya no esta disponible.");
    }

    const { error } = await supabaseBrowser.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  }, []);

  const completePasswordRecovery = useCallback(async (): Promise<void> => {
    const currentState = stateRef.current;
    if (currentState.status !== "password-recovery" || !currentState.session) {
      throw new Error("La sesion de recuperacion ya no esta disponible.");
    }

    clearPasswordRecovery();
    commitState(stateFromSession(currentState.session));
  }, [clearPasswordRecovery, commitState]);

  const cancelPasswordRecovery = useCallback(async (): Promise<void> => {
    clearPasswordRecovery();
    const { error } = await supabaseBrowser.auth.signOut({ scope: "local" });

    if (error) clearKnownSupabaseAuthStorage();

    commitState(stateFromSession(null));
  }, [clearPasswordRecovery, commitState]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    const { error } = await supabaseBrowser.auth.updateUser({
      current_password: currentPassword,
      password: newPassword
    });

    if (error) throw error;
  }, []);

  const continueWithoutSession = useCallback(async (): Promise<void> => {
    clearPasswordRecovery();
    await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
    clearKnownSupabaseAuthStorage();
    commitState(stateFromSession(null));
  }, [clearPasswordRecovery, commitState]);

  useEffect(() => {
    if (state.status !== "password-recovery") return;

    const expiresAt = recoveryExpiresAtRef.current;
    if (!expiresAt) return;

    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      void cancelPasswordRecovery().catch(() => {
        clearPasswordRecovery();
        commitState(stateFromSession(null));
      });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void cancelPasswordRecovery().catch(() => {
        clearPasswordRecovery();
        commitState(stateFromSession(null));
      });
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [cancelPasswordRecovery, clearPasswordRecovery, commitState, state.status]);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      signOutOtherDevices,
      signOutEverywhere,
      requestPasswordReset,
      verifyRecoveryCode,
      updateRecoveredPassword,
      completePasswordRecovery,
      cancelPasswordRecovery,
      changePassword,
      retryInitialization: initializeSession,
      continueWithoutSession
    }),
    [
      cancelPasswordRecovery,
      changePassword,
      completePasswordRecovery,
      continueWithoutSession,
      initializeSession,
      requestPasswordReset,
      signIn,
      signOut,
      signOutEverywhere,
      signOutOtherDevices,
      state,
      updateRecoveredPassword,
      verifyRecoveryCode
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseBrowser } from "../lib/supabase-browser";
import { markStartup, measureStartup, updateStartupDebug } from "../startup/startup-debug";
import type { AuthStatus } from "./auth.types";
import { AuthContext } from "./useAuth";

const legacyAuthStorageKey = "kreis-auth-session-v1";
const authInitializationTimeoutMs = 5_000;

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

function removeLegacyAuthSession(): void {
  try {
    window.localStorage.removeItem(legacyAuthStorageKey);
  } catch {
    // Storage may be unavailable in private contexts.
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

  const initializeSession = useCallback(async (): Promise<void> => {
    const runId = initializationRun.current + 1;
    initializationRun.current = runId;

    removeLegacyAuthSession();
    markStartup("auth-init-start");
    updateStartupDebug({ authStatus: "initializing" });
    setState((current) => ({
      status: "initializing",
      session: current.session,
      user: current.user,
      error: null
    }));

    try {
      const { data, error } = await withTimeout(supabaseBrowser.auth.getSession(), authInitializationTimeoutMs);

      if (error) throw error;
      if (initializationRun.current !== runId) return;

      const nextState = stateFromSession(data.session);
      setState(nextState);
      updateStartupDebug({ authStatus: nextState.status });
    } catch (error) {
      if (initializationRun.current !== runId) return;

      const message = getAuthRecoveryMessage(error);
      setState({
        status: "recovery-error",
        session: null,
        user: null,
        error: message
      });
      updateStartupDebug({ authStatus: "recovery-error" });
    } finally {
      if (initializationRun.current === runId) {
        markStartup("auth-init-end");
        measureStartup("auth-init", "auth-init-start", "auth-init-end");
      }
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(initializeSession);

    const { data } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      const nextState = stateFromSession(session);
      setState(nextState);
      updateStartupDebug({ authStatus: nextState.status });
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [initializeSession]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      throw error ?? new Error("No pudimos iniciar sesion.");
    }

    const nextState = stateFromSession(data.session);
    setState(nextState);
    updateStartupDebug({ authStatus: nextState.status });
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabaseBrowser.auth.signOut();

    if (error) throw error;

    setState(stateFromSession(null));
    updateStartupDebug({ authStatus: "anonymous" });
  }, []);

  const continueWithoutSession = useCallback(async (): Promise<void> => {
    await supabaseBrowser.auth.signOut().catch(() => undefined);
    clearKnownSupabaseAuthStorage();
    setState(stateFromSession(null));
    updateStartupDebug({ authStatus: "anonymous" });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      retryInitialization: initializeSession,
      continueWithoutSession
    }),
    [continueWithoutSession, initializeSession, signIn, signOut, state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

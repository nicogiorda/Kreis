import type { Session, User } from "@supabase/supabase-js";

export type AuthStatus = "initializing" | "authenticated" | "anonymous" | "recovery-error";

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retryInitialization: () => Promise<void>;
  continueWithoutSession: () => Promise<void>;
};

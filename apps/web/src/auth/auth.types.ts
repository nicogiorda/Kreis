import type { Session, User } from "@supabase/supabase-js";

export type AuthStatus =
  | "initializing"
  | "authenticated"
  | "anonymous"
  | "password-recovery"
  | "registration-incomplete"
  | "recovery-error";

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutOtherDevices: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyRecoveryCode: (email: string, code: string) => Promise<void>;
  verifySignupCode: (email: string, code: string) => Promise<void>;
  resendSignupCode: (email: string) => Promise<void>;
  updateRecoveredPassword: (newPassword: string) => Promise<void>;
  completePasswordRecovery: () => Promise<void>;
  cancelPasswordRecovery: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  retryInitialization: () => Promise<void>;
  continueWithoutSession: () => Promise<void>;
};

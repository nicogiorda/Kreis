import { act, render, screen, waitFor } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, passwordRecoveryTtlMs } from "./AuthProvider";
import { useAuth } from "./useAuth";

const supabaseAuthMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  refreshSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn()
}));

vi.mock("../lib/supabase-browser", () => ({
  supabaseBrowser: {
    auth: supabaseAuthMock
  }
}));

const testSession = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3_600,
  token_type: "bearer",
  user: {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "student@uade.edu.ar",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z"
  }
} as Session;

let authStateChangeCallback:
  | ((event: AuthChangeEvent, session: Session | null) => void)
  | undefined;

function Probe() {
  const auth = useAuth();

  return (
    <section>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="session">{auth.session?.access_token ?? "none"}</p>
      <button type="button" onClick={() => void auth.retryInitialization()}>retry</button>
      <button type="button" onClick={() => void auth.continueWithoutSession()}>continue</button>
      <button type="button" onClick={() => void auth.requestPasswordReset("  STUDENT@UADE.EDU.AR ")}>request</button>
      <button type="button" onClick={() => void auth.verifyRecoveryCode("STUDENT@UADE.EDU.AR", "12a34 56").catch(() => undefined)}>verify</button>
      <button type="button" onClick={() => void auth.updateRecoveredPassword("new-password")}>update recovered</button>
      <button type="button" onClick={() => void auth.completePasswordRecovery()}>complete recovery</button>
      <button type="button" onClick={() => void auth.cancelPasswordRecovery()}>cancel recovery</button>
      <button type="button" onClick={() => void auth.changePassword("old-password", "new-password")}>change password</button>
      <button type="button" onClick={() => void auth.signOut()}>sign out</button>
      <button type="button" onClick={() => void auth.signOutOtherDevices()}>sign out others</button>
      <button type="button" onClick={() => void auth.signOutEverywhere()}>sign out everywhere</button>
    </section>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

function emitAuthEvent(event: AuthChangeEvent, session: Session | null): void {
  act(() => {
    authStateChangeCallback?.(event, session);
  });
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    authStateChangeCallback = undefined;
    window.localStorage.clear();
    window.localStorage.setItem("kreis-auth-session-v1", JSON.stringify({ legacy: true }));

    supabaseAuthMock.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseAuthMock.refreshSession.mockResolvedValue({ data: { session: testSession }, error: null });
    supabaseAuthMock.signOut.mockResolvedValue({ error: null });
    supabaseAuthMock.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    supabaseAuthMock.verifyOtp.mockResolvedValue({
      data: { session: testSession, user: testSession.user },
      error: null
    });
    supabaseAuthMock.updateUser.mockResolvedValue({
      data: { user: testSession.user },
      error: null
    });
    supabaseAuthMock.onAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback;

      return {
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      };
    });
  });

  it("restores an anonymous session through Supabase and removes legacy storage", async () => {
    renderProvider();

    await screen.findByText("anonymous");
    expect(window.localStorage.getItem("kreis-auth-session-v1")).toBeNull();
    expect(supabaseAuthMock.getSession).toHaveBeenCalledTimes(1);
  });

  it("enters a recovery error state when initialization times out", async () => {
    vi.useFakeTimers();
    supabaseAuthMock.getSession.mockReturnValue(new Promise(() => undefined));

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByText("recovery-error")).toBeInTheDocument();
  });

  it("continues without a recovered session using local scope", async () => {
    supabaseAuthMock.getSession.mockRejectedValue(new Error("offline"));
    renderProvider();

    await screen.findByText("recovery-error");
    screen.getByRole("button", { name: "continue" }).click();

    await screen.findByText("anonymous");
    expect(supabaseAuthMock.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("normalizes the email when requesting a reset", async () => {
    renderProvider();
    await screen.findByText("anonymous");

    screen.getByRole("button", { name: "request" }).click();

    await waitFor(() => {
      expect(supabaseAuthMock.resetPasswordForEmail).toHaveBeenCalledWith("student@uade.edu.ar");
    });
  });

  it("keeps a verified OTP session in password recovery instead of opening the app", async () => {
    renderProvider();
    await screen.findByText("anonymous");

    screen.getByRole("button", { name: "verify" }).click();

    await screen.findByText("password-recovery");
    expect(supabaseAuthMock.verifyOtp).toHaveBeenCalledWith({
      email: "student@uade.edu.ar",
      token: "123456",
      type: "recovery"
    });

    const marker = JSON.parse(window.localStorage.getItem("kreis-password-recovery-active-v1") ?? "{}");
    expect(marker.active).toBe(true);
    expect(marker.expiresAt).toBeGreaterThan(Date.now());
  });

  it("keeps SIGNED_IN in password recovery while recovery intent is active", async () => {
    renderProvider();
    await screen.findByText("anonymous");
    screen.getByRole("button", { name: "verify" }).click();
    await screen.findByText("password-recovery");

    emitAuthEvent("SIGNED_IN", testSession);

    expect(screen.getByTestId("status")).toHaveTextContent("password-recovery");
  });

  it("enters password recovery on PASSWORD_RECOVERY", async () => {
    renderProvider();
    await screen.findByText("anonymous");

    emitAuthEvent("PASSWORD_RECOVERY", testSession);

    expect(screen.getByTestId("status")).toHaveTextContent("password-recovery");
  });

  it("does not leave recovery on TOKEN_REFRESHED or USER_UPDATED", async () => {
    renderProvider();
    await screen.findByText("anonymous");
    emitAuthEvent("PASSWORD_RECOVERY", testSession);

    emitAuthEvent("TOKEN_REFRESHED", testSession);
    expect(screen.getByTestId("status")).toHaveTextContent("password-recovery");

    emitAuthEvent("USER_UPDATED", testSession);
    expect(screen.getByTestId("status")).toHaveTextContent("password-recovery");
  });

  it("clears recovery state and marker on SIGNED_OUT", async () => {
    renderProvider();
    await screen.findByText("anonymous");
    emitAuthEvent("PASSWORD_RECOVERY", testSession);

    emitAuthEvent("SIGNED_OUT", null);

    expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
    expect(window.localStorage.getItem("kreis-password-recovery-active-v1")).toBeNull();
  });

  it("restores password recovery from a valid marker and session", async () => {
    window.localStorage.setItem("kreis-password-recovery-active-v1", JSON.stringify({
      active: true,
      expiresAt: Date.now() + passwordRecoveryTtlMs
    }));
    supabaseAuthMock.getSession.mockResolvedValue({
      data: { session: testSession },
      error: null
    });

    renderProvider();

    await screen.findByText("password-recovery");
  });

  it("signs out locally when the recovery marker expired", async () => {
    window.localStorage.setItem("kreis-password-recovery-active-v1", JSON.stringify({
      active: true,
      expiresAt: Date.now() - 1
    }));
    supabaseAuthMock.getSession.mockResolvedValue({
      data: { session: testSession },
      error: null
    });

    renderProvider();

    await screen.findByText("anonymous");
    expect(supabaseAuthMock.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(window.localStorage.getItem("kreis-password-recovery-active-v1")).toBeNull();
  });

  it("expires an active recovery after thirty minutes without opening the app", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem("kreis-password-recovery-active-v1", JSON.stringify({
      active: true,
      expiresAt: Date.now() + passwordRecoveryTtlMs
    }));
    supabaseAuthMock.getSession.mockResolvedValue({
      data: { session: testSession },
      error: null
    });

    renderProvider();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("password-recovery");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(passwordRecoveryTtlMs);
    });

    expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
    expect(supabaseAuthMock.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("clears recovery intent when OTP verification fails", async () => {
    supabaseAuthMock.verifyOtp.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { code: "otp_expired" }
    });
    renderProvider();
    await screen.findByText("anonymous");

    screen.getByRole("button", { name: "verify" }).click();

    await waitFor(() => expect(supabaseAuthMock.verifyOtp).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
    expect(window.localStorage.getItem("kreis-password-recovery-active-v1")).toBeNull();
  });

  it("updates a recovered password without leaving recovery prematurely", async () => {
    renderProvider();
    await screen.findByText("anonymous");
    emitAuthEvent("PASSWORD_RECOVERY", testSession);

    screen.getByRole("button", { name: "update recovered" }).click();

    await waitFor(() => {
      expect(supabaseAuthMock.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    });
    expect(screen.getByTestId("status")).toHaveTextContent("password-recovery");
  });

  it("completes recovery only after the password update flow confirms it", async () => {
    renderProvider();
    await screen.findByText("anonymous");
    emitAuthEvent("PASSWORD_RECOVERY", testSession);

    screen.getByRole("button", { name: "complete recovery" }).click();

    await screen.findByText("authenticated");
    expect(window.localStorage.getItem("kreis-password-recovery-active-v1")).toBeNull();
  });

  it("cancels recovery with local scope", async () => {
    renderProvider();
    await screen.findByText("anonymous");
    emitAuthEvent("PASSWORD_RECOVERY", testSession);

    screen.getByRole("button", { name: "cancel recovery" }).click();

    await screen.findByText("anonymous");
    expect(supabaseAuthMock.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(window.localStorage.getItem("kreis-password-recovery-active-v1")).toBeNull();
  });

  it("changes the password with the current password supported by the installed SDK", async () => {
    renderProvider();
    await screen.findByText("anonymous");

    screen.getByRole("button", { name: "change password" }).click();

    await waitFor(() => {
      expect(supabaseAuthMock.updateUser).toHaveBeenCalledWith({
        current_password: "old-password",
        password: "new-password"
      });
    });
  });

  it("uses explicit scopes for current, other, and all sessions", async () => {
    renderProvider();
    await screen.findByText("anonymous");

    screen.getByRole("button", { name: "sign out" }).click();
    await waitFor(() => expect(supabaseAuthMock.signOut).toHaveBeenCalledWith({ scope: "local" }));

    screen.getByRole("button", { name: "sign out others" }).click();
    await waitFor(() => expect(supabaseAuthMock.signOut).toHaveBeenCalledWith({ scope: "others" }));

    screen.getByRole("button", { name: "sign out everywhere" }).click();
    await waitFor(() => expect(supabaseAuthMock.signOut).toHaveBeenCalledWith({ scope: "global" }));
  });
});

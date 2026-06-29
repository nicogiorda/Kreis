import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

const supabaseAuthMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  refreshSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("../lib/supabase-browser", () => ({
  supabaseBrowser: {
    auth: supabaseAuthMock
  }
}));

function Probe() {
  const auth = useAuth();

  return (
    <section>
      <p>{auth.status}</p>
      <button type="button" onClick={() => void auth.retryInitialization()}>retry</button>
      <button type="button" onClick={() => void auth.continueWithoutSession()}>continue</button>
    </section>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem("kreis-auth-session-v1", JSON.stringify({ legacy: true }));
    supabaseAuthMock.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    });
  });

  it("restores an anonymous session through Supabase and removes legacy storage", async () => {
    supabaseAuthMock.getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText("anonymous");
    expect(window.localStorage.getItem("kreis-auth-session-v1")).toBeNull();
    expect(supabaseAuthMock.getSession).toHaveBeenCalledTimes(1);
  });

  it("enters a recovery state when initialization times out", async () => {
    vi.useFakeTimers();
    supabaseAuthMock.getSession.mockReturnValue(new Promise(() => undefined));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByText("recovery-error")).toBeInTheDocument();
  });

  it("can continue without a recovered session", async () => {
    supabaseAuthMock.getSession.mockRejectedValue(new Error("offline"));
    supabaseAuthMock.signOut.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText("recovery-error");
    screen.getByRole("button", { name: "continue" }).click();

    await screen.findByText("anonymous");
    expect(supabaseAuthMock.signOut).toHaveBeenCalled();
  });
});

// @vitest-environment node

import type { Session, User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  AuthProviderError,
  EmailConfirmationNotEnabledError
} from "../domain/auth-errors";
import { SupabaseAuthProvider } from "./supabase-auth-provider";

const pendingUser = {
  id: "new-user",
  email: "student@uade.edu.ar",
  identities: [{ id: "identity-1" }]
} as unknown as User;

const unexpectedSession = {
  access_token: "access-token",
  user: pendingUser
} as Session;

function createProvider({
  user = pendingUser,
  session = null,
  existingUser = null,
  existingEmailConfirmed = false,
  signUpError = null
}: {
  user?: User | null;
  session?: Session | null;
  existingUser?: { id: string } | null;
  existingEmailConfirmed?: boolean;
  signUpError?: { code: string } | null;
} = {}) {
  const signUp = vi.fn().mockResolvedValue({
    data: { user, session },
    error: signUpError
  });
  const deleteUser = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null
  });
  const getUserById = vi.fn().mockResolvedValue({
    data: {
      user: {
        ...pendingUser,
        id: existingUser?.id ?? pendingUser.id,
        email_confirmed_at: existingEmailConfirmed
          ? "2026-07-02T12:00:00.000Z"
          : null
      }
    },
    error: null
  });
  const anonClient = {
    auth: {
      signUp,
      signInWithPassword: vi.fn(),
      refreshSession: vi.fn()
    }
  } as unknown as ConstructorParameters<typeof SupabaseAuthProvider>[0];
  const adminClient = {
    auth: {
      admin: { deleteUser, getUserById }
    }
  } as unknown as ConstructorParameters<typeof SupabaseAuthProvider>[1];
  const lookup = vi.fn().mockResolvedValue(existingUser);
  const provider = new SupabaseAuthProvider(anonClient, adminClient, lookup);

  return { provider, signUp, deleteUser, getUserById, lookup };
}

describe("SupabaseAuthProvider.createUser", () => {
  it("uses signUp instead of the admin create-user API for new users", async () => {
    const { provider, signUp } = createProvider();

    await provider.createUser("student@uade.edu.ar", "secure-password");

    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signUp).toHaveBeenCalledWith({
      email: "student@uade.edu.ar",
      password: "secure-password"
    });
  });

  it("normalizes the signup email", async () => {
    const { provider, signUp, lookup } = createProvider();

    await provider.createUser(" Student@UADE.EDU.AR ", "secure-password");

    expect(lookup).toHaveBeenCalledWith("student@uade.edu.ar");
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "student@uade.edu.ar"
    }));
  });

  it("accepts a pending signup only when it has a user and no session", async () => {
    const { provider, deleteUser } = createProvider();

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).resolves.toEqual({
      id: "new-user",
      email: "student@uade.edu.ar",
      created: true
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("rolls back a newly created user when signup returns a session", async () => {
    const { provider, deleteUser } = createProvider({
      session: unexpectedSession
    });

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).rejects.toBeInstanceOf(EmailConfirmationNotEnabledError);
    expect(deleteUser).toHaveBeenCalledWith("new-user");
  });

  it("resumes a preexisting unconfirmed user without resending signup", async () => {
    const { provider, signUp, deleteUser } = createProvider({
      existingUser: { id: "existing-user" }
    });

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).resolves.toEqual({
      id: "existing-user",
      email: "student@uade.edu.ar",
      created: false
    });
    expect(signUp).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("rejects a preexisting confirmed user without resending or deleting it", async () => {
    const { provider, signUp, deleteUser } = createProvider({
      existingUser: { id: "existing-user" },
      existingEmailConfirmed: true
    });

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).rejects.toBeInstanceOf(AuthProviderError);
    expect(signUp).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("does not resend signup for an unconfirmed account", async () => {
    const { provider, signUp, deleteUser } = createProvider({
      existingUser: { id: "existing-user" },
      signUpError: { code: "over_email_send_rate_limit" }
    });

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).resolves.toMatchObject({
      id: "existing-user",
      created: false
    });
    expect(signUp).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
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
  existingUser = null
}: {
  user?: User | null;
  session?: Session | null;
  existingUser?: { id: string } | null;
} = {}) {
  const signUp = vi.fn().mockResolvedValue({
    data: { user, session },
    error: null
  });
  const deleteUser = vi.fn().mockResolvedValue({
    data: { user: null },
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
      admin: { deleteUser }
    }
  } as unknown as ConstructorParameters<typeof SupabaseAuthProvider>[1];
  const lookup = vi.fn().mockResolvedValue(existingUser);
  const provider = new SupabaseAuthProvider(anonClient, adminClient, lookup);

  return { provider, signUp, deleteUser, lookup };
}

describe("SupabaseAuthProvider.createUser", () => {
  it("uses signUp instead of the admin create-user API", async () => {
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
      email: "student@uade.edu.ar"
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

  it("never deletes a preexisting user returned through signup obfuscation", async () => {
    const obfuscatedUser = {
      ...pendingUser,
      id: "obfuscated-user",
      identities: []
    } as unknown as User;
    const { provider, deleteUser } = createProvider({
      user: obfuscatedUser,
      existingUser: { id: "existing-user" }
    });

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).rejects.toBeInstanceOf(AuthProviderError);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("never rolls back a preexisting user even if signup returns a session", async () => {
    const { provider, deleteUser } = createProvider({
      session: unexpectedSession,
      existingUser: { id: "existing-user" }
    });

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).rejects.toBeInstanceOf(AuthProviderError);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

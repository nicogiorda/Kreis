// @vitest-environment node

import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { AuthProviderError } from "../domain/auth-errors";
import { SupabaseAuthProvider } from "./supabase-auth-provider";

const confirmedUser = {
  id: "new-user",
  email: "student@uade.edu.ar",
  email_confirmed_at: "2026-07-03T12:00:00.000Z"
} as unknown as User;

function createProvider({
  user = confirmedUser,
  existingUser = null,
  createError = null
}: {
  user?: User | null;
  existingUser?: { id: string } | null;
  createError?: { message: string } | null;
} = {}) {
  const createUser = vi.fn().mockResolvedValue({
    data: { user },
    error: createError
  });
  const deleteUser = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null
  });
  const anonClient = {
    auth: {
      signInWithPassword: vi.fn(),
      refreshSession: vi.fn()
    }
  } as unknown as ConstructorParameters<typeof SupabaseAuthProvider>[0];
  const adminClient = {
    auth: {
      admin: {
        createUser,
        deleteUser
      }
    }
  } as unknown as ConstructorParameters<typeof SupabaseAuthProvider>[1];
  const lookup = vi.fn().mockResolvedValue(existingUser);
  const provider = new SupabaseAuthProvider(anonClient, adminClient, lookup);

  return {
    provider,
    createUser,
    deleteUser,
    lookup
  };
}

describe("SupabaseAuthProvider.createUser", () => {
  it("creates a confirmed user through the admin API", async () => {
    const { provider, createUser } = createProvider();

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).resolves.toEqual({
      id: "new-user",
      email: "student@uade.edu.ar",
      created: true
    });
    expect(createUser).toHaveBeenCalledWith({
      email: "student@uade.edu.ar",
      password: "secure-password",
      email_confirm: true
    });
  });

  it("normalizes the email before lookup and creation", async () => {
    const { provider, createUser, lookup } = createProvider();

    await provider.createUser(" Student@UADE.EDU.AR ", "secure-password");

    expect(lookup).toHaveBeenCalledWith("student@uade.edu.ar");
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "student@uade.edu.ar" })
    );
  });

  it("rejects a preexisting user without mutating it", async () => {
    const { provider, createUser } = createProvider({
      existingUser: { id: "existing-user" }
    });

    await expect(
      provider.createUser("student@uade.edu.ar", "secure-password")
    ).rejects.toBeInstanceOf(AuthProviderError);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects an admin creation failure", async () => {
    const newProvider = createProvider({
      createError: { message: "duplicate" }
    });

    await expect(
      newProvider.provider.createUser(
        "student@uade.edu.ar",
        "secure-password"
      )
    ).rejects.toBeInstanceOf(AuthProviderError);
  });
});

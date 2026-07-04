import { createClient } from "@supabase/supabase-js";
import { config } from "../../../core/config";
import { prisma } from "../../../core/database";
import { AuthProviderError } from "../domain/auth-errors";
import type { AuthSession, IAuthProvider } from "../domain/auth.types";

const supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabaseAnon = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

type AnonAuthClient = {
  auth: Pick<
    typeof supabaseAnon.auth,
    "signInWithPassword" | "refreshSession"
  >;
};
type AdminAuthClient = {
  auth: {
    admin: Pick<
      typeof supabaseAdmin.auth.admin,
      "createUser" | "deleteUser"
    >;
  };
};
type ExistingAuthUserLookup = (email: string) => Promise<{ id: string } | null>;

async function findExistingAuthUser(email: string): Promise<{ id: string } | null> {
  return prisma.users.findFirst({
    where: { email },
    select: { id: true }
  });
}

export class SupabaseAuthProvider implements IAuthProvider {
  constructor(
    private readonly anonClient: AnonAuthClient = supabaseAnon,
    private readonly adminClient: AdminAuthClient = supabaseAdmin,
    private readonly existingAuthUserLookup: ExistingAuthUserLookup = findExistingAuthUser
  ) {}

  async createUser(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.existingAuthUserLookup(normalizedEmail);

    if (existingUser) {
      throw new AuthProviderError("No pudimos completar el registro.");
    }

    const { data, error } = await this.adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true
    });

    if (error || !data.user) {
      throw new AuthProviderError("No pudimos completar el registro.");
    }

    return {
      id: data.user.id,
      email: data.user.email ?? normalizedEmail,
      created: true
    };
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.anonClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error || !data.session || !data.user) {
      throw new AuthProviderError(error?.message ?? "No pudimos iniciar sesion.");
    }

    return {
      session: data.session,
      user: { id: data.user.id, email: data.user.email }
    };
  }

  async emailExists(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.existingAuthUserLookup(normalizedEmail);

    return Boolean(existingUser);
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await this.anonClient.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session || !data.user) {
      throw new AuthProviderError(error?.message ?? "No pudimos refrescar la sesion.");
    }

    return {
      session: data.session,
      user: { id: data.user.id, email: data.user.email }
    };
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.adminClient.auth.admin.deleteUser(id);

    if (error) {
      throw new AuthProviderError(error.message);
    }
  }
}

// CAPA INFRASTRUCTURE — Proveedor de autenticación
// Implementa IAuthProvider usando el SDK de Supabase.
// Vive en infrastructure porque depende de una librería externa (supabase-js)
// y de variables de entorno. Si mañana migramos a Auth0 o Firebase,
// solo cambiamos este archivo — los casos de uso y el domain no se tocan.

import { createClient } from "@supabase/supabase-js";
import { config } from "../../../core/config";
import { AuthProviderError } from "../domain/auth-errors";
import type { AuthSession, IAuthProvider } from "../domain/auth.types";

// Cliente admin: usa service_role_key, que tiene permisos elevados.
// Permite crear y eliminar usuarios sin necesitar confirmación de email.
// Solo debe usarse server-side — nunca exponer este cliente al frontend.
const supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente anon: usa anon_key, con permisos mínimos de solo lectura pública.
// Es el único cliente que puede autenticar con credenciales del usuario final
// porque genera tokens JWT vinculados a esa sesión.
const supabaseAnon = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export class SupabaseAuthProvider implements IAuthProvider {
  // Crea un usuario en el sistema de auth de Supabase.
  // Usamos email_confirm: true para saltear el email de verificación —
  // el flujo de registro de Kreis no requiere confirmación por correo.
  async createUser(email: string, password: string) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    // Convertimos el error de Supabase en un AuthProviderError tipado
    // para que la capa superior pueda identificarlo con instanceof.
    if (error) throw new AuthProviderError(error.message);

    return { id: data.user.id, email: data.user.email };
  }

  // Autentica al usuario con email 
  // con y contraseña.
  // Si las credenciales son inválidas, Supabase devuelve error y lanzamos AuthProviderError.
  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error) throw new AuthProviderError(error.message);

    return {
      session: data.session,
      user: { id: data.user.id, email: data.user.email }
    };
  }

  // Elimina un usuario del sistema de auth de Supabase.
  // Se usa como rollback cuando la creación del perfil en BD falla,
  // para no dejar usuarios huérfanos en Supabase sin perfil en nuestra BD.
  async deleteUser(id: string) {
    await supabaseAdmin.auth.admin.deleteUser(id);
  }
}

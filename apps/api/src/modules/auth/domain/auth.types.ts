// CAPA DOMAIN
// El domain define los contratos y tipos que el módulo auth "conoce".
// No importa nada externo (ni Supabase, ni Prisma, ni Express).
// Esto permite que application e infrastructure dependan de domain,
// pero nunca al revés — el domain es la capa más estable del módulo.

// Datos necesarios para registrar un usuario nuevo.
export type RegisterInput = {
  email: string;
  password: string;
  legajo: number;
  nombre: string;
  apellido: string;
  topicos: number[];
  certificate_verification_token: string;
};

export type RegisterProfileInput = Pick<RegisterInput, "legajo" | "nombre" | "apellido" | "topicos"> & {
  id_facultad: number;
};

export type ExistingRegisterProfile = Pick<
  RegisterProfileInput,
  "legajo" | "nombre" | "apellido" | "id_facultad"
>;

export type ExistingProfileByLegajo = ExistingRegisterProfile & {
  authId: string;
  email: string | null;
};

export type AuthUserCreation = {
  id: string;
  email: string | undefined;
  created: boolean;
};

// Datos necesarios para autenticar un usuario existente.
export type LoginInput = {
  email: string;
  password: string;
};

// Representa al usuario autenticado que devolvemos al cliente tras un registro exitoso.
export type AuthUser = {
  id: string;
  email: string;
  legajo: number;
  nombre: string;
  apellido: string;
  idFacultad: number;
};

// Representa la sesión activa que devolvemos al cliente tras un login exitoso.
// El session de Supabase incluye access_token, refresh_token y metadatos.
export type AuthSession = {
  session: unknown;
  user: {
    id: string;
    email: string | undefined;
  };
};

// Contrato que debe cumplir cualquier repositorio de perfiles de usuario.
// Al depender de esta interfaz, application/ puede funcionar sin conocer Prisma.
// Facilita hacer tests con un repositorio en memoria sin tocar la BD real.
export interface IUserRepository {
  // Crea el perfil de aplicación vinculado al auth_id generado por el proveedor externo.
  createProfile(authId: string, input: RegisterProfileInput): Promise<void>;
  findProfile(authId: string): Promise<ExistingRegisterProfile | null>;
  findProfileByLegajo(legajo: number): Promise<ExistingProfileByLegajo | null>;
  deleteProfile(authId: string): Promise<void>;
}

// Contrato que debe cumplir cualquier proveedor de autenticación.
// Permite intercambiar Supabase por otro proveedor (Auth0, Firebase, etc.)
// sin tocar los casos de uso — solo se cambia la implementación en infrastructure/.
export interface IAuthProvider {
  // Crea un usuario en el sistema de auth externo y devuelve su id generado.
  createUser(email: string, password: string): Promise<AuthUserCreation>;

  // Autentica con email y contraseña y devuelve la sesión activa.
  signIn(email: string, password: string): Promise<AuthSession>;

  refreshSession(refreshToken: string): Promise<AuthSession>;

  // Elimina un usuario del sistema de auth externo.
  // Se usa para rollback si la creación del perfil de BD falla.
  deleteUser(id: string): Promise<void>;
}


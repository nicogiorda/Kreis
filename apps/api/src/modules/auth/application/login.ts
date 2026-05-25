// CAPA APPLICATION — Caso de uso: autenticar usuario
// Valida las credenciales y devuelve la sesión activa.
// No sabe nada de HTTP ni de librerías externas — solo habla con IAuthProvider.
// Actualmente es un delegador directo, pero este es el lugar correcto para agregar
// lógica futura: auditoría de logins, bloqueo por intentos fallidos, etc.

import type { AuthSession, IAuthProvider, LoginInput } from "../domain/auth.types";

export class LoginUseCase {
  constructor(private readonly authProvider: IAuthProvider) {}

  // Autentica al usuario y devuelve la sesión.
  // Si las credenciales son inválidas, el authProvider lanza AuthProviderError
  // y la capa api/ lo convierte en una respuesta 401.
  async execute(input: LoginInput): Promise<AuthSession> {
    return this.authProvider.signIn(input.email, input.password);
  }
}

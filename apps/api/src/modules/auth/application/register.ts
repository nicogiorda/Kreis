// CAPA APPLICATION — Caso de uso: registrar usuario
// Orquesta el flujo de negocio del registro sin saber nada de HTTP ni de librerías externas.
// Solo habla con los contratos del domain (IAuthProvider, IUserRepository).
// Esta separación permite testear la lógica de negocio en aislamiento,
// inyectando mocks de authProvider y userRepository.

import { ProfileCreationError } from "../domain/auth-errors";
import type { AuthUser, IAuthProvider, IUserRepository, RegisterInput } from "../domain/auth.types";

export class RegisterUseCase {
  // Las dependencias se inyectan en el constructor para facilitar el testing
  // y para que la capa api/ controle qué implementaciones concretas se usan.
  constructor(
    private readonly authProvider: IAuthProvider,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(input: RegisterInput): Promise<AuthUser> {
    // Paso 1: Crear el usuario en el sistema de auth externo.
    // Esto genera el auth_id que usaremos como FK en nuestra tabla usuario.
    const authUser = await this.authProvider.createUser(input.email, input.password);

    try {
      // Paso 2: Crear el perfil de aplicación vinculado al auth_id.
      await this.userRepository.createProfile(authUser.id, {
        legajo: input.legajo,
        nombre: input.nombre,
        apellido: input.apellido,
        id_facultad: input.id_facultad,
        topicos: input.topicos
      });
    } catch (error) {
      if (error instanceof ProfileCreationError) {
        // Rollback: si la BD falla, eliminamos el usuario de Supabase para no dejar
        // un usuario auth "huérfano" sin perfil en nuestra aplicación.
        await this.authProvider.deleteUser(authUser.id);
      }
      throw error;
    }

    return {
      id: authUser.id,
      email: authUser.email ?? input.email,
      legajo: input.legajo,
      nombre: input.nombre,
      apellido: input.apellido,
      idFacultad: input.id_facultad
    };
  }
}


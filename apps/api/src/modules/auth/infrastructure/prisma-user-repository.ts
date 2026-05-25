// CAPA INFRASTRUCTURE — Repositorio de usuarios
// Implementa IUserRepository usando Prisma para persistir el perfil de aplicación.
// Vive en infrastructure porque depende de Prisma (ORM externo) y del schema de BD.
// El domain solo conoce la interfaz IUserRepository — no sabe que existe Prisma.
// Si cambiamos de ORM, solo cambiamos este archivo.

import { prisma } from "../../../core/database";
import { ProfileCreationError } from "../domain/auth-errors";
import type { IUserRepository, RegisterInput } from "../domain/auth.types";

export class PrismaUserRepository implements IUserRepository {
  // Crea el perfil de aplicación en la tabla `usuario`, vinculado al auth_id de Supabase.
  // auth_id es la FK que une nuestra tabla con el sistema de auth externo.
  // id_facultad se convierte a BigInt porque el schema de Prisma lo requiere así.
  async createProfile(authId: string, input: Omit<RegisterInput, "email" | "password">) {
    try {
      await prisma.usuario.create({
        data: {
          auth_id: authId,
          legajo: input.legajo,
          nombre: input.nombre,
          apellido: input.apellido,
          id_facultad: BigInt(input.id_facultad)
        }
      });
    } catch (error) {
      // Envolvemos el error de Prisma en un ProfileCreationError tipado
      // para que el caso de uso pueda identificarlo y ejecutar el rollback en Supabase.
      const message = error instanceof Error ? error.message : "Profile creation failed";
      throw new ProfileCreationError(message);
    }
  }
}

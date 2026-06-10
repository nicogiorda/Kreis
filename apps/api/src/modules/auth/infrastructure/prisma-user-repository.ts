// CAPA INFRASTRUCTURE ï¿½ Repositorio de usuarios
// Implementa IUserRepository usando Prisma para persistir el perfil de aplicaciï¿½n.

import { prisma } from "../../../core/database";
import { ProfileCreationError } from "../domain/auth-errors";
import type { IUserRepository, RegisterInput } from "../domain/auth.types";

export class PrismaUserRepository implements IUserRepository {
  async createProfile(authId: string, input: Omit<RegisterInput, "email" | "password">) {
    try {
      // Usamos nested write en lugar de $transaction() interactivo.
      // $transaction(async fn) requiere una conexiÃ³n persistente que PgBouncer
      // (el pooler de Supabase) no puede garantizar en transaction mode.
      // Un nested write corre en una transacciÃ³n implÃ­cita que sÃ­ es compatible.
      await prisma.usuario.create({
        data: {
          auth_id: authId,
          legajo: input.legajo,
          nombre: input.nombre,
          apellido: input.apellido,
          id_facultad: BigInt(input.id_facultad),
          verificado: true,
          usuario_topico: input.topicos.length > 0
            ? {
                createMany: {
                  data: input.topicos.map((id_topico) => ({
                    id_topico: BigInt(id_topico)
                  })),
                  skipDuplicates: true
                }
              }
            : undefined
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile creation failed";
      throw new ProfileCreationError(message);
    }
  }
}

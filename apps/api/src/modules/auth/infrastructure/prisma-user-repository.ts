// CAPA INFRASTRUCTURE ï¿½ Repositorio de usuarios
// Implementa IUserRepository usando Prisma para persistir el perfil de aplicaciï¿½n.

import { prisma } from "../../../core/database";
import { ProfileCreationError, ProfileDeletionError } from "../domain/auth-errors";
import type { IUserRepository, RegisterProfileInput } from "../domain/auth.types";

export class PrismaUserRepository implements IUserRepository {
  async findProfileByLegajo(legajo: number) {
    const profile = await prisma.usuario.findUnique({
      where: { legajo },
      select: {
        auth_id: true,
        legajo: true,
        nombre: true,
        apellido: true,
        id_facultad: true,
        authUser: {
          select: { email: true }
        }
      }
    });

    return profile
      ? {
          authId: profile.auth_id,
          email: profile.authUser.email?.trim().toLowerCase() ?? null,
          legajo: profile.legajo,
          nombre: profile.nombre,
          apellido: profile.apellido,
          id_facultad: Number(profile.id_facultad)
        }
      : null;
  }

  async findProfile(authId: string) {
    const profile = await prisma.usuario.findUnique({
      where: { auth_id: authId },
      select: {
        legajo: true,
        nombre: true,
        apellido: true,
        id_facultad: true
      }
    });

    return profile
      ? {
          legajo: profile.legajo,
          nombre: profile.nombre,
          apellido: profile.apellido,
          id_facultad: Number(profile.id_facultad)
        }
      : null;
  }

  async createProfile(authId: string, input: RegisterProfileInput): Promise<void> {
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

  async deleteProfile(authId: string): Promise<void> {
    try {
      await prisma.usuario.deleteMany({
        where: { auth_id: authId }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile deletion failed";
      throw new ProfileDeletionError(message);
    }
  }
}

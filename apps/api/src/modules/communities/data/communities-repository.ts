// communities-repository.ts — Capa de acceso a datos del módulo de comunidades
//
// Responsabilidad: ejecutar las consultas a la base de datos y devolver
// los datos en bruto (sin serializar). No sabe nada de HTTP ni de Express.
//
// Los tipos exportados (CommunityWithRelations) son el contrato entre
// este archivo y los serializadores. Si cambia la query, el tipo cambia
// y TypeScript obliga a actualizar el serializador también.

import { prisma } from "../../../core/database";

const ACCEPTED_COMMUNITY_STATUS = "Aceptado";

// Tipo principal que describe una comunidad con todas sus relaciones cargadas.
// user_comunidad se filtra por legajo para saber si el usuario está unido (0 ó 1 registros).
// _count.user_comunidad da el total de miembros (independiente del filtro anterior).
export type CommunityWithRelations = {
  id_comunidad: bigint;
  legajo: number;
  nombre: string;
  descripcion: string | null;
  estado: string;
  created_at: Date;
  comunidad_topico: Array<{
    topico: {
      id_topico: bigint;
      topico: string;
    };
  }>;
  user_comunidad: Array<{ legajo: number }>;
  _count: {
    user_comunidad: number;
  };
};

// Devuelve comunidades visibles para el usuario:
//   - Todas las comunidades en estado Aceptado (públicas)
//   - Las propias comunidades en estado Pendiente si el usuario está autenticado
//     (para que el creador pueda ver que su comunidad está esperando aprobación)
// Si no hay legajo (anónimo), solo devuelve las Aceptado.
export async function listCommunities(legajo?: number): Promise<CommunityWithRelations[]> {
  return prisma.comunidad.findMany({
    where: {
      OR: [
        { estado: ACCEPTED_COMMUNITY_STATUS },
        // Solo agrega esta condición si hay un usuario autenticado
        ...(legajo !== undefined ? [{ estado: "Pendiente" as const, legajo }] : [])
      ]
    },
    include: {
      comunidad_topico: {
        include: {
          topico: {
            select: {
              id_topico: true,
              topico: true
            }
          }
        }
      },
      user_comunidad: {
        where: { legajo: legajo ?? -1 },
        select: { legajo: true }
      },
      _count: {
        select: { user_comunidad: true }
      }
    },
    orderBy: {
      nombre: "asc"
    }
  });
}

// Crea una nueva comunidad y la vincula con sus tópicos.
// El creador queda automáticamente como miembro (user_comunidad) usando nested write.
// La comunidad se crea con estado "Pendiente" por defecto (requiere aprobación de admin).
// Devuelve la comunidad con todas las relaciones cargadas para poder serializarla
// directamente sin una segunda query.
export async function createCommunity(
  legajo: number,
  input: { nombre: string; descripcion?: string; topicos?: number[] }
): Promise<CommunityWithRelations> {
  return prisma.comunidad.create({
    data: {
      legajo,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      // Vincula los tópicos seleccionados en comunidad_topico
      comunidad_topico:
        input.topicos && input.topicos.length > 0
          ? {
              createMany: {
                data: input.topicos.map((id_topico) => ({ id_topico: BigInt(id_topico) })),
                skipDuplicates: true
              }
            }
          : undefined,
      // El creador queda como miembro inmediatamente
      user_comunidad: {
        create: { legajo }
      }
    },
    include: {
      comunidad_topico: {
        include: {
          topico: {
            select: {
              id_topico: true,
              topico: true
            }
          }
        }
      },
      // Filtramos por el legajo del creador para que "joined" sea true en la respuesta
      user_comunidad: {
        where: { legajo },
        select: { legajo: true }
      },
      _count: {
        select: { user_comunidad: true }
      }
    }
  });
}

// Devuelve TODAS las comunidades sin filtrar por estado, ordenadas primero por estado
// (Pendiente primero) y luego por nombre. Solo para uso administrativo.
export async function listAllCommunities(): Promise<CommunityWithRelations[]> {
  return prisma.comunidad.findMany({
    include: {
      comunidad_topico: {
        include: {
          topico: {
            select: {
              id_topico: true,
              topico: true
            }
          }
        }
      },
      // Sentinel -1: joined siempre false en vista admin (no es relevante)
      user_comunidad: {
        where: { legajo: -1 },
        select: { legajo: true }
      },
      _count: {
        select: { user_comunidad: true }
      }
    },
    orderBy: [{ estado: "asc" }, { nombre: "asc" }]
  });
}

// Cambia el estado de una comunidad. Devuelve null si no existe.
// Los valores válidos son los del enum publication_status: Pendiente, Aceptado, Rechazado.
export async function updateCommunityStatus(
  id_comunidad: bigint,
  estado: "Pendiente" | "Aceptado" | "Rechazado"
): Promise<CommunityWithRelations | null> {
  try {
    return await prisma.comunidad.update({
      where: { id_comunidad },
      data: { estado },
      include: {
        comunidad_topico: {
          include: {
            topico: {
              select: {
                id_topico: true,
                topico: true
              }
            }
          }
        },
        user_comunidad: {
          where: { legajo: -1 },
          select: { legajo: true }
        },
        _count: {
          select: { user_comunidad: true }
        }
      }
    });
  } catch (error) {
    // Prisma lanza P2025 cuando el registro a actualizar no existe
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return null;
    }
    throw error;
  }
}

// Obtiene el legajo y el rol a partir del auth_id extraído del JWT.
// Se usa en las rutas autenticadas para resolver quién es el usuario y qué permisos tiene.
export async function findUserByAuthId(
  auth_id: string
): Promise<{ legajo: number; rol: string } | null> {
  return prisma.usuario.findUnique({
    where: { auth_id },
    select: { legajo: true, rol: true }
  });
}

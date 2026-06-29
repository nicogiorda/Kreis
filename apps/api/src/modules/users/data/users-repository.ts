// users-repository.ts — Capa de acceso a datos del modulo de usuarios
//
// Responsabilidad: ejecutar las consultas a la base de datos relacionadas
// con el perfil de un usuario y devolver los datos en bruto (sin serializar).
//
// Este archivo NO sabe nada de HTTP ni de Express. Solo habla con Prisma.
// Esa separacion permite testear la logica de consulta de forma aislada.
//
// Que datos trae una consulta de perfil?
//   - Datos basicos del usuario: legajo, nombre, apellido, rol, facultad
//   - Eventos que el usuario creo (solo Aceptados)
//   - Eventos a los que el usuario se anoto (tabla intermedia user_evento)
//   - Comunidades que el usuario creo (solo Aceptadas)
//   - Comunidades donde el usuario es miembro (tabla intermedia user_comunidad)
//   - Topicos del usuario (tabla intermedia usuario_topico)
//
// El tipo exportado UserProfileWithRelations es el contrato entre este archivo
// y el serializer (serialize-user-profile.ts). Si cambia la consulta, el tipo
// cambia, y TypeScript fuerza a actualizar el serializer tambien.

// Usamos el cliente Prisma centralizado de core/database.ts en lugar de
// instanciar uno propio. Asi todos los modulos comparten la misma conexion.
import { prisma } from "../../../core/database";

// Define que relaciones y campos traer junto al usuario en la consulta.
// Prisma usa este objeto como argumento de include / select.
const userProfileInclude = {
  // Facultad a la que pertenece el usuario
  facultad: {
    select: {
      id_facultad: true,
      nombre: true
    }
  },

  // Eventos que el usuario creo (solo los que estan en estado Aceptado)
  evento: {
    where: { estado: "Aceptado" as const },
    select: {
      id_evento: true,
      nombre: true,
      ubicacion: true,
      fecha_inicio: true,
      descripcion: true,
      imagen_url: true,
      estado: true,
      created_at: true,
      // Topicos asociados al evento (tabla intermedia evento_topico -> topico)
      evento_topico: {
        include: {
          topico: { select: { id_topico: true, topico: true } }
        }
      }
    }
  },

  // Eventos a los que el usuario se anoto (tabla intermedia user_evento)
  user_evento: {
    include: {
      evento: {
        select: {
          id_evento: true,
          nombre: true,
          ubicacion: true,
          fecha_inicio: true,
          descripcion: true,
          imagen_url: true,
          estado: true,
          created_at: true,
          evento_topico: {
            include: {
              topico: { select: { id_topico: true, topico: true } }
            }
          }
        }
      }
    }
  },

  // Comunidades que el usuario creo (solo las Aceptadas)
  comunidad: {
    where: { estado: "Aceptado" as const },
    select: {
      id_comunidad: true,
      nombre: true,
      descripcion: true,
      estado: true,
      created_at: true,
      // Topicos asociados a la comunidad (tabla intermedia comunidad_topico -> topico)
      comunidad_topico: {
        include: {
          topico: { select: { id_topico: true, topico: true } }
        }
      }
    }
  },

  // Comunidades a las que el usuario pertenece como miembro (tabla intermedia user_comunidad)
  user_comunidad: {
    include: {
      comunidad: {
        select: {
          id_comunidad: true,
          nombre: true,
          descripcion: true,
          estado: true,
          created_at: true,
          comunidad_topico: {
            include: {
              topico: { select: { id_topico: true, topico: true } }
            }
          }
        }
      }
    }
  },

  // Topicos del usuario (tabla intermedia usuario_topico -> topico)
  usuario_topico: {
    include: {
      topico: {
        select: {
          id_topico: true,
          topico: true
        }
      }
    }
  }
} as const;

// Tipos auxiliares que describen la forma de un evento y sus tags tal como
// los devuelve Prisma con el select de arriba
type EventTopico = { topico: { id_topico: bigint; topico: string } };

type EventSummary = {
  id_evento: bigint;
  nombre: string;
  ubicacion: string | null;
  fecha_inicio: Date;
  descripcion: string | null;
  imagen_url: string | null;
  estado: string;
  created_at: Date;
  evento_topico: EventTopico[];
};

// Tipos auxiliares para comunidad y sus topicos
type ComunidadTopico = { topico: { id_topico: bigint; topico: string } };

type ComunidadSummary = {
  id_comunidad: bigint;
  nombre: string;
  descripcion: string | null;
  estado: string;
  created_at: Date;
  comunidad_topico: ComunidadTopico[];
};

// Tipo principal que representa al usuario con todas sus relaciones cargadas.
// Lo exportamos para que el serializer pueda tiparlo correctamente.
export type UserProfileWithRelations = {
  legajo: number;
  nombre: string;
  apellido: string;
  id_facultad: bigint;
  rol: string;
  verificado: boolean;
  created_at: Date;
  avatar_url: string | null;
  facultad: { id_facultad: bigint; nombre: string };
  evento: EventSummary[];                                       // eventos creados por el usuario
  user_evento: Array<{ evento: EventSummary }>;                // eventos en que se anoto
  comunidad: ComunidadSummary[];                               // comunidades que creo
  user_comunidad: Array<{ comunidad: ComunidadSummary }>;      // comunidades donde es miembro
  usuario_topico: Array<{ topico: { id_topico: bigint; topico: string } }>;
};

// Busca el perfil completo de un usuario por su auth_id (UUID de Supabase).
// Se usa auth_id en lugar del legajo para que el endpoint sea seguro:
// el auth_id se extrae del JWT verificado por Supabase, no lo puede
// fabricar el cliente para acceder al perfil de otro usuario.
export async function findUserAuthIdByLegajo(legajo: number): Promise<{ legajo: number; auth_id: string } | null> {
  return prisma.usuario.findUnique({
    where: { legajo },
    select: { legajo: true, auth_id: true }
  });
}
export async function findUserProfileByAuthId(authId: string): Promise<UserProfileWithRelations | null> {
  return prisma.usuario.findUnique({
    where: { auth_id: authId },
    include: userProfileInclude
  });
}
export type TopicoCatalogItem = {
  id_topico: bigint;
  topico: string;
};

export type FacultadCatalogItem = {
  id_facultad: bigint;
  nombre: string;
};

export type AdminUserListItem = {
  legajo: number;
  nombre: string;
  apellido: string;
  rol: string;
  verificado: boolean;
  avatar_url: string | null;
  created_at: Date;
  authUser: {
    email: string | null;
  };
};

export async function listTopicos(): Promise<TopicoCatalogItem[]> {
  return prisma.topico.findMany({
    select: {
      id_topico: true,
      topico: true
    },
    orderBy: {
      topico: "asc"
    }
  });
}

export async function listUsersForAdministration(): Promise<AdminUserListItem[]> {
  return prisma.usuario.findMany({
    select: {
      legajo: true,
      nombre: true,
      apellido: true,
      rol: true,
      verificado: true,
      avatar_url: true,
      created_at: true,
      authUser: {
        select: {
          email: true
        }
      }
    },
    orderBy: [
      { nombre: "asc" },
      { apellido: "asc" }
    ]
  });
}

// Actualiza el rol de un usuario por legajo.
// Solo se usa desde la ruta de dev — no exponer en producción.
export async function updateUserRol(
  legajo: number,
  rol: "Estudiante" | "Moderador" | "Administrador"
): Promise<{ legajo: number; rol: string } | null> {
  try {
    return await prisma.usuario.update({
      where: { legajo },
      data: { rol },
      select: { legajo: true, rol: true }
    });
  } catch (error) {
    // P2025: registro no encontrado
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

export async function listFacultades(): Promise<FacultadCatalogItem[]> {
  return prisma.facultad.findMany({
    select: {
      id_facultad: true,
      nombre: true
    },
    orderBy: {
      nombre: "asc"
    }
  });
}


export async function updateUserAvatarUrl(
  legajo: number,
  avatarUrl: string
): Promise<UserProfileWithRelations> {
  return prisma.usuario.update({
    where: { legajo },
    data: { avatar_url: avatarUrl },
    include: userProfileInclude
  });
}

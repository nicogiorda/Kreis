// events-repository.ts — Capa de acceso a datos del módulo de eventos
//
// Responsabilidad: ejecutar las consultas a la base de datos y devolver
// los datos en bruto (sin serializar). No sabe nada de HTTP ni de Express.
//
// Los tipos exportados (EventWithRelations, EventSummary) son el contrato
// entre este archivo y los serializadores. Si cambia la query, el tipo
// cambia y TypeScript obliga a actualizar el serializador también.

import { prisma } from "../../../core/database";

// Constantes para el campo estado — evita strings sueltos dispersos en las queries.
const ACCEPTED_EVENT_STATUS = "Aceptado";
const PENDING_EVENT_STATUS = "Pendiente";

// Campos de usuario que se traen en cada consulta de evento.
// Centralizado acá para no repetir el mismo select en listAcceptedEvents,
// findAcceptedEventById y createPendingEvent.
const userSelect = {
  legajo: true,
  nombre: true,
  apellido: true,
  id_facultad: true,
  rol: true,
  verificado: true,
  created_at: true,
  facultad: {
    select: {
      id_facultad: true,
      nombre: true
    }
  }
} as const;

// Relaciones que se incluyen cuando se consulta un evento completo:
// el creador, los tópicos y los usuarios que se anotaron.
const eventInclude = {
  usuario: {
    select: userSelect
  },
  evento_topico: {
    include: {
      topico: {
        select: {
          id_topico: true,
          topico: true
        }
      }
    }
  },
  user_evento: {
    include: {
      usuario: {
        select: userSelect
      }
    }
  }
} as const;

export type EventUser = {
  legajo: number;
  nombre: string;
  apellido: string;
  id_facultad: bigint;
  rol: string;
  verificado: boolean;
  created_at: Date;
  facultad: {
    id_facultad: bigint;
    nombre: string;
  };
};

export type EventWithRelations = {
  id_evento: bigint;
  legajo: number;
  nombre: string;
  ubicacion: string | null;
  fecha_inicio: Date;
  descripcion: string | null;
  estado: string;
  created_at: Date;
  usuario: EventUser;
  evento_topico: Array<{
    topico: {
      id_topico: bigint;
      topico: string;
    };
  }>;
  user_evento: Array<{
    usuario: EventUser;
  }>;
};


// Versión reducida del evento para listar en el home.
// No incluye relaciones para mantener la respuesta liviana.
export type EventSummary = {
  id_evento: bigint;
  nombre: string;
  ubicacion: string | null;
  fecha_inicio: Date;
};

// Devuelve los 6 próximos eventos aceptados. El límite de 6 es para el rail
// del home — no tiene sentido cargar más hasta que el usuario abra la pantalla completa.
export async function listAcceptedEventsLimit(): Promise<EventSummary[]> {
  return prisma.evento.findMany({
    where: {
      estado: ACCEPTED_EVENT_STATUS
    },
    select: {
      id_evento: true,
      nombre: true,
      ubicacion: true,
      fecha_inicio: true
    },
    orderBy: {
      fecha_inicio: "asc"
    },
    take: 6
  });
}

// Devuelve todos los eventos aceptados para la pantalla de eventos completa.
export async function listAcceptedEvents(): Promise<EventSummary[]> {
  return prisma.evento.findMany({
    where: {
      estado: ACCEPTED_EVENT_STATUS
    },
    select: {
      id_evento: true,
      nombre: true,
      ubicacion: true,
      fecha_inicio: true
    },
    orderBy: {
      fecha_inicio: "asc"
    },
  });
}

// Solo devuelve el evento si está en estado Aceptado — así no exponemos
// eventos pendientes de moderación al usuario final.
export async function findAcceptedEventById(id_evento: bigint): Promise<EventWithRelations | null> {
  return prisma.evento.findFirst({
    where: {
      id_evento,
      estado: ACCEPTED_EVENT_STATUS
    },
    include: eventInclude 
  });
}
export type CreateEventInput = {
  legajo: number;
  nombre: string;
  ubicacion?: string;
  fecha_inicio: Date;
  descripcion?: string;
  topicos: number[];
};

// Crea el evento siempre en estado Pendiente — nunca Aceptado directamente.
// El flujo de moderación es: usuario crea → admin acepta o rechaza.
// Los tópicos se vinculan en la misma operación via evento_topico.
export async function createPendingEvent(input: CreateEventInput): Promise<EventWithRelations> {
  return prisma.evento.create({
    data: {
      legajo: input.legajo,
      nombre: input.nombre,
      ubicacion: input.ubicacion,
      fecha_inicio: input.fecha_inicio,
      descripcion: input.descripcion,
      estado: PENDING_EVENT_STATUS,
      evento_topico: {
        create: input.topicos.map((id_topico) => ({
          topico: {
            connect: {
              id_topico: BigInt(id_topico)
            }
          }
        }))
      }
    },
    include: eventInclude
  });
}

// Obtiene el legajo a partir del auth_id extraído del JWT.
// Se usa al crear un evento: el cliente manda el token, nosotros
// resolvemos quién es para registrarlo como creador.
export async function findUserByAuthId(auth_id: string): Promise<{ legajo: number } | null> {
  return prisma.usuario.findUnique({
    where: { auth_id },
    select: { legajo: true }
  });
}


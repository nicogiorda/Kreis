import { prisma } from "../../../core/database";

const ACCEPTED_EVENT_STATUS = "Aceptado";

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


export type EventSummary = {
  id_evento: bigint;
  nombre: string;
  ubicacion: string | null;
  fecha_inicio: Date;
};

// función para traer todos los eventos aceptados ordenados por fecha de inicio de forma ascendente, mostrando un detalle resumido de dichos eventos!!
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

// función para traer todos los eventos aceptados ordenados por fecha de inicio de forma ascendente, mostrando un detalle resumido de dichos eventos!
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

export async function findAcceptedEventById(id_evento: bigint): Promise<EventWithRelations | null> {
  return prisma.evento.findFirst({
    where: {
      id_evento,
      estado: ACCEPTED_EVENT_STATUS
    },
    include: eventInclude 
  });
}

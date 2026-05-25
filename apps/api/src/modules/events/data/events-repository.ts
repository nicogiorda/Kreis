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
  evento_tag: {
    include: {
      tag: {
        select: {
          id_tag: true,
          tag: true
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
  evento_tag: Array<{
    tag: {
      id_tag: bigint;
      tag: string;
    };
  }>;
  user_evento: Array<{
    usuario: EventUser;
  }>;
};

export async function listAcceptedEvents(): Promise<EventWithRelations[]> {
  return prisma.evento.findMany({
    where: {
      estado: ACCEPTED_EVENT_STATUS
    },
    include: eventInclude,
    orderBy: {
      fecha_inicio: "asc"
    }
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

import { bearerTokenHeaders, requestJson } from "./client";

export type AdminPublicationStatus = "Pendiente" | "Aceptado" | "Rechazado";
export type AdminReportStatus = "Pendiente" | "Desestimado" | "Resuelto";

export type AdminPerson = {
  legajo: number;
  name: string;
  avatarUrl: string | null;
};

export type AdminCommunity = {
  id: string;
  name: string;
  description: string;
  status: AdminPublicationStatus;
  topics: string[];
  creator: AdminPerson | null;
  createdAt: string;
};

export type AdminEvent = {
  id: string;
  name: string;
  place: string;
  startsAt: string;
  description: string;
  imageUrl: string | null;
  status: AdminPublicationStatus;
  creator: AdminPerson;
  topics: string[];
  createdAt: string;
};

export type AdminReport = {
  id: string;
  targetType: "Post" | "Comentario";
  targetId: string | null;
  reason: string;
  status: AdminReportStatus;
  content: string;
  authorLegajo: number | null;
  communityId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: AdminPerson | null;
  moderator: AdminPerson | null;
  author: AdminPerson | null;
  community: {
    id: string;
    name: string;
  } | null;
};

export type AdminUser = {
  legajo: number;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  avatarUrl: string | null;
  createdAt: string;
};

type RawPerson = {
  legajo: number;
  nombre: string;
  apellido: string;
  avatar_url?: string | null;
};

type RawCommunity = {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: AdminPublicationStatus;
  topicos: Array<{ id_topico: string; topico: string }>;
  creador: RawPerson | null;
  created_at: string;
};

type RawEvent = {
  id_evento: string;
  nombre: string;
  ubicacion: string | null;
  fecha_inicio: string;
  descripcion: string | null;
  imagen_url: string | null;
  estado: AdminPublicationStatus;
  created_at: string;
  creador: RawPerson;
  topicos: Array<{ id_topico: string; topico: string }>;
};

type RawReport = {
  id_reporte: string;
  tipo_reporte: "Post" | "Comentario";
  id_objetivo: string | null;
  motivo: string;
  estado: AdminReportStatus;
  contenido_reportado: string | null;
  autor_legajo: number | null;
  id_comunidad: string | null;
  created_at: string;
  resuelto_at: string | null;
  reportante: RawPerson | null;
  moderador: RawPerson | null;
  objetivo:
    | {
        tipo: "Post";
        post: {
          autor: RawPerson | null;
          comunidad: { id_comunidad: string; nombre: string };
        };
      }
    | {
        tipo: "Comentario";
        comentario: {
          autor: RawPerson | null;
          post: {
            comunidad: { id_comunidad: string; nombre: string };
          };
        };
      }
    | null;
};

type RawUser = {
  legajo: number;
  nombre: string;
  apellido: string;
  email: string | null;
  rol: string;
  verificado: boolean;
  avatar_url: string | null;
  created_at: string;
};

function mapPerson(person: RawPerson | null): AdminPerson | null {
  if (!person) return null;

  return {
    legajo: person.legajo,
    name: `${person.nombre} ${person.apellido}`.trim(),
    avatarUrl: person.avatar_url ?? null
  };
}

function mapCommunity(community: RawCommunity): AdminCommunity {
  return {
    id: community.id,
    name: community.nombre,
    description: community.descripcion ?? "Sin descripción.",
    status: community.estado,
    topics: community.topicos.map((topic) => topic.topico),
    creator: mapPerson(community.creador),
    createdAt: community.created_at
  };
}

function mapEvent(event: RawEvent): AdminEvent {
  return {
    id: event.id_evento,
    name: event.nombre,
    place: event.ubicacion ?? "Ubicación a confirmar",
    startsAt: event.fecha_inicio,
    description: event.descripcion ?? "Sin descripción.",
    imageUrl: event.imagen_url,
    status: event.estado,
    creator: mapPerson(event.creador) ?? {
      legajo: event.creador.legajo,
      name: "Usuario Kreis",
      avatarUrl: null
    },
    topics: event.topicos.map((topic) => topic.topico),
    createdAt: event.created_at
  };
}

function mapReport(report: RawReport): AdminReport {
  const target = report.objetivo;
  const author =
    target?.tipo === "Post"
      ? mapPerson(target.post.autor)
      : target?.tipo === "Comentario"
        ? mapPerson(target.comentario.autor)
        : null;
  const community =
    target?.tipo === "Post"
      ? target.post.comunidad
      : target?.tipo === "Comentario"
        ? target.comentario.post.comunidad
        : null;

  return {
    id: report.id_reporte,
    targetType: report.tipo_reporte,
    targetId: report.id_objetivo,
    reason: report.motivo,
    status: report.estado,
    content: report.contenido_reportado ?? "El contenido original ya no está disponible.",
    authorLegajo: report.autor_legajo,
    communityId: report.id_comunidad,
    createdAt: report.created_at,
    resolvedAt: report.resuelto_at,
    reporter: mapPerson(report.reportante),
    moderator: mapPerson(report.moderador),
    author,
    community: community
      ? {
          id: community.id_comunidad,
          name: community.nombre
        }
      : null
  };
}

export async function listAdminCommunities(accessToken: string, signal?: AbortSignal): Promise<AdminCommunity[]> {
  const response = await requestJson<{ comunidades: RawCommunity[] }>("/api/v1/communities/admin", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return response.comunidades.map(mapCommunity);
}

export async function updateAdminCommunityStatus(
  communityId: string,
  status: AdminPublicationStatus,
  accessToken: string
): Promise<void> {
  await requestJson(`/api/v1/communities/admin/${encodeURIComponent(communityId)}/status`, {
    method: "PATCH",
    headers: bearerTokenHeaders(accessToken),
    body: JSON.stringify({ estado: status })
  });
}

export async function listAdminEvents(accessToken: string, signal?: AbortSignal): Promise<AdminEvent[]> {
  const response = await requestJson<{ events: RawEvent[] }>("/api/v1/events/admin", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return response.events.map(mapEvent);
}

export async function updateAdminEventStatus(
  eventId: string,
  status: AdminPublicationStatus,
  accessToken: string
): Promise<void> {
  await requestJson(`/api/v1/events/admin/${encodeURIComponent(eventId)}/status`, {
    method: "PATCH",
    headers: bearerTokenHeaders(accessToken),
    body: JSON.stringify({ estado: status })
  });
}

export async function listAdminReports(accessToken: string, signal?: AbortSignal): Promise<AdminReport[]> {
  const response = await requestJson<{ reportes: RawReport[] }>("/api/v1/reports/admin", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return response.reportes.map(mapReport);
}

export async function updateAdminReportStatus(
  reportId: string,
  status: AdminReportStatus,
  accessToken: string
): Promise<AdminReport[]> {
  const response = await requestJson<{ reporte: RawReport; reportes?: RawReport[] }>(
    `/api/v1/reports/admin/${encodeURIComponent(reportId)}/status`,
    {
      method: "PATCH",
      headers: bearerTokenHeaders(accessToken),
      body: JSON.stringify({ estado: status })
    }
  );

  return (response.reportes ?? [response.reporte]).map(mapReport);
}

export async function listAdminUsers(accessToken: string, signal?: AbortSignal): Promise<AdminUser[]> {
  const response = await requestJson<{ users: RawUser[] }>("/api/v1/users/admin", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return response.users.map((user) => ({
    legajo: user.legajo,
    name: `${user.nombre} ${user.apellido}`.trim(),
    email: user.email ?? "Sin email",
    role: user.rol,
    verified: user.verificado,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at
  }));
}

export async function deleteAdminUser(legajo: number, accessToken: string): Promise<void> {
  await requestJson(`/api/v1/users/admin/${legajo}`, {
    method: "DELETE",
    headers: bearerTokenHeaders(accessToken)
  });
}

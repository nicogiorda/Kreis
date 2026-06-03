import { bearerTokenHeaders, requestJson } from "./client";

type UserProfileResponse = {
  legajo: number;
  nombre: string;
  apellido: string;
  rol?: string;
  verificado?: boolean;
  facultad: {
    nombre: string;
  };
  eventos_creados?: unknown[];
  eventos_anotado?: unknown[];
  comunidades_creadas?: unknown[];
  comunidades_miembro?: unknown[];
  topicos?: Array<{
    id_topico: string;
    topico: string;
  }>;
};

export type KreisUserProfile = {
  legajo: number;
  name: string;
  faculty: string;
  role?: string;
  verified?: boolean;
  topics: string[];
  stats: {
    createdEvents: number;
    enrolledEvents: number;
    createdCommunities: number;
    joinedCommunities: number;
  };
};

function countItems(items: unknown[] | undefined): number {
  return Array.isArray(items) ? items.length : 0;
}

export async function getMyProfile(accessToken: string, signal?: AbortSignal): Promise<KreisUserProfile> {
  const response = await requestJson<{ user: UserProfileResponse }>("/api/v1/users/me", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return {
    legajo: response.user.legajo,
    name: `${response.user.nombre} ${response.user.apellido}`.trim(),
    faculty: response.user.facultad.nombre,
    role: response.user.rol,
    verified: response.user.verificado,
    topics: response.user.topicos?.map((topic) => topic.topico).filter(Boolean) ?? [],
    stats: {
      createdEvents: countItems(response.user.eventos_creados),
      enrolledEvents: countItems(response.user.eventos_anotado),
      createdCommunities: countItems(response.user.comunidades_creadas),
      joinedCommunities: countItems(response.user.comunidades_miembro)
    }
  };
}
